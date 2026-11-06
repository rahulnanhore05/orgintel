package io.rahulnanhore.orgintel.ingestion.extractor;

import io.rahulnanhore.orgintel.common.exception.ApiException;
import io.rahulnanhore.orgintel.common.exception.ValidationException;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamReader;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Component
public class DocxTextExtractor implements TextExtractor {

    private static final String DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    @Override
    public boolean supports(String contentType, String fileName) {
        return (contentType != null && contentType.equalsIgnoreCase(DOCX_MIME))
                || (fileName != null && fileName.toLowerCase().endsWith(".docx"));
    }

    @Override
    public ExtractedDocument extract(InputStream inputStream) {
        try (ZipInputStream zipIn = new ZipInputStream(inputStream)) {
            ZipEntry entry;
            boolean foundDocumentXml = false;
            StringBuilder fullText = new StringBuilder();
            List<ExtractedSection> sections = new ArrayList<>();

            XMLInputFactory xmlInputFactory = XMLInputFactory.newInstance();
            // Secure XML parsing configurations
            xmlInputFactory.setProperty(XMLInputFactory.SUPPORT_DTD, false);
            xmlInputFactory.setProperty(XMLInputFactory.IS_SUPPORTING_EXTERNAL_ENTITIES, false);

            int paragraphCount = 0;
            StringBuilder currentParagraph = new StringBuilder();

            while ((entry = zipIn.getNextEntry()) != null) {
                if ("word/document.xml".equals(entry.getName())) {
                    foundDocumentXml = true;
                    XMLStreamReader reader = xmlInputFactory.createXMLStreamReader(zipIn);

                    boolean insideText = false;
                    while (reader.hasNext()) {
                        int event = reader.next();
                        switch (event) {
                            case XMLStreamConstants.START_ELEMENT:
                                String localName = reader.getLocalName();
                                if ("t".equals(localName)) {
                                    insideText = true;
                                }
                                break;
                            case XMLStreamConstants.CHARACTERS:
                                if (insideText) {
                                    currentParagraph.append(reader.getText());
                                }
                                break;
                            case XMLStreamConstants.END_ELEMENT:
                                String endName = reader.getLocalName();
                                if ("t".equals(endName)) {
                                    insideText = false;
                                } else if ("p".equals(endName)) {
                                    String text = currentParagraph.toString().trim();
                                    if (!text.isEmpty()) {
                                        paragraphCount++;
                                        fullText.append(text).append("\n\n");
                                        sections.add(new ExtractedSection(
                                                (paragraphCount / 5) + 1,
                                                "Paragraph " + paragraphCount,
                                                text
                                        ));
                                    }
                                    currentParagraph.setLength(0);
                                }
                                break;
                        }
                    }
                    break;
                }
            }

            if (!foundDocumentXml) {
                throw new ValidationException("Invalid DOCX file: word/document.xml entry not found.");
            }

            String text = fullText.toString().trim();
            if (text.isEmpty()) {
                throw new ValidationException("DOCX file contains no extractable text.");
            }

            return new ExtractedDocument(sections, text);

        } catch (Exception e) {
            if (e instanceof ApiException apiEx) {
                throw apiEx;
            }
            throw new ApiException("Failed to parse DOCX document: " + e.getMessage(),
                    HttpStatus.BAD_REQUEST, "DOCX_PARSING_ERROR", e);
        }
    }
}

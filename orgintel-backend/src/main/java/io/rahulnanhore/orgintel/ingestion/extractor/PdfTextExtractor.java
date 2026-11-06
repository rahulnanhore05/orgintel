package io.rahulnanhore.orgintel.ingestion.extractor;

import io.rahulnanhore.orgintel.common.exception.ApiException;
import io.rahulnanhore.orgintel.common.exception.ValidationException;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@Component
public class PdfTextExtractor implements TextExtractor {

    @Override
    public boolean supports(String contentType, String fileName) {
        return (contentType != null && contentType.equalsIgnoreCase("application/pdf"))
                || (fileName != null && fileName.toLowerCase().endsWith(".pdf"));
    }

    @Override
    public ExtractedDocument extract(InputStream inputStream) {
        try {
            byte[] bytes = inputStream.readAllBytes();
            try (PDDocument document = Loader.loadPDF(bytes)) {
                if (document.isEncrypted()) {
                    throw new ApiException("Encrypted PDF documents are not supported",
                            HttpStatus.UNPROCESSABLE_ENTITY, "ENCRYPTED_PDF");
                }

                int totalPages = document.getNumberOfPages();
                List<ExtractedSection> sections = new ArrayList<>();
                StringBuilder fullTextBuilder = new StringBuilder();

                PDFTextStripper stripper = new PDFTextStripper();
                stripper.setSortByPosition(true);

                for (int page = 1; page <= totalPages; page++) {
                    stripper.setStartPage(page);
                    stripper.setEndPage(page);
                    String pageText = stripper.getText(document).trim();

                    if (!pageText.isEmpty()) {
                        sections.add(new ExtractedSection(page, "Page " + page, pageText));
                        fullTextBuilder.append(pageText).append("\n\n");
                    }
                }

                String fullText = fullTextBuilder.toString().trim();
                if (fullText.isEmpty()) {
                    throw new ValidationException("Scanned PDF contains no extractable text. Scanned documents requiring OCR are not supported in this release.");
                }

                return new ExtractedDocument(sections, fullText);
            }
        } catch (IOException e) {
            throw new ApiException("Failed to parse PDF document: " + e.getMessage(),
                    HttpStatus.BAD_REQUEST, "PDF_PARSING_ERROR", e);
        }
    }
}

package io.rahulnanhore.orgintel.ingestion.extractor;

import io.rahulnanhore.orgintel.common.exception.ValidationException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.junit.jupiter.api.Assertions.*;

class TextExtractorTest {

    private final PdfTextExtractor pdfExtractor = new PdfTextExtractor();
    private final DocxTextExtractor docxExtractor = new DocxTextExtractor();
    private final PlainTextExtractor plainTextExtractor = new PlainTextExtractor();

    @Test
    void shouldExtractTextFromPdf() throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(new org.apache.pdfbox.pdmodel.font.PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                cs.newLineAtOffset(50, 700);
                cs.showText("OrgIntel Document Intelligence Test Content");
                cs.endText();
            }
            doc.save(out);
        }

        ExtractedDocument extracted = pdfExtractor.extract(new ByteArrayInputStream(out.toByteArray()));
        assertNotNull(extracted);
        assertTrue(extracted.fullText().contains("OrgIntel Document Intelligence Test Content"));
        assertEquals(1, extracted.sections().size());
    }

    @Test
    void shouldRejectScannedPdfWithNoText() throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (PDDocument doc = new PDDocument()) {
            doc.addPage(new PDPage()); // blank page
            doc.save(out);
        }

        assertThrows(ValidationException.class, () ->
                pdfExtractor.extract(new ByteArrayInputStream(out.toByteArray()))
        );
    }

    @Test
    void shouldExtractTextFromDocx() throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(out)) {
            zos.putNextEntry(new ZipEntry("word/document.xml"));
            String xml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
                    "<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\">" +
                    "<w:body><w:p><w:r><w:t>Hello enterprise DOCX document!</w:t></w:r></w:p></w:body>" +
                    "</w:document>";
            zos.write(xml.getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();
        }

        ExtractedDocument extracted = docxExtractor.extract(new ByteArrayInputStream(out.toByteArray()));
        assertNotNull(extracted);
        assertTrue(extracted.fullText().contains("Hello enterprise DOCX document!"));
    }

    @Test
    void shouldExtractTextFromMarkdown() {
        String md = """
            # Architecture Overview
            OrgIntel uses a modular monolith with hybrid search.
            
            ## Security
            Multi-tenancy is strictly enforced at every boundary.
        """;

        ExtractedDocument extracted = plainTextExtractor.extract(new ByteArrayInputStream(md.getBytes(StandardCharsets.UTF_8)));
        assertNotNull(extracted);
        assertTrue(extracted.fullText().contains("OrgIntel uses a modular monolith"));
        assertEquals(2, extracted.sections().size());
        assertEquals("Architecture Overview", extracted.sections().get(0).sectionTitle());
        assertEquals("Security", extracted.sections().get(1).sectionTitle());
    }
}

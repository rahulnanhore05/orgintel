package io.rahulnanhore.orgintel.ingestion.extractor;

public record ExtractedSection(
        Integer pageNumber,
        String sectionTitle,
        String text
) {
}

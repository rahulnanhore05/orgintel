package io.rahulnanhore.orgintel.ingestion.extractor;

import java.util.List;

public record ExtractedDocument(
        List<ExtractedSection> sections,
        String fullText
) {
}

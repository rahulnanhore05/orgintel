package io.rahulnanhore.orgintel.ai.citation;

import java.util.List;

public record CitationValidationResult(
        String cleanedText,
        List<Citation> citations
) {
}

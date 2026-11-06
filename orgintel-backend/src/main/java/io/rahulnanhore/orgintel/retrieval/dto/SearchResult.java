package io.rahulnanhore.orgintel.retrieval.dto;

import java.util.UUID;

public record SearchResult(
        UUID chunkId,
        UUID documentId,
        String documentTitle,
        int versionNumber,
        Integer pageNumber,
        String sectionTitle,
        String content,
        double score,
        String matchType
) {
}

package io.rahulnanhore.orgintel.ai.citation;

import java.util.UUID;

public record Citation(
        int citationOrder,
        UUID chunkId,
        UUID documentId,
        String documentTitle,
        int versionNumber,
        Integer pageNumber,
        String sectionTitle,
        String sourceLocation,
        String snippet
) {
}

package io.rahulnanhore.orgintel.conversation.dto;

import java.util.UUID;

public record CitationResponse(
        int citationOrder,
        UUID chunkId,
        UUID documentVersionId,
        String sourceLocation,
        String quotedText
) {}

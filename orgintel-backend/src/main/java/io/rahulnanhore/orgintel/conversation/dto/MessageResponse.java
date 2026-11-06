package io.rahulnanhore.orgintel.conversation.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import io.rahulnanhore.orgintel.conversation.domain.MessageRole;

public record MessageResponse(
        UUID id,
        MessageRole role,
        String content,
        int sequenceNumber,
        List<CitationResponse> citations,
        Instant createdAt,
        Integer feedbackRating
) {
    public MessageResponse(UUID id, MessageRole role, String content, int sequenceNumber, List<CitationResponse> citations, Instant createdAt) {
        this(id, role, content, sequenceNumber, citations, createdAt, null);
    }
}

package io.rahulnanhore.orgintel.ai.service;

import java.util.List;

import io.rahulnanhore.orgintel.ai.citation.Citation;

public record GroundedAnswer(
        String answerText,
        List<Citation> citations,
        boolean hasInsufficientEvidence,
        boolean hasConflictingEvidence,
        String modelName,
        int promptTokens,
        int completionTokens,
        long latencyMs
) {
}

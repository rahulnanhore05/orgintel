package io.rahulnanhore.orgintel.ai.service;

import reactor.core.publisher.Flux;

import java.util.List;
import java.util.UUID;

import io.rahulnanhore.orgintel.retrieval.dto.SearchResult;

public interface GroundedAnsweringService {
    GroundedAnswer generateGroundedAnswer(
            UUID organizationId,
            UUID userId,
            String question
    );

    GroundedStreamContext prepareGroundedStream(
            UUID organizationId,
            UUID userId,
            String question
    );

    GroundedAnswer finalizeStreamAnswer(
            String rawAnswer,
            List<SearchResult> passages,
            long startTime
    );

    record GroundedStreamContext(
            List<SearchResult> passages,
            Flux<String> stream,
            boolean isAbstaining,
            long startTime
    ) {}
}

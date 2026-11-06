package io.rahulnanhore.orgintel.retrieval.service;

import java.util.List;
import java.util.UUID;

import io.rahulnanhore.orgintel.retrieval.dto.SearchRequest;
import io.rahulnanhore.orgintel.retrieval.dto.SearchResponse;
import io.rahulnanhore.orgintel.retrieval.dto.SearchResult;

public interface RetrievalService {
    SearchResponse search(UUID organizationId, UUID userId, SearchRequest request);
    List<SearchResult> retrieveContext(UUID organizationId, UUID userId, String query, int limit);
}

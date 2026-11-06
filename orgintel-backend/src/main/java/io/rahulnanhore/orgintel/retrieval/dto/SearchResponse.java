package io.rahulnanhore.orgintel.retrieval.dto;

import java.util.List;

public record SearchResponse(
        String query,
        List<SearchResult> results,
        int totalFound
) {
}

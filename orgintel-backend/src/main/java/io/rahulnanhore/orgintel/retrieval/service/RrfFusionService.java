package io.rahulnanhore.orgintel.retrieval.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.rahulnanhore.orgintel.document.domain.DocumentChunk;
import io.rahulnanhore.orgintel.retrieval.dto.SearchResult;

import java.util.*;

@Service
public class RrfFusionService {

    private final int defaultK;

    public RrfFusionService(@Value("${orgintel.retrieval.rrf-k:60}") int defaultK) {
        this.defaultK = defaultK;
    }

    public List<SearchResult> fuse(
            List<DocumentChunk> keywordCandidates,
            List<DocumentChunk> vectorCandidates,
            int limit) {

        Map<UUID, ScoredChunk> scoredMap = new HashMap<>();

        // 1. Process keyword candidates
        for (int rank = 0; rank < keywordCandidates.size(); rank++) {
            DocumentChunk chunk = keywordCandidates.get(rank);
            double rrfScore = 1.0 / (defaultK + (rank + 1));

            scoredMap.compute(chunk.getId(), (id, existing) -> {
                if (existing == null) {
                    return new ScoredChunk(chunk, rrfScore, true, false);
                } else {
                    existing.score += rrfScore;
                    existing.inKeyword = true;
                    return existing;
                }
            });
        }

        // 2. Process vector candidates
        for (int rank = 0; rank < vectorCandidates.size(); rank++) {
            DocumentChunk chunk = vectorCandidates.get(rank);
            double rrfScore = 1.0 / (defaultK + (rank + 1));

            scoredMap.compute(chunk.getId(), (id, existing) -> {
                if (existing == null) {
                    return new ScoredChunk(chunk, rrfScore, false, true);
                } else {
                    existing.score += rrfScore;
                    existing.inVector = true;
                    return existing;
                }
            });
        }

        // 3. Sort by combined RRF score descending
        return scoredMap.values().stream()
                .sorted(Comparator.comparingDouble((ScoredChunk sc) -> sc.score).reversed())
                .limit(limit)
                .map(sc -> {
                    String matchType = sc.inKeyword && sc.inVector
                            ? "HYBRID"
                            : sc.inKeyword ? "KEYWORD" : "SEMANTIC";

                    return new SearchResult(
                            sc.chunk.getId(),
                            sc.chunk.getDocument().getId(),
                            sc.chunk.getDocument().getTitle(),
                            sc.chunk.getVersion().getVersionNumber(),
                            sc.chunk.getPageNumber(),
                            sc.chunk.getSectionTitle(),
                            sc.chunk.getContent(),
                            sc.score,
                            matchType
                    );
                })
                .toList();
    }

    private static class ScoredChunk {
        final DocumentChunk chunk;
        double score;
        boolean inKeyword;
        boolean inVector;

        ScoredChunk(DocumentChunk chunk, double score, boolean inKeyword, boolean inVector) {
            this.chunk = chunk;
            this.score = score;
            this.inKeyword = inKeyword;
            this.inVector = inVector;
        }
    }
}

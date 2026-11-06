package io.rahulnanhore.orgintel.retrieval.service;

import io.rahulnanhore.orgintel.document.domain.Document;
import io.rahulnanhore.orgintel.document.domain.DocumentChunk;
import io.rahulnanhore.orgintel.document.domain.DocumentVersion;
import io.rahulnanhore.orgintel.organization.domain.Organization;
import io.rahulnanhore.orgintel.retrieval.dto.SearchResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class RrfFusionServiceTest {

    private final RrfFusionService fusionService = new RrfFusionService(60);

    @Test
    void shouldFuseAndRankCandidatesUsingRrf() {
        Organization org = new Organization(UUID.randomUUID(), "Test", "test");
        Document doc = new Document(UUID.randomUUID(), org, null, "Doc 1", "Desc", null);
        DocumentVersion version = new DocumentVersion(UUID.randomUUID(), doc, 1, "test.txt", "text/plain", 100, "hash", "key");

        DocumentChunk chunkA = new DocumentChunk(UUID.randomUUID(), version, doc, org, 0, "Chunk A content", 10, 1, "Sec A");
        DocumentChunk chunkB = new DocumentChunk(UUID.randomUUID(), version, doc, org, 1, "Chunk B content", 10, 1, "Sec B");
        DocumentChunk chunkC = new DocumentChunk(UUID.randomUUID(), version, doc, org, 2, "Chunk C content", 10, 2, "Sec C");

        // Keyword ranks: [Chunk A (rank 1), Chunk B (rank 2)]
        List<DocumentChunk> keywordList = List.of(chunkA, chunkB);
        // Vector ranks: [Chunk B (rank 1), Chunk C (rank 2)]
        List<DocumentChunk> vectorList = List.of(chunkB, chunkC);

        List<SearchResult> fused = fusionService.fuse(keywordList, vectorList, 3);

        assertEquals(3, fused.size());

        // Chunk B appears in BOTH lists: rank 2 in keyword + rank 1 in vector
        // Score = 1/(60+2) + 1/(60+1) = 1/62 + 1/61 ~= 0.01613 + 0.01639 = 0.03252
        // Chunk A score = 1/(60+1) = 0.01639
        // Chunk C score = 1/(60+2) = 0.01613
        // Therefore, Chunk B must be rank 1 with matchType "HYBRID"!
        assertEquals(chunkB.getId(), fused.get(0).chunkId());
        assertEquals("HYBRID", fused.get(0).matchType());
        assertTrue(fused.get(0).score() > fused.get(1).score());

        assertEquals(chunkA.getId(), fused.get(1).chunkId());
        assertEquals("KEYWORD", fused.get(1).matchType());

        assertEquals(chunkC.getId(), fused.get(2).chunkId());
        assertEquals("SEMANTIC", fused.get(2).matchType());
    }
}

package io.rahulnanhore.orgintel.ai.citation;

import io.rahulnanhore.orgintel.retrieval.dto.SearchResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class CitationValidatorTest {

    private final CitationValidator validator = new CitationValidator();

    @Test
    void shouldValidateLegitimateCitationsAndReplaceWithFootnotes() {
        UUID chunk1 = UUID.randomUUID();
        UUID chunk2 = UUID.randomUUID();
        UUID docId = UUID.randomUUID();

        SearchResult passage1 = new SearchResult(
                chunk1, docId, "Security Policy", 1, 3, "Access Control", "MFA is required for all accounts.", 0.9, "HYBRID"
        );
        SearchResult passage2 = new SearchResult(
                chunk2, docId, "Security Policy", 1, 4, "Password Rules", "Passwords must be at least 14 characters.", 0.8, "HYBRID"
        );

        String rawText = "According to policy, MFA is mandatory [chunk:" + chunk1 + "]. Passwords must be 14 chars [chunk:" + chunk2 + "].";

        CitationValidationResult result = validator.validateAndClean(rawText, List.of(passage1, passage2));

        assertEquals("According to policy, MFA is mandatory [1]. Passwords must be 14 chars [2].", result.cleanedText());
        assertEquals(2, result.citations().size());
        assertEquals(chunk1, result.citations().get(0).chunkId());
        assertEquals(chunk2, result.citations().get(1).chunkId());
        assertEquals("Page 3, Access Control", result.citations().get(0).sourceLocation());
    }

    @Test
    void shouldStripHallucinatedChunkIds() {
        UUID validChunk = UUID.randomUUID();
        UUID fakeChunk = UUID.randomUUID();

        SearchResult passage = new SearchResult(
                validChunk, UUID.randomUUID(), "Employee Guide", 1, 1, "General", "Office hours are 9 to 5.", 0.9, "HYBRID"
        );

        String rawText = "Office hours are 9 to 5 [chunk:" + validChunk + "], and lunch is at noon [chunk:" + fakeChunk + "].";

        CitationValidationResult result = validator.validateAndClean(rawText, List.of(passage));

        // Valid citation preserved as [1], hallucinated citation stripped
        assertEquals("Office hours are 9 to 5 [1], and lunch is at noon .", result.cleanedText());
        assertEquals(1, result.citations().size());
        assertEquals(validChunk, result.citations().get(0).chunkId());
    }

    @Test
    void shouldMapNumberedChunkBracketsAndStripStrayChunkBrackets() {
        UUID chunk1 = UUID.randomUUID();
        UUID chunk2 = UUID.randomUUID();
        UUID docId = UUID.randomUUID();

        SearchResult passage1 = new SearchResult(
                chunk1, docId, "Financial Report", 1, 10, "Revenue", "2025 revenue hit $50M.", 0.95, "HYBRID"
        );
        SearchResult passage2 = new SearchResult(
                chunk2, docId, "Financial Report", 1, 12, "EBITDA", "EBITDA margin reached 24%.", 0.85, "HYBRID"
        );

        String rawText = "Revenue was $50M [chunk: 1]. EBITDA reached 24% [chunk: 2], with unsupported fact [chunk: 99].";

        CitationValidationResult result = validator.validateAndClean(rawText, List.of(passage1, passage2));

        assertEquals("Revenue was $50M [1]. EBITDA reached 24% [2], with unsupported fact .", result.cleanedText());
        assertEquals(2, result.citations().size());
        assertEquals(chunk1, result.citations().get(0).chunkId());
        assertEquals(chunk2, result.citations().get(1).chunkId());
    }
}

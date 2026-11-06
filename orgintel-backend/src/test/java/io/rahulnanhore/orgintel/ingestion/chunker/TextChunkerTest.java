package io.rahulnanhore.orgintel.ingestion.chunker;

import io.rahulnanhore.orgintel.ingestion.extractor.ExtractedDocument;
import io.rahulnanhore.orgintel.ingestion.extractor.ExtractedSection;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class TextChunkerTest {

    @Test
    void shouldChunkTextWithConfiguredSizeAndOverlap() {
        TextChunker chunker = new TextChunker(100, 20);

        String sectionContent = """
            First sentence describing document retrieval.
            Second sentence explaining vector search embeddings.
            Third sentence covering full-text keyword indexing and ranking.
            Fourth sentence discussing reciprocal rank fusion.
        """;

        ExtractedDocument doc = new ExtractedDocument(
                List.of(new ExtractedSection(1, "Section 1", sectionContent)),
                sectionContent
        );

        List<ChunkData> chunks = chunker.chunk(doc);
        assertFalse(chunks.isEmpty());
        for (ChunkData c : chunks) {
            assertTrue(c.content().length() <= 120); // within bounded limit
            assertEquals(1, c.pageNumber());
            assertEquals("Section 1", c.sectionTitle());
        }
    }
}

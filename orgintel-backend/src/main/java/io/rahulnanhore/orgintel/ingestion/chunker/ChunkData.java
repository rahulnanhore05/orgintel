package io.rahulnanhore.orgintel.ingestion.chunker;

public record ChunkData(
        int index,
        String content,
        int tokenCount,
        Integer pageNumber,
        String sectionTitle
) {
}

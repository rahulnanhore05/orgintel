package io.rahulnanhore.orgintel.ingestion.chunker;

import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.rahulnanhore.orgintel.ingestion.extractor.ExtractedDocument;
import io.rahulnanhore.orgintel.ingestion.extractor.ExtractedSection;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class TextChunker {

    private final TokenTextSplitter splitter;

    public TextChunker(
            @Value("${orgintel.ingestion.chunk-size:1500}") int chunkSize,
            @Value("${orgintel.ingestion.chunk-overlap:200}") int chunkOverlap) {
        int tokenChunkSize = Math.max(15, chunkSize / 6);
        int minChars = Math.max(10, chunkOverlap / 4);
        this.splitter = TokenTextSplitter.builder()
                .withChunkSize(tokenChunkSize)
                .withMinChunkSizeChars(minChars)
                .build();
    }

    public List<ChunkData> chunk(ExtractedDocument document) {
        List<ChunkData> chunks = new ArrayList<>();
        int chunkIndex = 0;

        for (ExtractedSection section : document.sections()) {
            String text = section.text() != null ? section.text().trim() : "";
            if (text.isEmpty()) {
                continue;
            }

            Map<String, Object> metadata = new HashMap<>();
            if (section.pageNumber() != null) {
                metadata.put("pageNumber", section.pageNumber());
            }
            if (section.sectionTitle() != null) {
                metadata.put("sectionTitle", section.sectionTitle());
            }

            Document aiDoc = new Document(text, metadata);
            List<Document> splitDocs = splitter.split(List.of(aiDoc));

            for (Document d : splitDocs) {
                String content = d.getText() != null ? d.getText().trim() : "";
                if (!content.isEmpty()) {
                    int estimatedTokens = Math.max(1, content.length() / 4);
                    chunks.add(new ChunkData(
                            chunkIndex++,
                            content,
                            estimatedTokens,
                            section.pageNumber(),
                            section.sectionTitle()
                    ));
                }
            }
        }

        return chunks;
    }
}

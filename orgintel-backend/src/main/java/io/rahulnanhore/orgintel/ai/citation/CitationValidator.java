package io.rahulnanhore.orgintel.ai.citation;

import io.rahulnanhore.orgintel.retrieval.dto.SearchResult;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class CitationValidator {

    private static final Pattern CHUNK_PATTERN = Pattern.compile("\\[chunk\\s*[:\\s]\\s*([a-f0-9\\-]+)\\]", Pattern.CASE_INSENSITIVE);

    public CitationValidationResult validateAndClean(String rawText, List<SearchResult> contextPassages) {
        if (rawText == null || rawText.isBlank()) {
            return new CitationValidationResult("", List.of());
        }

        // Map retrieved chunks by ID for instant O(1) lookup
        Map<UUID, SearchResult> contextMap = new HashMap<>();
        for (SearchResult passage : contextPassages) {
            contextMap.put(passage.chunkId(), passage);
        }

        Matcher matcher = CHUNK_PATTERN.matcher(rawText);
        StringBuffer cleanBuffer = new StringBuffer();
        List<Citation> citations = new ArrayList<>();
        Map<UUID, Integer> citedChunkToOrderMap = new LinkedHashMap<>();

        while (matcher.find()) {
            String citedIdStr = matcher.group(1).trim();
            SearchResult matchedPassage = null;

            try {
                UUID citedId = UUID.fromString(citedIdStr);
                matchedPassage = contextMap.get(citedId);
            } catch (IllegalArgumentException e) {
                // If not a UUID, check if it is a 1-based index (e.g. [chunk: 1] or [chunk 1])
                try {
                    int index = Integer.parseInt(citedIdStr);
                    if (index >= 1 && index <= contextPassages.size()) {
                        matchedPassage = contextPassages.get(index - 1);
                    }
                } catch (NumberFormatException ignored) {
                    // Not an index
                }
            }

            if (matchedPassage != null) {
                UUID chunkId = matchedPassage.chunkId();
                int order = citedChunkToOrderMap.computeIfAbsent(chunkId, k -> citedChunkToOrderMap.size() + 1);

                // Add citation if first time seen
                if (citations.stream().noneMatch(c -> c.chunkId().equals(chunkId))) {
                    String sourceLocation = buildSourceLocation(matchedPassage);
//                    String snippet = extractSnippet(matchedPassage.content());
                    String snippet = matchedPassage.content();

                    citations.add(new Citation(
                            order,
                            matchedPassage.chunkId(),
                            matchedPassage.documentId(),
                            matchedPassage.documentTitle(),
                            matchedPassage.versionNumber(),
                            matchedPassage.pageNumber(),
                            matchedPassage.sectionTitle(),
                            sourceLocation,
                            snippet
                    ));
                }

                matcher.appendReplacement(cleanBuffer, "[" + order + "]");
            } else {
                // Hallucinated or unrecognized chunk ID: strip it
                matcher.appendReplacement(cleanBuffer, "");
            }
        }
        matcher.appendTail(cleanBuffer);

        // Strip any remaining unparsed chunk references in square brackets (e.g., [chunk: ...], [Chunk ...])
        String cleanedText = cleanBuffer.toString()
                .replaceAll("(?i)\\[\\s*chunk\\s*[:\\s-]?[^\\]]*\\]", "")
                .replaceAll("(?i)\\((?:[^)]*,\\s*)?chunk(?:id)?\\s*:[^)]+\\)", "")
                .trim();

        return new CitationValidationResult(cleanedText, citations);
    }

    private String buildSourceLocation(SearchResult passage) {
        StringBuilder sb = new StringBuilder();
        if (passage.pageNumber() != null) {
            sb.append("Page ").append(passage.pageNumber());
        }
        if (passage.sectionTitle() != null && !passage.sectionTitle().isBlank()) {
            if (!sb.isEmpty()) sb.append(", ");
            sb.append(passage.sectionTitle());
        }
        return sb.isEmpty() ? "General" : sb.toString();
    }

    private String extractSnippet(String content) {
        if (content == null) return "";
        String trimmed = content.trim();
        return trimmed.length() > 400 ? trimmed.substring(0, 400) + "..." : trimmed;
    }
}

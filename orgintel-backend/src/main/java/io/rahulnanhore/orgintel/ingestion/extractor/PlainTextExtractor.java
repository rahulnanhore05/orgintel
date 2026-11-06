package io.rahulnanhore.orgintel.ingestion.extractor;

import io.rahulnanhore.orgintel.common.exception.ApiException;
import io.rahulnanhore.orgintel.common.exception.ValidationException;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Component
public class PlainTextExtractor implements TextExtractor {

    @Override
    public boolean supports(String contentType, String fileName) {
        if (fileName != null) {
            String lower = fileName.toLowerCase();
            if (lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".markdown")) {
                return true;
            }
        }
        if (contentType != null) {
            String lower = contentType.toLowerCase();
            return lower.contains("text/plain") || lower.contains("text/markdown") || lower.contains("text/x-markdown");
        }
        return false;
    }

    @Override
    public ExtractedDocument extract(InputStream inputStream) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            List<ExtractedSection> sections = new ArrayList<>();
            StringBuilder fullText = new StringBuilder();
            StringBuilder currentSectionText = new StringBuilder();

            String currentTitle = "General Content";
            int sectionIndex = 1;
            String line;

            while ((line = reader.readLine()) != null) {
                String trimmed = line.trim();
                fullText.append(line).append("\n");

                // Check for Markdown heading (# Heading)
                if (trimmed.startsWith("#")) {
                    if (!currentSectionText.isEmpty()) {
                        sections.add(new ExtractedSection(sectionIndex++, currentTitle, currentSectionText.toString().trim()));
                        currentSectionText.setLength(0);
                    }
                    currentTitle = trimmed.replaceFirst("^#+\\s*", "");
                } else if (!trimmed.isEmpty()) {
                    currentSectionText.append(line).append("\n");
                }
            }

            if (!currentSectionText.isEmpty()) {
                sections.add(new ExtractedSection(sectionIndex, currentTitle, currentSectionText.toString().trim()));
            }

            String text = fullText.toString().trim();
            if (text.isEmpty()) {
                throw new ValidationException("Document contains no extractable text.");
            }

            // If no headings found, wrap the whole text as single section
            if (sections.isEmpty()) {
                sections.add(new ExtractedSection(1, "General Content", text));
            }

            return new ExtractedDocument(sections, text);

        } catch (Exception e) {
            if (e instanceof ApiException apiEx) {
                throw apiEx;
            }
            throw new ApiException("Failed to parse text document: " + e.getMessage(),
                    HttpStatus.BAD_REQUEST, "TEXT_PARSING_ERROR", e);
        }
    }
}

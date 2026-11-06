package io.rahulnanhore.orgintel.ingestion.extractor;

import java.io.InputStream;

public interface TextExtractor {
    boolean supports(String contentType, String fileName);
    ExtractedDocument extract(InputStream inputStream);
}

package io.rahulnanhore.orgintel.document.dto;

import io.rahulnanhore.orgintel.document.domain.Document;
import io.rahulnanhore.orgintel.document.domain.DocumentVersion;
import io.rahulnanhore.orgintel.document.domain.ProcessingState;

import java.util.UUID;

public record DocumentUploadResponse(
        UUID documentId,
        UUID versionId,
        int versionNumber,
        String title,
        String fileName,
        long fileSize,
        String contentType,
        ProcessingState processingState,
        String message
) {
    public static DocumentUploadResponse of(Document doc, DocumentVersion version, String message) {
        return new DocumentUploadResponse(
                doc.getId(),
                version.getId(),
                version.getVersionNumber(),
                doc.getTitle(),
                version.getFileName(),
                version.getFileSize(),
                version.getContentType(),
                version.getProcessingState(),
                message
        );
    }
}

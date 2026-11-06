package io.rahulnanhore.orgintel.document.service;

import io.rahulnanhore.orgintel.document.domain.Document;
import io.rahulnanhore.orgintel.document.domain.DocumentVersion;
import io.rahulnanhore.orgintel.document.domain.DocumentVisibility;
import io.rahulnanhore.orgintel.document.domain.PermissionLevel;
import io.rahulnanhore.orgintel.document.dto.*;

import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.List;
import java.util.UUID;

public interface DocumentService {
    DocumentUploadResponse uploadDocument(
            UUID organizationId,
            UUID userId,
            MultipartFile file,
            String title,
            String description,
            DocumentVisibility visibility
    );

    DocumentUploadResponse uploadReplacement(
            UUID organizationId,
            UUID documentId,
            UUID userId,
            MultipartFile file
    );

    DocumentDetailResponse getDocument(UUID organizationId, UUID documentId, UUID userId);

    Page<DocumentSummaryResponse> listDocuments(UUID organizationId, UUID userId, Pageable pageable);

    DownloadResult downloadDocument(UUID organizationId, UUID documentId, UUID userId, Integer versionNumber);

    void deleteDocument(UUID organizationId, UUID documentId, UUID userId);

    void grantPermission(UUID organizationId, UUID documentId, UUID userId, UUID targetUserId, PermissionLevel permissionLevel);

    void revokePermission(UUID organizationId, UUID documentId, UUID userId, UUID targetUserId);

    List<DocumentPermissionResponse> listPermissions(UUID organizationId, UUID documentId, UUID userId);

    record DownloadResult(
            InputStream inputStream,
            String fileName,
            String contentType,
            long fileSize
    ) {}
}

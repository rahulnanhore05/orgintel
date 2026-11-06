package io.rahulnanhore.orgintel.document.controller;

import io.rahulnanhore.orgintel.common.dto.PageResponse;
import io.rahulnanhore.orgintel.document.domain.DocumentVisibility;
import io.rahulnanhore.orgintel.document.dto.*;
import io.rahulnanhore.orgintel.document.service.DocumentService;
import io.rahulnanhore.orgintel.identity.config.AuthenticatedUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.core.io.InputStreamResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/organizations/{organizationId}/documents")
@Tag(name = "Documents", description = "Endpoints for document upload, versioning, permissions, and lifecycle management")
@SecurityRequirement(name = "bearerAuth")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload a new document (PDF, DOCX, Markdown, Text up to 25MB)")
    public ResponseEntity<DocumentUploadResponse> uploadDocument(
            @PathVariable UUID organizationId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "visibility", required = false, defaultValue = "ORGANIZATION") DocumentVisibility visibility,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        DocumentUploadResponse response = documentService.uploadDocument(
                organizationId,
                principal.userId(),
                file,
                title,
                description,
                visibility
        );
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @PostMapping(value = "/{documentId}/versions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload a replacement file to create a new document version")
    public ResponseEntity<DocumentUploadResponse> uploadReplacement(
            @PathVariable UUID organizationId,
            @PathVariable UUID documentId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        DocumentUploadResponse response = documentService.uploadReplacement(
                organizationId,
                documentId,
                principal.userId(),
                file
        );
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @GetMapping
    @Operation(summary = "List authorized documents in the organization (paginated)")
    public ResponseEntity<PageResponse<DocumentSummaryResponse>> listDocuments(
            @PathVariable UUID organizationId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PageableDefault(size = 20) Pageable pageable) {

        Page<DocumentSummaryResponse> page = documentService.listDocuments(organizationId, principal.userId(), pageable);
        return ResponseEntity.ok(PageResponse.from(page));
    }

    @GetMapping("/{documentId}")
    @Operation(summary = "Get document metadata, current version, and version history")
    public ResponseEntity<DocumentDetailResponse> getDocument(
            @PathVariable UUID organizationId,
            @PathVariable UUID documentId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        DocumentDetailResponse response = documentService.getDocument(organizationId, documentId, principal.userId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{documentId}/download")
    @Operation(summary = "Download a document file (defaults to current approved version)")
    public ResponseEntity<InputStreamResource> downloadDocument(
            @PathVariable UUID organizationId,
            @PathVariable UUID documentId,
            @RequestParam(value = "version", required = false) Integer versionNumber,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        DocumentService.DownloadResult result = documentService.downloadDocument(
                organizationId,
                documentId,
                principal.userId(),
                versionNumber
        );

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(result.contentType()))
                .contentLength(result.fileSize())
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + result.fileName() + "\"")
                .body(new InputStreamResource(result.inputStream()));
    }

    @DeleteMapping("/{documentId}")
    @Operation(summary = "Logically delete a document (immediately removes access)")
    public ResponseEntity<Void> deleteDocument(
            @PathVariable UUID organizationId,
            @PathVariable UUID documentId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        documentService.deleteDocument(organizationId, documentId, principal.userId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{documentId}/permissions")
    @Operation(summary = "Grant document permission to a user")
    public ResponseEntity<Map<String, String>> grantPermission(
            @PathVariable UUID organizationId,
            @PathVariable UUID documentId,
            @Valid @RequestBody GrantPermissionRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        documentService.grantPermission(
                organizationId,
                documentId,
                principal.userId(),
                request.userId(),
                request.permissionLevel()
        );
        return ResponseEntity.ok(Map.of("message", "Permission granted successfully."));
    }

    @DeleteMapping("/{documentId}/permissions/{userId}")
    @Operation(summary = "Revoke document permission from a user")
    public ResponseEntity<Void> revokePermission(
            @PathVariable UUID organizationId,
            @PathVariable UUID documentId,
            @PathVariable UUID userId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        documentService.revokePermission(organizationId, documentId, principal.userId(), userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{documentId}/permissions")
    @Operation(summary = "List document permissions")
    public ResponseEntity<List<DocumentPermissionResponse>> listPermissions(
            @PathVariable UUID organizationId,
            @PathVariable UUID documentId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        List<DocumentPermissionResponse> permissions = documentService.listPermissions(organizationId, documentId, principal.userId());
        return ResponseEntity.ok(permissions);
    }
}

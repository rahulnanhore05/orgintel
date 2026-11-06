package io.rahulnanhore.orgintel.document.service.impl;

import io.rahulnanhore.orgintel.common.exception.ApiException;
import io.rahulnanhore.orgintel.common.exception.ForbiddenException;
import io.rahulnanhore.orgintel.common.exception.ResourceNotFoundException;
import io.rahulnanhore.orgintel.common.exception.ValidationException;
import io.rahulnanhore.orgintel.document.dto.*;
import io.rahulnanhore.orgintel.document.repository.DocumentChunkRepository;
import io.rahulnanhore.orgintel.document.repository.DocumentPermissionRepository;
import io.rahulnanhore.orgintel.document.repository.DocumentRepository;
import io.rahulnanhore.orgintel.document.repository.DocumentVersionRepository;
import io.rahulnanhore.orgintel.document.service.DocumentService;
import io.rahulnanhore.orgintel.identity.domain.User;
import io.rahulnanhore.orgintel.identity.repository.UserRepository;
import io.rahulnanhore.orgintel.ingestion.domain.IngestionJob;
import io.rahulnanhore.orgintel.ingestion.repository.IngestionJobRepository;
import io.rahulnanhore.orgintel.organization.domain.OrgRole;
import io.rahulnanhore.orgintel.organization.domain.Organization;
import io.rahulnanhore.orgintel.organization.repository.OrganizationRepository;
import io.rahulnanhore.orgintel.organization.service.MembershipService;
import io.rahulnanhore.orgintel.storage.StorageService;
import io.rahulnanhore.orgintel.document.domain.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;

@Service
@Transactional
public class DocumentServiceImpl implements DocumentService {

    private static final Logger log = LoggerFactory.getLogger(DocumentServiceImpl.class);
    private static final long MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "docx", "md", "txt");

    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository versionRepository;
    private final DocumentPermissionRepository permissionRepository;
    private final DocumentChunkRepository chunkRepository;
    private final IngestionJobRepository jobRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final MembershipService membershipService;
    private final StorageService storageService;
    private final VectorStore vectorStore;

    public DocumentServiceImpl(
            DocumentRepository documentRepository,
            DocumentVersionRepository versionRepository,
            DocumentPermissionRepository permissionRepository,
            DocumentChunkRepository chunkRepository,
            IngestionJobRepository jobRepository,
            OrganizationRepository organizationRepository,
            UserRepository userRepository,
            MembershipService membershipService,
            StorageService storageService,
            VectorStore vectorStore) {
        this.documentRepository = documentRepository;
        this.versionRepository = versionRepository;
        this.permissionRepository = permissionRepository;
        this.chunkRepository = chunkRepository;
        this.jobRepository = jobRepository;
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
        this.membershipService = membershipService;
        this.storageService = storageService;
        this.vectorStore = vectorStore;
    }

    @Override
    public DocumentUploadResponse uploadDocument(
            UUID organizationId,
            UUID userId,
            MultipartFile file,
            String title,
            String description,
            DocumentVisibility visibility) {

        requireMembership(userId, organizationId);
        validateFile(file);

        Organization org = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + organizationId));
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        String sanitizedTitle = StringUtils.hasText(title) ? title.trim() : extractFileNameWithoutExt(file.getOriginalFilename());
        String sanitizedFileName = sanitizeFileName(file.getOriginalFilename());
        String contentType = detectContentType(sanitizedFileName, file.getContentType());
        byte[] bytes = extractBytes(file);
        String contentHash = computeHash(bytes);

        UUID docId = UUID.randomUUID();
        Document doc = new Document(docId, org, owner, sanitizedTitle, description, visibility);
        doc = documentRepository.save(doc);

        String storageKey = "org_" + organizationId + "/" + docId + "/v1_" + sanitizedFileName;
        storageService.save(storageKey, fileInputStream(bytes), bytes.length, contentType);

        DocumentVersion version = new DocumentVersion(
                UUID.randomUUID(),
                doc,
                1,
                sanitizedFileName,
                contentType,
                bytes.length,
                contentHash,
                storageKey
        );
        version = versionRepository.save(version);

        // Enqueue durable ingestion job
        IngestionJob job = new IngestionJob(UUID.randomUUID(), version, organizationId);
        jobRepository.save(job);

        return DocumentUploadResponse.of(doc, version, "Document uploaded successfully and queued for processing.");
    }

    @Override
    public DocumentUploadResponse uploadReplacement(
            UUID organizationId,
            UUID documentId,
            UUID userId,
            MultipartFile file) {

        Document doc = getDocumentEntity(organizationId, documentId);
        requireWritePermission(doc, userId);
        validateFile(file);

        String sanitizedFileName = sanitizeFileName(file.getOriginalFilename());
        String contentType = detectContentType(sanitizedFileName, file.getContentType());
        byte[] bytes = extractBytes(file);
        String contentHash = computeHash(bytes);

        int nextVersionNumber = versionRepository.findTopByDocumentIdOrderByVersionNumberDesc(doc.getId())
                .map(v -> v.getVersionNumber() + 1)
                .orElse(1);

        String storageKey = "org_" + organizationId + "/" + doc.getId() + "/v" + nextVersionNumber + "_" + sanitizedFileName;
        storageService.save(storageKey, fileInputStream(bytes), bytes.length, contentType);

        DocumentVersion version = new DocumentVersion(
                UUID.randomUUID(),
                doc,
                nextVersionNumber,
                sanitizedFileName,
                contentType,
                bytes.length,
                contentHash,
                storageKey
        );
        version = versionRepository.save(version);

        // Enqueue durable ingestion job (Note: doc.currentVersion is intentionally NOT updated until job finishes!)
        IngestionJob job = new IngestionJob(UUID.randomUUID(), version, organizationId);
        jobRepository.save(job);

        return DocumentUploadResponse.of(doc, version, "Replacement uploaded as version " + nextVersionNumber + " and queued for processing.");
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentDetailResponse getDocument(UUID organizationId, UUID documentId, UUID userId) {
        Document doc = getDocumentEntity(organizationId, documentId);
        requireReadPermission(doc, userId);

        List<DocumentVersionResponse> versions = versionRepository
                .findByDocumentIdOrderByVersionNumberDesc(doc.getId())
                .stream()
                .map(DocumentVersionResponse::from)
                .toList();

        return DocumentDetailResponse.of(doc, versions);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DocumentSummaryResponse> listDocuments(UUID organizationId, UUID userId, Pageable pageable) {
        requireMembership(userId, organizationId);
        boolean isAdmin = isOrgAdmin(userId, organizationId);
        Page<Document> page = documentRepository.findAuthorizedDocuments(organizationId, userId, isAdmin, pageable);
        return page.map(DocumentSummaryResponse::from);
    }

    @Override
    @Transactional(readOnly = true)
    public DownloadResult downloadDocument(UUID organizationId, UUID documentId, UUID userId, Integer versionNumber) {
        Document doc = getDocumentEntity(organizationId, documentId);
        requireReadPermission(doc, userId);

        DocumentVersion version;
        if (versionNumber != null) {
            version = versionRepository.findByDocumentIdAndVersionNumber(doc.getId(), versionNumber)
                    .orElseThrow(() -> new ResourceNotFoundException("Version " + versionNumber + " not found for document"));
        } else if (doc.getCurrentVersion() != null) {
            version = doc.getCurrentVersion();
        } else {
            version = versionRepository.findTopByDocumentIdOrderByVersionNumberDesc(doc.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("No file version available for this document"));
        }

        InputStream stream = storageService.load(version.getStorageKey());
        return new DownloadResult(stream, version.getFileName(), version.getContentType(), version.getFileSize());
    }

    @Override
    public void deleteDocument(UUID organizationId, UUID documentId, UUID userId) {
        Document doc = getDocumentEntity(organizationId, documentId);
        requireWritePermission(doc, userId);

        doc.markDeleted();
        documentRepository.save(doc);

        List<UUID> chunkIds = chunkRepository.findChunkIdsByDocumentId(documentId);
        if (!chunkIds.isEmpty()) {
            try {
                vectorStore.delete(chunkIds.stream().map(UUID::toString).toList());
            } catch (Exception ex) {
                log.warn("VectorStore cleanup warning on delete document {}: {}", documentId, ex.getMessage());
            }
        }
    }

    @Override
    public void grantPermission(UUID organizationId, UUID documentId, UUID userId, UUID targetUserId, PermissionLevel permissionLevel) {
        Document doc = getDocumentEntity(organizationId, documentId);
        requireWritePermission(doc, userId);

        requireMembership(targetUserId, organizationId);
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Target user not found: " + targetUserId));
        User granter = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Granter user not found: " + userId));

        DocumentPermission perm = permissionRepository.findByDocumentIdAndUserId(documentId, targetUserId)
                .orElse(new DocumentPermission(UUID.randomUUID(), doc, targetUser, permissionLevel, granter));
        perm.setPermissionLevel(permissionLevel);
        permissionRepository.save(perm);
    }

    @Override
    public void revokePermission(UUID organizationId, UUID documentId, UUID userId, UUID targetUserId) {
        Document doc = getDocumentEntity(organizationId, documentId);
        requireWritePermission(doc, userId);

        permissionRepository.findByDocumentIdAndUserId(documentId, targetUserId)
                .ifPresent(permissionRepository::delete);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentPermissionResponse> listPermissions(UUID organizationId, UUID documentId, UUID userId) {
        Document doc = getDocumentEntity(organizationId, documentId);
        requireReadPermission(doc, userId);

        return permissionRepository.findByDocumentId(documentId).stream()
                .map(DocumentPermissionResponse::from)
                .toList();
    }

    private Document getDocumentEntity(UUID organizationId, UUID documentId) {
        return documentRepository.findByIdAndOrganizationIdAndStatus(documentId, organizationId, DocumentStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + documentId));
    }

    private void requireMembership(UUID userId, UUID organizationId) {
        if (!membershipService.hasActiveMembership(userId, organizationId)) {
            throw new ForbiddenException("You are not an active member of this organization.");
        }
    }

    private boolean isOrgAdmin(UUID userId, UUID organizationId) {
        return membershipService.getUserRole(userId, organizationId)
                .map(r -> r == OrgRole.ORG_ADMIN)
                .orElse(false);
    }

    private void requireReadPermission(Document doc, UUID userId) {
        UUID orgId = doc.getOrganization().getId();
        requireMembership(userId, orgId);

        if (isOrgAdmin(userId, orgId)) {
            return;
        }
        if (doc.getOwner().getId().equals(userId)) {
            return;
        }
        if (doc.getVisibility() == DocumentVisibility.ORGANIZATION) {
            return;
        }
        if (permissionRepository.existsByDocumentIdAndUserId(doc.getId(), userId)) {
            return;
        }

        throw new ForbiddenException("You do not have permission to access this document.");
    }

    private void requireWritePermission(Document doc, UUID userId) {
        UUID orgId = doc.getOrganization().getId();
        requireMembership(userId, orgId);

        if (isOrgAdmin(userId, orgId)) {
            return;
        }
        if (doc.getOwner().getId().equals(userId)) {
            return;
        }
        Optional<DocumentPermission> perm = permissionRepository.findByDocumentIdAndUserId(doc.getId(), userId);
        if (perm.isPresent() && perm.get().getPermissionLevel() == PermissionLevel.WRITE) {
            return;
        }

        throw new ForbiddenException("You do not have permission to modify or manage this document.");
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException("File must not be empty.", HttpStatus.BAD_REQUEST, "EMPTY_FILE");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ApiException("File size exceeds 25 MB limit.", HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE");
        }
        String originalName = file.getOriginalFilename();
        if (originalName == null || !originalName.contains(".")) {
            throw new ApiException("File name must include a valid extension.", HttpStatus.BAD_REQUEST, "INVALID_FILE_EXTENSION");
        }
        String ext = originalName.substring(originalName.lastIndexOf('.') + 1).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw new ApiException("Unsupported file format: ." + ext + ". Allowed: " + ALLOWED_EXTENSIONS,
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_MEDIA_TYPE");
        }
    }

    private String sanitizeFileName(String fileName) {
        if (fileName == null) {
            return "document.bin";
        }
        String baseName = Paths.get(fileName).getFileName().toString();
        return baseName.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private String extractFileNameWithoutExt(String fileName) {
        if (fileName == null) return "Untitled Document";
        String sanitized = sanitizeFileName(fileName);
        int dotIdx = sanitized.lastIndexOf('.');
        return dotIdx > 0 ? sanitized.substring(0, dotIdx) : sanitized;
    }

    private String detectContentType(String fileName, String declaredContentType) {
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".pdf")) return "application/pdf";
        if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        if (lower.endsWith(".md")) return "text/markdown";
        if (lower.endsWith(".txt")) return "text/plain";
        return StringUtils.hasText(declaredContentType) ? declaredContentType : "application/octet-stream";
    }

    private byte[] extractBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new ApiException("Failed to read file contents.", HttpStatus.BAD_REQUEST, "FILE_READ_ERROR", e);
        }
    }

    private InputStream fileInputStream(byte[] bytes) {
        return new java.io.ByteArrayInputStream(bytes);
    }

    private String computeHash(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(bytes);
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }
}

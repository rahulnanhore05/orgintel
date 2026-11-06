package io.rahulnanhore.orgintel.ingestion.service.impl;

import io.rahulnanhore.orgintel.common.exception.ApiException;
import io.rahulnanhore.orgintel.common.exception.ResourceNotFoundException;
import io.rahulnanhore.orgintel.document.domain.Document;
import io.rahulnanhore.orgintel.document.domain.DocumentChunk;
import io.rahulnanhore.orgintel.document.domain.DocumentVersion;
import io.rahulnanhore.orgintel.document.domain.ProcessingState;
import io.rahulnanhore.orgintel.document.repository.DocumentChunkRepository;
import io.rahulnanhore.orgintel.document.repository.DocumentRepository;
import io.rahulnanhore.orgintel.document.repository.DocumentVersionRepository;
import io.rahulnanhore.orgintel.ingestion.chunker.ChunkData;
import io.rahulnanhore.orgintel.ingestion.chunker.TextChunker;
import io.rahulnanhore.orgintel.ingestion.domain.IngestionJob;
import io.rahulnanhore.orgintel.ingestion.domain.JobStatus;
import io.rahulnanhore.orgintel.ingestion.extractor.ExtractedDocument;
import io.rahulnanhore.orgintel.ingestion.extractor.TextExtractor;
import io.rahulnanhore.orgintel.ingestion.repository.IngestionJobRepository;
import io.rahulnanhore.orgintel.ingestion.service.IngestionPipelineService;
import io.rahulnanhore.orgintel.organization.domain.Organization;
import io.rahulnanhore.orgintel.storage.StorageService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class IngestionPipelineServiceImpl implements IngestionPipelineService {

    private static final Logger log = LoggerFactory.getLogger(IngestionPipelineServiceImpl.class);

    private final IngestionJobRepository jobRepository;
    private final DocumentVersionRepository versionRepository;
    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository chunkRepository;
    private final StorageService storageService;
    private final List<TextExtractor> textExtractors;
    private final TextChunker textChunker;
    private final VectorStore vectorStore;

    public IngestionPipelineServiceImpl(
            IngestionJobRepository jobRepository,
            DocumentVersionRepository versionRepository,
            DocumentRepository documentRepository,
            DocumentChunkRepository chunkRepository,
            StorageService storageService,
            List<TextExtractor> textExtractors,
            TextChunker textChunker,
            VectorStore vectorStore) {
        this.jobRepository = jobRepository;
        this.versionRepository = versionRepository;
        this.documentRepository = documentRepository;
        this.chunkRepository = chunkRepository;
        this.storageService = storageService;
        this.textExtractors = textExtractors;
        this.textChunker = textChunker;
        this.vectorStore = vectorStore;
    }

    @Override
    @Transactional
    public void processJob(UUID jobId) {
        IngestionJob job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + jobId));

        DocumentVersion version = job.getVersion();
        Document document = version.getDocument();
        Organization organization = document.getOrganization();

        log.info("Starting ingestion processing for Job {} (Document: {}, Version: {})",
                jobId, document.getId(), version.getVersionNumber());

        job.setStatus(JobStatus.RUNNING);
        job.setAttemptCount(job.getAttemptCount() + 1);
        version.setProcessingState(ProcessingState.PROCESSING);
        jobRepository.save(job);
        versionRepository.save(version);

        try {
            // 1. Locate text extractor
            TextExtractor extractor = textExtractors.stream()
                    .filter(e -> e.supports(version.getContentType(), version.getFileName()))
                    .findFirst()
                    .orElseThrow(() -> new ApiException("No text extractor available for " + version.getContentType(),
                            HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_CONTENT_TYPE"));

            // 2. Extract text from stored file
            ExtractedDocument extractedDoc;
            try (InputStream fileStream = storageService.load(version.getStorageKey())) {
                extractedDoc = extractor.extract(fileStream);
            }

            // 3. Chunk text
            List<ChunkData> chunkDataList = textChunker.chunk(extractedDoc);
            if (chunkDataList.isEmpty()) {
                throw new ApiException("Document extraction produced no valid text chunks.",
                        HttpStatus.UNPROCESSABLE_ENTITY, "EMPTY_DOCUMENT_CHUNKS");
            }

            // 4. Clean up any existing chunks for this version (idempotency!)
            List<UUID> existingChunkIds = chunkRepository.findChunkIdsByVersionId(version.getId());
            if (!existingChunkIds.isEmpty()) {
                try {
                    vectorStore.delete(existingChunkIds.stream().map(UUID::toString).toList());
                } catch (Exception ex) {
                    log.warn("VectorStore cleanup warning on version {}: {}", version.getId(), ex.getMessage());
                }
            }
            chunkRepository.deleteByVersionId(version.getId());

            // 5. Persist chunks
            List<DocumentChunk> entities = new ArrayList<>(chunkDataList.size());
            for (ChunkData cd : chunkDataList) {
                DocumentChunk chunk = new DocumentChunk(
                        UUID.randomUUID(),
                        version,
                        document,
                        organization,
                        cd.index(),
                        cd.content(),
                        cd.tokenCount(),
                        cd.pageNumber(),
                        cd.sectionTitle()
                );
                entities.add(chunk);
            }
            chunkRepository.saveAll(entities);

            // 7. Mark version completed
            version.setProcessingState(ProcessingState.COMPLETED);
            version.setCompletedAt(Instant.now());
            versionRepository.save(version);

            // 8. Version promotion: prune all prior versions from VectorStore
            List<UUID> oldChunkIds = chunkRepository.findChunkIdsByDocumentIdAndVersionIdNot(document.getId(), version.getId());
            if (!oldChunkIds.isEmpty()) {
                try {
                    vectorStore.delete(oldChunkIds.stream().map(UUID::toString).toList());
                } catch (Exception ex) {
                    log.warn("VectorStore cleanup warning on superseded versions for document {}: {}", document.getId(), ex.getMessage());
                }
            }

            document.setCurrentVersion(version);
            documentRepository.save(document);

            // 9. Mark job completed
            job.setStatus(JobStatus.COMPLETED);
            job.setFailureReason(null);
            jobRepository.save(job);

            // 10. Index chunks into Spring AI VectorStore
            List<org.springframework.ai.document.Document> aiDocuments = new ArrayList<>(entities.size());
            for (DocumentChunk chunk : entities) {
                Map<String, Object> metadata = new HashMap<>();
                metadata.put("chunkId", chunk.getId().toString());
                metadata.put("documentId", document.getId().toString());
                metadata.put("organizationId", organization.getId().toString());
                metadata.put("versionId", version.getId().toString());
                metadata.put("versionNumber", version.getVersionNumber());
                metadata.put("chunkIndex", chunk.getChunkIndex());
                metadata.put("pageNumber", chunk.getPageNumber() != null ? chunk.getPageNumber() : 0);
                metadata.put("sectionTitle", chunk.getSectionTitle() != null ? chunk.getSectionTitle() : "");
                metadata.put("documentTitle", document.getTitle());
                metadata.put("visibility", document.getVisibility() != null ? document.getVisibility().name() : "ORGANIZATION");
                metadata.put("ownerId", document.getOwner() != null && document.getOwner().getId() != null ? document.getOwner().getId().toString() : "");
                metadata.put("status", "ACTIVE");

                org.springframework.ai.document.Document doc = new org.springframework.ai.document.Document(
                        chunk.getId().toString(),
                        chunk.getContent(),
                        metadata
                );
                aiDocuments.add(doc);
            }
            try {
                vectorStore.add(aiDocuments);
            } catch (Exception ex) {
                log.warn("Spring AI VectorStore indexing notification: {}", ex.getMessage());
            }

            log.info("Successfully completed ingestion for Document {} Version {} with {} chunks",
                    document.getId(), version.getVersionNumber(), entities.size());

        } catch (Exception ex) {
            String sanitizedError = sanitizeError(ex.getMessage());
            log.error("Ingestion failed for Job {}: {}", jobId, sanitizedError, ex);

            job.setFailureReason(sanitizedError);
            if (job.getAttemptCount() >= job.getMaxAttempts()) {
                job.setStatus(JobStatus.FAILED);
                version.setProcessingState(ProcessingState.FAILED);
            } else {
                // Return to QUEUED so worker can retry with backoff
                job.setStatus(JobStatus.QUEUED);
            }

            jobRepository.save(job);
            versionRepository.save(version);
            // Note: document.currentVersion is deliberately NOT updated! Previous version remains active.
        }
    }

    @Override
    @Transactional
    public void retryJob(UUID jobId, UUID organizationId) {
        IngestionJob job = getJob(jobId, organizationId);
        job.setStatus(JobStatus.QUEUED);
        job.setAttemptCount(0);
        job.setFailureReason(null);
        job.setLockedUntil(null);
        job.setLockedBy(null);
        jobRepository.save(job);
    }

    @Override
    @Transactional(readOnly = true)
    public IngestionJob getJob(UUID jobId, UUID organizationId) {
        IngestionJob job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + jobId));

        if (!job.getOrganizationId().equals(organizationId)) {
            throw new ResourceNotFoundException("Job not found: " + jobId);
        }
        return job;
    }

    private String sanitizeError(String message) {
        if (message == null || message.isBlank()) {
            return "Internal ingestion processing error";
        }
        // Remove file paths and stack trace details
        return message.replaceAll("[A-Za-z]:\\\\[^\\s]+", "[path]")
                .replaceAll("key=[^&\\s]+", "key=[REDACTED]");
    }
}

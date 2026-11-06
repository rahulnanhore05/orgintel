package io.rahulnanhore.orgintel.ingestion;

import io.rahulnanhore.orgintel.document.domain.Document;
import io.rahulnanhore.orgintel.document.domain.DocumentChunk;
import io.rahulnanhore.orgintel.document.domain.DocumentVersion;
import io.rahulnanhore.orgintel.document.domain.DocumentVisibility;
import io.rahulnanhore.orgintel.document.domain.ProcessingState;
import io.rahulnanhore.orgintel.document.dto.DocumentUploadResponse;
import io.rahulnanhore.orgintel.document.repository.DocumentChunkRepository;
import io.rahulnanhore.orgintel.document.repository.DocumentRepository;
import io.rahulnanhore.orgintel.document.repository.DocumentVersionRepository;
import io.rahulnanhore.orgintel.document.service.DocumentService;
import io.rahulnanhore.orgintel.identity.dto.AuthResponse;
import io.rahulnanhore.orgintel.identity.dto.RegisterRequest;
import io.rahulnanhore.orgintel.identity.service.AuthService;
import io.rahulnanhore.orgintel.ingestion.domain.IngestionJob;
import io.rahulnanhore.orgintel.ingestion.domain.JobStatus;
import io.rahulnanhore.orgintel.ingestion.repository.IngestionJobRepository;
import io.rahulnanhore.orgintel.ingestion.service.IngestionPipelineService;
import io.rahulnanhore.orgintel.organization.dto.CreateOrganizationRequest;
import io.rahulnanhore.orgintel.organization.dto.OrganizationSummaryResponse;
import io.rahulnanhore.orgintel.organization.service.OrganizationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class IngestionPipelineIntegrationTest {

    @Autowired
    private DocumentService documentService;

    @Autowired
    private AuthService authService;

    @Autowired
    private OrganizationService organizationService;

    @Autowired
    private IngestionPipelineService pipelineService;

    @Autowired
    private IngestionJobRepository jobRepository;

    @Autowired
    private DocumentChunkRepository chunkRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private DocumentVersionRepository versionRepository;

    @Test
    void shouldProcessIngestionJobAndPromoteVersion() {
        AuthResponse auth = authService.register(
                new RegisterRequest("pipeline_admin@example.com", "PipelineP@ss123", "Pipeline Admin")
        );
        OrganizationSummaryResponse org = organizationService.createOrganization(
                new CreateOrganizationRequest("Pipeline Org", "pipeline-org"),
                auth.user().id()
        );

        String content = """
            # Executive Summary
            OrgIntel is an enterprise platform for document intelligence.
            
            # Key Capabilities
            Features include hybrid search, passage citations, and durable workers.
        """;

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "spec.md",
                "text/markdown",
                content.getBytes(StandardCharsets.UTF_8)
        );

        DocumentUploadResponse upload = documentService.uploadDocument(
                org.id(),
                auth.user().id(),
                file,
                "OrgIntel Spec",
                "Platform specification document",
                DocumentVisibility.ORGANIZATION
        );

        IngestionJob job = jobRepository.findByVersionId(upload.versionId()).orElseThrow();
        assertEquals(JobStatus.QUEUED, job.getStatus());

        // Process the job
        pipelineService.processJob(job.getId());

        // Verify job and version status
        IngestionJob completedJob = jobRepository.findById(job.getId()).orElseThrow();
        assertEquals(JobStatus.COMPLETED, completedJob.getStatus());

        DocumentVersion version = versionRepository.findById(upload.versionId()).orElseThrow();
        assertEquals(ProcessingState.COMPLETED, version.getProcessingState());
        assertNotNull(version.getCompletedAt());

        // Verify version promotion
        Document doc = documentRepository.findById(upload.documentId()).orElseThrow();
        assertNotNull(doc.getCurrentVersion());
        assertEquals(version.getId(), doc.getCurrentVersion().getId());

        // Verify chunks were indexed
        List<DocumentChunk> chunks = chunkRepository.findByVersionIdOrderByChunkIndexAsc(version.getId());
        assertFalse(chunks.isEmpty());
        assertEquals(2, chunks.size());
        assertEquals("Executive Summary", chunks.get(0).getSectionTitle());
        assertNotNull(chunks.get(0).getContent());
        assertNotNull(chunks.get(0).getTokenCount());

        // Verify idempotency: re-running processJob should not duplicate chunks
        pipelineService.processJob(job.getId());
        List<DocumentChunk> reChunks = chunkRepository.findByVersionIdOrderByChunkIndexAsc(version.getId());
        assertEquals(chunks.size(), reChunks.size());
    }
}

package io.rahulnanhore.orgintel.document;

import io.rahulnanhore.orgintel.common.exception.ForbiddenException;
import io.rahulnanhore.orgintel.document.domain.DocumentVisibility;
import io.rahulnanhore.orgintel.document.domain.ProcessingState;
import io.rahulnanhore.orgintel.document.dto.DocumentDetailResponse;
import io.rahulnanhore.orgintel.document.dto.DocumentSummaryResponse;
import io.rahulnanhore.orgintel.document.dto.DocumentUploadResponse;
import io.rahulnanhore.orgintel.document.service.DocumentService;
import io.rahulnanhore.orgintel.identity.dto.AuthResponse;
import io.rahulnanhore.orgintel.identity.dto.RegisterRequest;
import io.rahulnanhore.orgintel.identity.service.AuthService;
import io.rahulnanhore.orgintel.ingestion.domain.IngestionJob;
import io.rahulnanhore.orgintel.ingestion.domain.JobStatus;
import io.rahulnanhore.orgintel.ingestion.repository.IngestionJobRepository;
import io.rahulnanhore.orgintel.ingestion.service.IngestionPipelineService;
import io.rahulnanhore.orgintel.organization.domain.OrgRole;
import io.rahulnanhore.orgintel.organization.dto.CreateOrganizationRequest;
import io.rahulnanhore.orgintel.organization.dto.OrganizationSummaryResponse;
import io.rahulnanhore.orgintel.organization.service.MembershipService;
import io.rahulnanhore.orgintel.organization.service.OrganizationService;
import io.rahulnanhore.orgintel.retrieval.dto.SearchRequest;
import io.rahulnanhore.orgintel.retrieval.dto.SearchResponse;
import io.rahulnanhore.orgintel.retrieval.service.RetrievalService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class DocumentLifecycleIntegrationTest {

    @Autowired
    private DocumentService documentService;

    @Autowired
    private AuthService authService;

    @Autowired
    private OrganizationService organizationService;

    @Autowired
    private MembershipService membershipService;

    @Autowired
    private IngestionJobRepository jobRepository;

    @Autowired
    private IngestionPipelineService pipelineService;

    @Autowired
    private RetrievalService retrievalService;

    @Test
    void shouldUploadVersionAndManageDocumentLifecycle() {
        // Register Admin and create org
        AuthResponse adminAuth = authService.register(
                new RegisterRequest("docadmin@example.com", "AdminP@ss123", "Doc Admin")
        );
        UUID adminId = adminAuth.user().id();

        OrganizationSummaryResponse org = organizationService.createOrganization(
                new CreateOrganizationRequest("Docs Org", "docs-org"),
                adminId
        );
        UUID orgId = org.id();

        // 1. Upload initial document (version 1)
        MockMultipartFile fileV1 = new MockMultipartFile(
                "file",
                "handbook.txt",
                "text/plain",
                "Company handbook version 1 content.".getBytes(StandardCharsets.UTF_8)
        );

        DocumentUploadResponse uploadV1 = documentService.uploadDocument(
                orgId,
                adminId,
                fileV1,
                "Company Handbook",
                "Official Employee Handbook",
                DocumentVisibility.ORGANIZATION
        );

        assertNotNull(uploadV1);
        assertEquals(1, uploadV1.versionNumber());
        assertEquals(ProcessingState.QUEUED, uploadV1.processingState());

        // Verify IngestionJob was queued and process it
        Optional<IngestionJob> queuedJob = jobRepository.findByVersionId(uploadV1.versionId());
        assertTrue(queuedJob.isPresent());
        assertEquals(JobStatus.QUEUED, queuedJob.get().getStatus());
        pipelineService.processJob(queuedJob.get().getId());

        // Verify version 1 is indexed and searchable in VectorStore
        SearchResponse searchV1 = retrievalService.search(orgId, adminId, new SearchRequest("handbook", 5));
        assertFalse(searchV1.results().isEmpty());
        assertTrue(searchV1.results().get(0).content().contains("version 1 content"));

        // 2. Upload replacement (version 2)
        MockMultipartFile fileV2 = new MockMultipartFile(
                "file",
                "handbook_revised.txt",
                "text/plain",
                "Company handbook version 2 updated policies.".getBytes(StandardCharsets.UTF_8)
        );

        DocumentUploadResponse uploadV2 = documentService.uploadReplacement(
                orgId,
                uploadV1.documentId(),
                adminId,
                fileV2
        );

        assertEquals(2, uploadV2.versionNumber());

        // Process replacement job -> modifies document in VectorStore
        IngestionJob jobV2 = jobRepository.findByVersionId(uploadV2.versionId()).orElseThrow();
        pipelineService.processJob(jobV2.getId());

        // Verify VectorStore is modified: search returns version 2 content, previous version content is gone!
        SearchResponse searchV2 = retrievalService.search(orgId, adminId, new SearchRequest("policies", 5));
        assertFalse(searchV2.results().isEmpty());
        assertTrue(searchV2.results().get(0).content().contains("version 2 updated policies"));
        assertTrue(searchV2.results().stream().noneMatch(r -> r.content().contains("version 1 content")),
                "Superseded version 1 must not appear in VectorStore results after replacement!");

        // 3. Inspect document details
        DocumentDetailResponse detail = documentService.getDocument(orgId, uploadV1.documentId(), adminId);
        assertEquals(2, detail.versions().size());

        // 4. Test download
        DocumentService.DownloadResult download = documentService.downloadDocument(orgId, uploadV1.documentId(), adminId, 1);
        assertNotNull(download);
        assertEquals("handbook.txt", download.fileName());

        // 5. Test deletion -> prunes document completely from VectorStore
        documentService.deleteDocument(orgId, uploadV1.documentId(), adminId);
        Page<DocumentSummaryResponse> list = documentService.listDocuments(orgId, adminId, PageRequest.of(0, 10));
        assertTrue(list.getContent().isEmpty());

        SearchResponse searchAfterDelete = retrievalService.search(orgId, adminId, new SearchRequest("policies", 5));
        assertTrue(searchAfterDelete.results().isEmpty(),
                "Deleted document must be completely pruned from VectorStore!");
    }

    @Test
    void shouldEnforceRestrictedDocumentVisibility() {
        AuthResponse adminAuth = authService.register(
                new RegisterRequest("hr_admin@example.com", "AdminP@ss123", "HR Admin")
        );
        OrganizationSummaryResponse org = organizationService.createOrganization(
                new CreateOrganizationRequest("HR Org", "hr-org"),
                adminAuth.user().id()
        );

        // Upload RESTRICTED document
        MockMultipartFile secretFile = new MockMultipartFile(
                "file",
                "salaries.txt",
                "text/plain",
                "Confidential salaries list.".getBytes(StandardCharsets.UTF_8)
        );

        DocumentUploadResponse secretDoc = documentService.uploadDocument(
                org.id(),
                adminAuth.user().id(),
                secretFile,
                "Executive Salaries",
                "Confidential",
                DocumentVisibility.RESTRICTED
        );

        // Register ordinary member in the same org
        AuthResponse devAuth = authService.register(
                new RegisterRequest("developer@example.com", "DevP@ss123", "Developer User")
        );
        membershipService.addMember(org.id(), devAuth.user().id(), OrgRole.MEMBER, adminAuth.user().id());

        // Ordinary member should NOT see the RESTRICTED document
        Page<DocumentSummaryResponse> devList = documentService.listDocuments(org.id(), devAuth.user().id(), PageRequest.of(0, 10));
        assertTrue(devList.getContent().isEmpty());

        // Ordinary member cannot get details of the RESTRICTED document
        assertThrows(ForbiddenException.class, () ->
                documentService.getDocument(org.id(), secretDoc.documentId(), devAuth.user().id())
        );
    }
}

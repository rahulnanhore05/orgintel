package io.rahulnanhore.orgintel.retrieval;

import io.rahulnanhore.orgintel.common.exception.ForbiddenException;
import io.rahulnanhore.orgintel.document.domain.DocumentVisibility;
import io.rahulnanhore.orgintel.document.domain.PermissionLevel;
import io.rahulnanhore.orgintel.document.dto.DocumentUploadResponse;
import io.rahulnanhore.orgintel.document.service.DocumentService;
import io.rahulnanhore.orgintel.identity.dto.AuthResponse;
import io.rahulnanhore.orgintel.identity.dto.RegisterRequest;
import io.rahulnanhore.orgintel.identity.service.AuthService;
import io.rahulnanhore.orgintel.ingestion.domain.IngestionJob;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class HybridRetrievalIntegrationTest {

    @Autowired
    private RetrievalService retrievalService;

    @Autowired
    private DocumentService documentService;

    @Autowired
    private AuthService authService;

    @Autowired
    private OrganizationService organizationService;

    @Autowired
    private MembershipService membershipService;

    @Autowired
    private IngestionPipelineService pipelineService;

    @Autowired
    private IngestionJobRepository jobRepository;

    @Test
    void shouldPerformHybridSearchAndEnforceSecurityBoundaries() {
        // 1. Create Organization & Admin
        AuthResponse adminAuth = authService.register(
                new RegisterRequest("search_admin@example.com", "AdminP@ss123", "Search Admin")
        );
        OrganizationSummaryResponse org = organizationService.createOrganization(
                new CreateOrganizationRequest("Search Corp", "search-corp"),
                adminAuth.user().id()
        );
        UUID orgId = org.id();
        UUID adminId = adminAuth.user().id();

        // 2. Upload & Ingest Public Document
        String publicContent = """
            # Leave Policy
            Employees are entitled to 20 days of paid annual leave per calendar year.
            Sick leave is granted up to 10 days with a medical certificate.
        """;
        MockMultipartFile pubFile = new MockMultipartFile(
                "file", "leave_policy.md", "text/markdown", publicContent.getBytes(StandardCharsets.UTF_8)
        );
        DocumentUploadResponse pubUpload = documentService.uploadDocument(
                orgId, adminId, pubFile, "Leave Policy", "Annual and sick leave rules", DocumentVisibility.ORGANIZATION
        );
        IngestionJob pubJob = jobRepository.findByVersionId(pubUpload.versionId()).orElseThrow();
        pipelineService.processJob(pubJob.getId());

        // 3. Upload & Ingest Restricted Document
        String secretContent = """
            # Quarterly Financials
            The company achieved revenue of 50 million dollars with net margin of 25 percent.
        """;
        MockMultipartFile secretFile = new MockMultipartFile(
                "file", "financials.md", "text/markdown", secretContent.getBytes(StandardCharsets.UTF_8)
        );
        DocumentUploadResponse secretUpload = documentService.uploadDocument(
                orgId, adminId, secretFile, "Quarterly Financials", "Restricted budget", DocumentVisibility.RESTRICTED
        );
        IngestionJob secretJob = jobRepository.findByVersionId(secretUpload.versionId()).orElseThrow();
        pipelineService.processJob(secretJob.getId());

        // 4. Admin searches for leave policy -> gets Leave Policy
        SearchResponse adminSearchLeave = retrievalService.search(orgId, adminId, new SearchRequest("leave policy", 5));
        assertFalse(adminSearchLeave.results().isEmpty());
        assertTrue(adminSearchLeave.results().get(0).content().contains("paid annual leave"));

        // 5. Admin searches for financials -> gets Financials
        SearchResponse adminSearchFin = retrievalService.search(orgId, adminId, new SearchRequest("revenue margin", 5));
        assertFalse(adminSearchFin.results().isEmpty());
        assertTrue(adminSearchFin.results().stream().anyMatch(r -> r.documentTitle().equals("Quarterly Financials")));

        // 6. Ordinary member searches -> Restricted Document MUST NOT appear in results!
        AuthResponse memberAuth = authService.register(
                new RegisterRequest("search_dev@example.com", "DevP@ss123", "Search Dev")
        );
        UUID memberId = memberAuth.user().id();
        membershipService.addMember(orgId, memberId, OrgRole.MEMBER, adminId);

        SearchResponse memberSearchFin = retrievalService.search(orgId, memberId, new SearchRequest("revenue margin", 5));
        assertTrue(memberSearchFin.results().stream().noneMatch(r -> r.documentTitle().equals("Quarterly Financials")),
                "Restricted document must not be visible to ordinary members!");

        // 7. When Admin explicitly grants READ permission to the member, it becomes searchable for that member!
        documentService.grantPermission(orgId, secretUpload.documentId(), adminId, memberId, PermissionLevel.READ);
        SearchResponse memberSearchWithPerm = retrievalService.search(orgId, memberId, new SearchRequest("revenue margin", 5));
        assertTrue(memberSearchWithPerm.results().stream().anyMatch(r -> r.documentTitle().equals("Quarterly Financials")),
                "Restricted document must now be visible after permission grant!");

        // 8. Outsider from another organization is denied with ForbiddenException
        AuthResponse outsiderAuth = authService.register(
                new RegisterRequest("outsider_search@example.com", "Outsider123", "Outsider")
        );
        assertThrows(ForbiddenException.class, () ->
                retrievalService.search(orgId, outsiderAuth.user().id(), new SearchRequest("leave", 5))
        );

        // 9. When document is deleted, it is pruned from VectorStore and search returns no results
        documentService.deleteDocument(orgId, secretUpload.documentId(), adminId);
        SearchResponse searchAfterDelete = retrievalService.search(orgId, adminId, new SearchRequest("revenue margin", 5));
        assertTrue(searchAfterDelete.results().stream().noneMatch(r -> r.documentTitle().equals("Quarterly Financials")),
                "Deleted document must not appear in search results!");
    }
}

package io.rahulnanhore.orgintel.ai;

import io.rahulnanhore.orgintel.ai.service.GroundedAnswer;
import io.rahulnanhore.orgintel.ai.service.GroundedAnsweringService;
import io.rahulnanhore.orgintel.document.domain.DocumentVisibility;
import io.rahulnanhore.orgintel.document.dto.DocumentUploadResponse;
import io.rahulnanhore.orgintel.document.service.DocumentService;
import io.rahulnanhore.orgintel.identity.dto.AuthResponse;
import io.rahulnanhore.orgintel.identity.dto.RegisterRequest;
import io.rahulnanhore.orgintel.identity.service.AuthService;
import io.rahulnanhore.orgintel.ingestion.domain.IngestionJob;
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
class GroundedAnsweringIntegrationTest {

    @Autowired
    private GroundedAnsweringService answeringService;

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

    @Test
    void shouldGenerateGroundedAnswerWithValidatedCitations() {
        AuthResponse auth = authService.register(
                new RegisterRequest("ai_admin@example.com", "AdminP@ss123", "AI Admin")
        );
        OrganizationSummaryResponse org = organizationService.createOrganization(
                new CreateOrganizationRequest("AI Intelligence Corp", "ai-corp"),
                auth.user().id()
        );
        UUID orgId = org.id();
        UUID userId = auth.user().id();

        String leaveDoc = """
            # Vacation Policy
            Employees are granted 25 days of paid annual vacation each year.
        """;
        MockMultipartFile file = new MockMultipartFile(
                "file", "vacation.md", "text/markdown", leaveDoc.getBytes(StandardCharsets.UTF_8)
        );
        DocumentUploadResponse upload = documentService.uploadDocument(
                orgId, userId, file, "Vacation Policy", "Annual vacation guidelines", DocumentVisibility.ORGANIZATION
        );
        IngestionJob job = jobRepository.findByVersionId(upload.versionId()).orElseThrow();
        pipelineService.processJob(job.getId());

        // Question with evidence present
        GroundedAnswer answer = answeringService.generateGroundedAnswer(
                orgId, userId, "How many days of annual vacation are employees granted?"
        );

        assertNotNull(answer);
        assertFalse(answer.hasInsufficientEvidence());
        assertFalse(answer.citations().isEmpty());
        assertEquals("Vacation Policy", answer.citations().get(0).documentTitle());

        // Question with NO evidence present in organization
        GroundedAnswer noEvidence = answeringService.generateGroundedAnswer(
                orgId, userId, "What are the rules regarding bringing dogs to work?"
        );

        assertNotNull(noEvidence);
        assertTrue(noEvidence.hasInsufficientEvidence());
        assertTrue(noEvidence.citations().isEmpty());
        assertTrue(noEvidence.answerText().contains("insufficient evidence"));
    }

    @Test
    void shouldReportConflictingEvidenceBetweenSources() {
        AuthResponse auth = authService.register(
                new RegisterRequest("conflict_admin@example.com", "AdminP@ss123", "Conflict Admin")
        );
        OrganizationSummaryResponse org = organizationService.createOrganization(
                new CreateOrganizationRequest("Conflict Corp", "conflict-corp"),
                auth.user().id()
        );
        UUID orgId = org.id();
        UUID userId = auth.user().id();

        // Doc 1 states 10 days
        String policyA = """
            # Policy A
            Notice period for voluntary resignation is strictly 10 days.
        """;
        MockMultipartFile fileA = new MockMultipartFile(
                "file", "policyA.md", "text/markdown", policyA.getBytes(StandardCharsets.UTF_8)
        );
        DocumentUploadResponse uploadA = documentService.uploadDocument(
                orgId, userId, fileA, "Policy A", "Old policy", DocumentVisibility.ORGANIZATION
        );
        pipelineService.processJob(jobRepository.findByVersionId(uploadA.versionId()).orElseThrow().getId());

        // Doc 2 states 20 days
        String policyB = """
            # Policy B
            Notice period for voluntary resignation is strictly 20 days.
        """;
        MockMultipartFile fileB = new MockMultipartFile(
                "file", "policyB.md", "text/markdown", policyB.getBytes(StandardCharsets.UTF_8)
        );
        DocumentUploadResponse uploadB = documentService.uploadDocument(
                orgId, userId, fileB, "Policy B", "New policy", DocumentVisibility.ORGANIZATION
        );
        pipelineService.processJob(jobRepository.findByVersionId(uploadB.versionId()).orElseThrow().getId());

        GroundedAnswer answer = answeringService.generateGroundedAnswer(
                orgId, userId, "What is the notice period for voluntary resignation?"
        );

        assertNotNull(answer);
        assertTrue(answer.hasConflictingEvidence(), "Conflicting sources must be detected and reported!");
        assertTrue(answer.answerText().contains("conflict"), "Answer text should report the source conflict!");
    }
}

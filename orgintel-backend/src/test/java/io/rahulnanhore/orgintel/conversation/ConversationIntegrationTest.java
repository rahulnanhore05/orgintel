package io.rahulnanhore.orgintel.conversation;

import io.rahulnanhore.orgintel.common.exception.ForbiddenException;
import io.rahulnanhore.orgintel.common.exception.ResourceNotFoundException;
import io.rahulnanhore.orgintel.conversation.domain.MessageRole;
import io.rahulnanhore.orgintel.conversation.dto.*;
import io.rahulnanhore.orgintel.conversation.service.ConversationService;
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
class ConversationIntegrationTest {

    @Autowired
    private ConversationService conversationService;

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
    void shouldHandleConversationLifecycleMultiTurnAndFeedback() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        AuthResponse userA = authService.register(
                new RegisterRequest("conv_user_a_" + suffix + "@example.com", "Password123!", "Alice User")
        );
        AuthResponse userB = authService.register(
                new RegisterRequest("conv_user_b_" + suffix + "@example.com", "Password123!", "Bob User")
        );

        OrganizationSummaryResponse org = organizationService.createOrganization(
                new CreateOrganizationRequest("Conv Corp " + suffix, "conv-corp-" + suffix),
                userA.user().id()
        );

        // Upload and ingest document
        String docContent = "Company remote work policy requires employees to log core hours between 10am and 4pm.";
        MockMultipartFile file = new MockMultipartFile(
                "file", "remote_policy.txt", "text/plain", docContent.getBytes(StandardCharsets.UTF_8)
        );
        DocumentUploadResponse doc = documentService.uploadDocument(
                org.id(), userA.user().id(), file, "Remote Policy", "Work from home hours",
                DocumentVisibility.ORGANIZATION
        );

        IngestionJob job = jobRepository.findByVersionId(doc.versionId()).orElseThrow();
        pipelineService.processJob(job.getId());

        // 1. Create conversation
        ConversationResponse conv = conversationService.createConversation(
                org.id(), userA.user().id(), new CreateConversationRequest("Policy Inquiries")
        );
        assertNotNull(conv.id());
        assertEquals("Policy Inquiries", conv.title());

        // 2. Ask question
        MessageResponse answer1 = conversationService.askQuestion(
                org.id(), conv.id(), userA.user().id(),
                new AskQuestionRequest("What are the required core hours?", 5)
        );
        assertNotNull(answer1.id());
        assertEquals(MessageRole.ASSISTANT, answer1.role());
        assertFalse(answer1.citations().isEmpty());

        // 3. Follow-up question (multi-turn history)
        MessageResponse answer2 = conversationService.askQuestion(
                org.id(), conv.id(), userA.user().id(),
                new AskQuestionRequest("Can I work outside these hours?", 5)
        );
        assertNotNull(answer2.id());

        // 4. Stream question answering via SSE
        org.springframework.web.servlet.mvc.method.annotation.SseEmitter emitter = conversationService.askQuestionStream(
                org.id(), conv.id(), userA.user().id(),
                new AskQuestionRequest("What is the attendance requirement?", 5)
        );
        assertNotNull(emitter);

        // 5. Retrieve conversation detail
        ConversationDetailResponse detail = null;
        for (int i = 0; i < 25; i++) {
            detail = conversationService.getConversation(org.id(), conv.id(), userA.user().id());
            if (detail.messages().size() == 6) {
                break;
            }
            Thread.sleep(100);
        }
        assertEquals(6, detail.messages().size()); // 3 user messages + 3 assistant messages

        // 6. Submit feedback
        assertDoesNotThrow(() -> conversationService.submitFeedback(
                org.id(), conv.id(), answer1.id(), userA.user().id(),
                new SubmitFeedbackRequest(5, false, false, "Great accurate answer with clear citations")
        ));

        // 7. Security boundary: User B cannot access User A's conversation
        assertThrows(ForbiddenException.class, () -> conversationService.getConversation(
                org.id(), conv.id(), userB.user().id()
        ));

        // 8. Delete conversation
        conversationService.deleteConversation(org.id(), conv.id(), userA.user().id());
        assertThrows(ResourceNotFoundException.class, () -> conversationService.getConversation(
                org.id(), conv.id(), userA.user().id()
        ));
    }
}

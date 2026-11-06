package io.rahulnanhore.orgintel.conversation.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import io.rahulnanhore.orgintel.conversation.domain.AnswerFeedback;

import java.util.Optional;
import java.util.UUID;

public interface AnswerFeedbackRepository extends JpaRepository<AnswerFeedback, UUID> {
    Optional<AnswerFeedback> findByMessageIdAndUserId(UUID messageId, UUID userId);
    void deleteByMessageId(UUID messageId);
}

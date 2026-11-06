package io.rahulnanhore.orgintel.conversation.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import io.rahulnanhore.orgintel.conversation.domain.AnswerCitation;

import java.util.List;
import java.util.UUID;

public interface AnswerCitationRepository extends JpaRepository<AnswerCitation, UUID> {
    List<AnswerCitation> findByMessageIdOrderByCitationOrderAsc(UUID messageId);
}

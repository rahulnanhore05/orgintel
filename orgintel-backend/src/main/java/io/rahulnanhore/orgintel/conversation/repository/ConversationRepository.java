package io.rahulnanhore.orgintel.conversation.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import io.rahulnanhore.orgintel.conversation.domain.Conversation;

import java.util.Optional;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {
    Page<Conversation> findByOrganizationIdAndUserIdOrderByUpdatedAtDesc(UUID organizationId, UUID userId, Pageable pageable);
    Optional<Conversation> findByIdAndOrganizationId(UUID id, UUID organizationId);
}

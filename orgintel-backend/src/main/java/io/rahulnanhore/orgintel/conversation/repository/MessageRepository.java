package io.rahulnanhore.orgintel.conversation.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import io.rahulnanhore.orgintel.conversation.domain.Message;

import java.util.List;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {
    List<Message> findByConversationIdOrderByCreatedAtAsc(UUID conversationId);
}

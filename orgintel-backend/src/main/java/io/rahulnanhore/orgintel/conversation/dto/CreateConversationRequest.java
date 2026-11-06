package io.rahulnanhore.orgintel.conversation.dto;

import jakarta.validation.constraints.Size;

public record CreateConversationRequest(
        @Size(max = 255)
        String title
) {}

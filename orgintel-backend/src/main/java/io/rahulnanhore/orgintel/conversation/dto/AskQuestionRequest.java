package io.rahulnanhore.orgintel.conversation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AskQuestionRequest(
        @NotBlank
        @Size(max = 2000)
        String question,

        Integer topK
) {}

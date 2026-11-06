package io.rahulnanhore.orgintel.conversation.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SubmitFeedbackRequest(
        @NotNull
        @Min(1)
        @Max(5)
        Integer rating,

        Boolean isIncorrect,

        Boolean isUnsupported,

        @Size(max = 2000)
        String feedbackText
) {}

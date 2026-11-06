package io.rahulnanhore.orgintel.retrieval.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SearchRequest(
        @NotBlank(message = "Search query must not be blank")
        @Size(max = 1000, message = "Search query must not exceed 1000 characters")
        String query,

        Integer limit
) {
}

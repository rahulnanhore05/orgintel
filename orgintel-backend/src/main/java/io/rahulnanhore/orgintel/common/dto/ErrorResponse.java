package io.rahulnanhore.orgintel.common.dto;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record ErrorResponse(
        String correlationId,
        String errorCode,
        String message,
        int status,
        LocalDateTime timestamp,
        String path,
        Map<String, List<String>> validationErrors
) {
    public static ErrorResponse of(String correlationId, String errorCode, String message, int status, String path) {
        return new ErrorResponse(correlationId, errorCode, message, status, LocalDateTime.now(), path, null);
    }

    public static ErrorResponse ofValidation(String correlationId, String message, int status, String path, Map<String, List<String>> validationErrors) {
        return new ErrorResponse(correlationId, "VALIDATION_ERROR", message, status, LocalDateTime.now(), path, validationErrors);
    }
}

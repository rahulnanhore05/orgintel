package io.rahulnanhore.orgintel.common.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import io.rahulnanhore.orgintel.common.dto.ErrorResponse;

import java.util.*;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApiException(ApiException ex, HttpServletRequest request) {
        String correlationId = UUID.randomUUID().toString();
        log.warn("API exception [{}]: {} - Status: {}", correlationId, ex.getMessage(), ex.getStatus());
        ErrorResponse errorResponse = ErrorResponse.of(
                correlationId,
                ex.getErrorCode(),
                ex.getMessage(),
                ex.getStatus().value(),
                request.getRequestURI()
        );
        return ResponseEntity.status(ex.getStatus()).body(errorResponse);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String correlationId = UUID.randomUUID().toString();
        Map<String, List<String>> errors = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            errors.computeIfAbsent(fieldError.getField(), k -> new ArrayList<>())
                    .add(fieldError.getDefaultMessage());
        }

        ErrorResponse errorResponse = ErrorResponse.ofValidation(
                correlationId,
                "Request validation failed",
                HttpStatus.BAD_REQUEST.value(),
                request.getRequestURI(),
                errors
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException ex, HttpServletRequest request) {
        String correlationId = UUID.randomUUID().toString();
        ErrorResponse errorResponse = ErrorResponse.of(
                correlationId,
                "INVALID_CREDENTIALS",
                "Invalid email or password",
                HttpStatus.UNAUTHORIZED.value(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        String correlationId = UUID.randomUUID().toString();
        ErrorResponse errorResponse = ErrorResponse.of(
                correlationId,
                "ACCESS_DENIED",
                "Access is denied. You do not have permission for this resource.",
                HttpStatus.FORBIDDEN.value(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUploadSize(MaxUploadSizeExceededException ex, HttpServletRequest request) {
        String correlationId = UUID.randomUUID().toString();
        ErrorResponse errorResponse = ErrorResponse.of(
                correlationId,
                "FILE_SIZE_EXCEEDED",
                "The uploaded file exceeds the maximum allowed size of 25MB.",
                HttpStatus.PAYLOAD_TOO_LARGE.value(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(errorResponse);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex, HttpServletRequest request) {
        String correlationId = UUID.randomUUID().toString();
        log.error("Unhandled internal server error [correlationId={}]", correlationId, ex);
        ErrorResponse errorResponse = ErrorResponse.of(
                correlationId,
                "INTERNAL_SERVER_ERROR",
                "An unexpected internal error occurred. Please contact support with correlation ID: " + correlationId,
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }
}

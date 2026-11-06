package io.rahulnanhore.orgintel.ingestion.controller;

import io.rahulnanhore.orgintel.ingestion.domain.IngestionJob;
import io.rahulnanhore.orgintel.ingestion.dto.JobResponse;
import io.rahulnanhore.orgintel.ingestion.service.IngestionPipelineService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/organizations/{organizationId}/jobs")
@Tag(name = "Ingestion Processing", description = "Endpoints for inspecting ingestion jobs and triggering retries")
@SecurityRequirement(name = "bearerAuth")
public class JobController {

    private final IngestionPipelineService pipelineService;

    public JobController(IngestionPipelineService pipelineService) {
        this.pipelineService = pipelineService;
    }

    @GetMapping("/{jobId}")
    @Operation(summary = "Get ingestion job processing status and failure diagnostics")
    public ResponseEntity<JobResponse> getJob(
            @PathVariable UUID organizationId,
            @PathVariable UUID jobId) {
        IngestionJob job = pipelineService.getJob(jobId, organizationId);
        return ResponseEntity.ok(JobResponse.from(job));
    }

    @PostMapping("/{jobId}/retry")
    @Operation(summary = "Retry an eligible failed ingestion job")
    public ResponseEntity<Map<String, String>> retryJob(
            @PathVariable UUID organizationId,
            @PathVariable UUID jobId) {
        pipelineService.retryJob(jobId, organizationId);
        return ResponseEntity.ok(Map.of("message", "Job queued for retry."));
    }
}

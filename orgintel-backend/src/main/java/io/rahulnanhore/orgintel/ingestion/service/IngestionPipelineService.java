package io.rahulnanhore.orgintel.ingestion.service;

import java.util.UUID;

import io.rahulnanhore.orgintel.ingestion.domain.IngestionJob;
import io.rahulnanhore.orgintel.ingestion.domain.JobStatus;

public interface IngestionPipelineService {
    void processJob(UUID jobId);
    void retryJob(UUID jobId, UUID organizationId);
    IngestionJob getJob(UUID jobId, UUID organizationId);
}

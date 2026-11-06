package io.rahulnanhore.orgintel.ingestion.worker;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import io.rahulnanhore.orgintel.ingestion.domain.IngestionJob;
import io.rahulnanhore.orgintel.ingestion.repository.IngestionJobRepository;
import io.rahulnanhore.orgintel.ingestion.service.IngestionPipelineService;

import java.time.Instant;
import java.util.List;

@Component
@ConditionalOnProperty(name = "orgintel.ingestion.worker-enabled", havingValue = "true", matchIfMissing = true)
public class IngestionWorker {

    private static final Logger log = LoggerFactory.getLogger(IngestionWorker.class);

    private final IngestionJobRepository jobRepository;
    private final IngestionPipelineService pipelineService;
    private final int batchSize;

    public IngestionWorker(
            IngestionJobRepository jobRepository,
            IngestionPipelineService pipelineService,
            @Value("${orgintel.ingestion.batch-size:5}") int batchSize) {
        this.jobRepository = jobRepository;
        this.pipelineService = pipelineService;
        this.batchSize = batchSize;
    }

    @Scheduled(fixedDelayString = "${orgintel.ingestion.poll-interval-ms:5000}")
    public void pollAndProcessJobs() {
        try {
            Instant now = Instant.now();
            List<IngestionJob> claimableJobs = jobRepository.findClaimableJobs(now, PageRequest.of(0, batchSize));

            for (IngestionJob job : claimableJobs) {
                try {
                    pipelineService.processJob(job.getId());
                } catch (Exception e) {
                    log.error("Unhandled error processing ingestion job {}", job.getId(), e);
                }
            }
        } catch (Exception e) {
            log.error("Error in ingestion worker poll loop", e);
        }
    }
}

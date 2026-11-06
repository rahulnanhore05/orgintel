package io.rahulnanhore.orgintel.retrieval.controller;

import io.rahulnanhore.orgintel.identity.config.AuthenticatedUserPrincipal;
import io.rahulnanhore.orgintel.retrieval.dto.SearchRequest;
import io.rahulnanhore.orgintel.retrieval.dto.SearchResponse;
import io.rahulnanhore.orgintel.retrieval.service.RetrievalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/organizations/{organizationId}/search")
@Tag(name = "Search & Retrieval", description = "Endpoints for hybrid keyword and semantic vector search")
@SecurityRequirement(name = "bearerAuth")
public class SearchController {

    private final RetrievalService retrievalService;

    public SearchController(RetrievalService retrievalService) {
        this.retrievalService = retrievalService;
    }

    @PostMapping
    @Operation(summary = "Perform hybrid search over authorized documents")
    public ResponseEntity<SearchResponse> search(
            @PathVariable UUID organizationId,
            @Valid @RequestBody SearchRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        SearchResponse response = retrievalService.search(organizationId, principal.userId(), request);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @Operation(summary = "Quick GET search over authorized documents")
    public ResponseEntity<SearchResponse> quickSearch(
            @PathVariable UUID organizationId,
            @RequestParam("q") String query,
            @RequestParam(value = "limit", required = false, defaultValue = "6") int limit,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        SearchRequest request = new SearchRequest(query, limit);
        SearchResponse response = retrievalService.search(organizationId, principal.userId(), request);
        return ResponseEntity.ok(response);
    }
}

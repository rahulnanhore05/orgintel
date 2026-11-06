package io.rahulnanhore.orgintel.retrieval.service.impl;

import io.rahulnanhore.orgintel.common.exception.ForbiddenException;
import io.rahulnanhore.orgintel.document.domain.DocumentChunk;
import io.rahulnanhore.orgintel.document.repository.DocumentChunkRepository;
import io.rahulnanhore.orgintel.document.repository.DocumentPermissionRepository;
import io.rahulnanhore.orgintel.organization.service.MembershipService;
import io.rahulnanhore.orgintel.retrieval.dto.SearchRequest;
import io.rahulnanhore.orgintel.retrieval.dto.SearchResponse;
import io.rahulnanhore.orgintel.retrieval.dto.SearchResult;
import io.rahulnanhore.orgintel.retrieval.service.RetrievalService;
import io.rahulnanhore.orgintel.retrieval.service.RrfFusionService;
import io.rahulnanhore.orgintel.organization.domain.OrgRole;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.Filter;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@Transactional(readOnly = true)
public class RetrievalServiceImpl implements RetrievalService {

    private static final Logger log = LoggerFactory.getLogger(RetrievalServiceImpl.class);

    private final DocumentChunkRepository chunkRepository;
    private final DocumentPermissionRepository permissionRepository;
    private final MembershipService membershipService;
    private final RrfFusionService rrfFusionService;
    private final VectorStore vectorStore;
    private final int keywordLimit;
    private final int vectorLimit;
    private final int defaultFinalContextLimit;

    public RetrievalServiceImpl(
            DocumentChunkRepository chunkRepository,
            DocumentPermissionRepository permissionRepository,
            MembershipService membershipService,
            RrfFusionService rrfFusionService,
            VectorStore vectorStore,
            @Value("${orgintel.retrieval.keyword-limit:20}") int keywordLimit,
            @Value("${orgintel.retrieval.vector-limit:20}") int vectorLimit,
            @Value("${orgintel.retrieval.final-context-limit:6}") int defaultFinalContextLimit) {
        this.chunkRepository = chunkRepository;
        this.permissionRepository = permissionRepository;
        this.membershipService = membershipService;
        this.rrfFusionService = rrfFusionService;
        this.vectorStore = vectorStore;
        this.keywordLimit = keywordLimit;
        this.vectorLimit = vectorLimit;
        this.defaultFinalContextLimit = defaultFinalContextLimit;
    }

    @Override
    public SearchResponse search(UUID organizationId, UUID userId, SearchRequest request) {
        int limit = request.limit() != null && request.limit() > 0 ? request.limit() : defaultFinalContextLimit;
        List<SearchResult> results = executeHybridRetrieval(organizationId, userId, request.query(), limit);
        return new SearchResponse(request.query(), results, results.size());
    }

    @Override
    public List<SearchResult> retrieveContext(UUID organizationId, UUID userId, String query, int limit) {
        int finalLimit = limit > 0 ? limit : defaultFinalContextLimit;
        return executeHybridRetrieval(organizationId, userId, query, finalLimit);
    }

    private List<SearchResult> executeHybridRetrieval(
            UUID organizationId,
            UUID userId,
            String query,
            int limit) {

        if (!membershipService.hasActiveMembership(userId, organizationId)) {
            throw new ForbiddenException("You are not an active member of this organization.");
        }

        boolean isAdmin = membershipService.getUserRole(userId, organizationId)
                .map(r -> r == OrgRole.ORG_ADMIN)
                .orElse(false);

        // 1. Keyword search (PostgreSQL GIN pushdown with tsvector)
        List<DocumentChunk> keywordCandidates = chunkRepository.searchKeyword(
                organizationId, userId, isAdmin, query, keywordLimit
        );

        // 2. Semantic vector search using Spring AI VectorStore with full RBAC & lifecycle filter
        List<DocumentChunk> vectorCandidates = List.of();
        try {
            FilterExpressionBuilder b = new FilterExpressionBuilder();
            FilterExpressionBuilder.Op baseFilter = b.and(
                    b.eq("organizationId", organizationId.toString()),
                    b.eq("status", "ACTIVE")
            );

            Filter.Expression filterExpression;
            if (isAdmin) {
                filterExpression = baseFilter.build();
            } else {
                FilterExpressionBuilder.Op publicDocs = b.eq("visibility", "ORGANIZATION");
                FilterExpressionBuilder.Op myDocs = b.eq("ownerId", userId.toString());
                FilterExpressionBuilder.Op accessOp = b.or(publicDocs, myDocs);

                List<UUID> grantedDocIds = permissionRepository.findGrantedDocumentIds(organizationId, userId);
                if (grantedDocIds != null && !grantedDocIds.isEmpty()) {
                    accessOp = b.or(accessOp, b.in("documentId", grantedDocIds.stream().map(UUID::toString).toArray()));
                }
                filterExpression = b.and(baseFilter, accessOp).build();
            }

            org.springframework.ai.vectorstore.SearchRequest searchRequest =
                    org.springframework.ai.vectorstore.SearchRequest.builder()
                            .query(query)
                            .topK(vectorLimit)
                            .filterExpression(filterExpression)
                            .build();

            List<Document> vectorDocs = vectorStore.similaritySearch(searchRequest);
            if (vectorDocs != null && !vectorDocs.isEmpty()) {
                vectorCandidates = vectorDocs.stream()
                        .map(this::mapVectorDocumentToChunk)
                        .filter(Objects::nonNull)
                        .toList();
            }
        } catch (Exception ex) {
            log.warn("Spring AI VectorStore similarity search exception: {}", ex.getMessage());
        }

        // 3. Reciprocal Rank Fusion on Top-K database results
        return rrfFusionService.fuse(keywordCandidates, vectorCandidates, limit);
    }

    private DocumentChunk mapVectorDocumentToChunk(Document d) {
        if (d == null) {
            return null;
        }
        Map<String, Object> meta = d.getMetadata() != null ? d.getMetadata() : Collections.emptyMap();

        UUID chunkId;
        try {
            chunkId = UUID.fromString(d.getId());
        } catch (Exception e) {
            Object rawChunkId = meta.get("chunkId");
            chunkId = rawChunkId != null ? UUID.fromString(rawChunkId.toString()) : UUID.randomUUID();
        }

        UUID docId = null;
        Object rawDocId = meta.get("documentId");
        if (rawDocId != null) {
            try {
                docId = UUID.fromString(rawDocId.toString());
            } catch (Exception ignored) {}
        }

        String docTitle = meta.get("documentTitle") != null ? meta.get("documentTitle").toString() : "";

        int versionNumber = 1;
        Object rawVersionNumber = meta.get("versionNumber");
        if (rawVersionNumber instanceof Number num) {
            versionNumber = num.intValue();
        } else if (rawVersionNumber != null) {
            try {
                versionNumber = Integer.parseInt(rawVersionNumber.toString());
            } catch (NumberFormatException ignored) {}
        }

        UUID versionId = null;
        Object rawVersionId = meta.get("versionId");
        if (rawVersionId != null) {
            try {
                versionId = UUID.fromString(rawVersionId.toString());
            } catch (Exception ignored) {}
        }

        Integer pageNumber = meta.get("pageNumber") instanceof Number num ? num.intValue() : null;
        String sectionTitle = meta.get("sectionTitle") != null ? meta.get("sectionTitle").toString() : "";
        int chunkIndex = meta.get("chunkIndex") instanceof Number num ? num.intValue() : 0;

        io.rahulnanhore.orgintel.document.domain.Document parentDoc =
                new io.rahulnanhore.orgintel.document.domain.Document();
        parentDoc.setId(docId);
        parentDoc.setTitle(docTitle);

        io.rahulnanhore.orgintel.document.domain.DocumentVersion version =
                new io.rahulnanhore.orgintel.document.domain.DocumentVersion();
        version.setId(versionId);
        version.setVersionNumber(versionNumber);

        return new DocumentChunk(
                chunkId,
                version,
                parentDoc,
                null,
                chunkIndex,
                d.getText() != null ? d.getText() : "",
                null,
                pageNumber,
                sectionTitle
        );
    }
}

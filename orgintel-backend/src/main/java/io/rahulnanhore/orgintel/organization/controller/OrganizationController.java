package io.rahulnanhore.orgintel.organization.controller;

import io.rahulnanhore.orgintel.common.dto.PageResponse;
import io.rahulnanhore.orgintel.common.exception.ForbiddenException;
import io.rahulnanhore.orgintel.identity.config.AuthenticatedUserPrincipal;
import io.rahulnanhore.orgintel.organization.domain.Membership;
import io.rahulnanhore.orgintel.organization.dto.*;
import io.rahulnanhore.orgintel.organization.service.MembershipService;
import io.rahulnanhore.orgintel.organization.service.OrganizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/organizations")
@Tag(name = "Organizations", description = "Endpoints for managing organizations and tenant memberships")
@SecurityRequirement(name = "bearerAuth")
public class OrganizationController {

    private final OrganizationService organizationService;
    private final MembershipService membershipService;

    public OrganizationController(
            OrganizationService organizationService,
            MembershipService membershipService) {
        this.organizationService = organizationService;
        this.membershipService = membershipService;
    }

    @PostMapping
    @Operation(summary = "Create a new organization (creator automatically becomes ORG_ADMIN)")
    public ResponseEntity<OrganizationSummaryResponse> createOrganization(
            @Valid @RequestBody CreateOrganizationRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        OrganizationSummaryResponse response = organizationService.createOrganization(request, principal.userId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "List all organizations the authenticated user belongs to")
    public ResponseEntity<List<OrganizationSummaryResponse>> listOrganizations(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        List<OrganizationSummaryResponse> list = organizationService.listUserOrganizations(principal.userId());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{organizationId}")
    @Operation(summary = "Get details of a specific organization")
    public ResponseEntity<OrganizationSummaryResponse> getOrganization(
            @PathVariable UUID organizationId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        OrganizationSummaryResponse response = organizationService.getOrganization(organizationId, principal.userId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{organizationId}/members")
    @Operation(summary = "List paginated members of an organization")
    public ResponseEntity<PageResponse<MemberResponse>> listMembers(
            @PathVariable UUID organizationId,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        if (!membershipService.hasActiveMembership(principal.userId(), organizationId)) {
            throw new ForbiddenException("You do not belong to the requested organization.");
        }
        Page<MemberResponse> responsePage = membershipService.listMembers(organizationId, pageable);
        return ResponseEntity.ok(PageResponse.from(responsePage));
    }

    @PostMapping("/{organizationId}/members")
    @Operation(summary = "Add a user to an organization (requires ORG_ADMIN)")
    public ResponseEntity<MemberResponse> addMember(
            @PathVariable UUID organizationId,
            @Valid @RequestBody AddMemberRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        Membership membership = membershipService.addMember(
                organizationId,
                request,
                principal.userId()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(MemberResponse.from(membership));
    }

    @PatchMapping("/{organizationId}/members/{userId}/role")
    @Operation(summary = "Update member role (requires ORG_ADMIN)")
    public ResponseEntity<Map<String, String>> updateMemberRole(
            @PathVariable UUID organizationId,
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateRoleRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        membershipService.updateRole(organizationId, userId, request.role(), principal.userId());
        return ResponseEntity.ok(Map.of("message", "Member role updated successfully to " + request.role()));
    }

    @DeleteMapping("/{organizationId}/members/{userId}")
    @Operation(summary = "Remove a user from an organization (requires ORG_ADMIN)")
    public ResponseEntity<Void> removeMember(
            @PathVariable UUID organizationId,
            @PathVariable UUID userId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        membershipService.removeMember(organizationId, userId, principal.userId());
        return ResponseEntity.noContent().build();
    }
}

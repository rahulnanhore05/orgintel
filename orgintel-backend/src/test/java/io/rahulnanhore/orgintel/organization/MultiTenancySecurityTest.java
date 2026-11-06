package io.rahulnanhore.orgintel.organization;

import io.rahulnanhore.orgintel.common.exception.ForbiddenException;
import io.rahulnanhore.orgintel.identity.dto.AuthResponse;
import io.rahulnanhore.orgintel.identity.dto.RegisterRequest;
import io.rahulnanhore.orgintel.identity.service.AuthService;
import io.rahulnanhore.orgintel.organization.domain.Membership;
import io.rahulnanhore.orgintel.organization.domain.OrgRole;
import io.rahulnanhore.orgintel.organization.dto.AddMemberRequest;
import io.rahulnanhore.orgintel.organization.dto.CreateOrganizationRequest;
import io.rahulnanhore.orgintel.organization.dto.OrganizationSummaryResponse;
import io.rahulnanhore.orgintel.organization.service.MembershipService;
import io.rahulnanhore.orgintel.organization.service.OrganizationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MultiTenancySecurityTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private OrganizationService organizationService;

    @Autowired
    private MembershipService membershipService;

    @Test
    void shouldEnforceOrganizationBoundariesAndRolePrivileges() {
        // Register Admin
        AuthResponse adminAuth = authService.register(
                new RegisterRequest("admin@acme.com", "AdminP@ss123", "Acme Admin")
        );
        UUID adminId = adminAuth.user().id();

        // Admin creates Acme Corp
        OrganizationSummaryResponse acmeOrg = organizationService.createOrganization(
                new CreateOrganizationRequest("Acme Corp", "acme-corp"),
                adminId
        );
        assertEquals(OrgRole.ORG_ADMIN, acmeOrg.role());

        // Register Member
        AuthResponse memberAuth = authService.register(
                new RegisterRequest("dev@acme.com", "MemberP@ss123", "Acme Dev")
        );
        UUID memberId = memberAuth.user().id();

        // Admin adds dev as MEMBER using userId
        Membership membership = membershipService.addMember(acmeOrg.id(), memberId, OrgRole.MEMBER, adminId);
        assertNotNull(membership);
        assertEquals(OrgRole.MEMBER, membership.getRole());

        // Register another user and add via email
        authService.register(
                new RegisterRequest("analyst@acme.com", "AnalystP@ss123", "Acme Analyst")
        );
        Membership emailMembership = membershipService.addMember(
                acmeOrg.id(),
                new AddMemberRequest("analyst@acme.com", OrgRole.MEMBER),
                adminId
        );
        assertNotNull(emailMembership);
        assertEquals("analyst@acme.com", emailMembership.getUser().getEmail());
        assertEquals(OrgRole.MEMBER, emailMembership.getRole());

        // Register Outsider
        AuthResponse outsiderAuth = authService.register(
                new RegisterRequest("outsider@rival.com", "RivalP@ss123", "Rival User")
        );
        UUID outsiderId = outsiderAuth.user().id();

        // Verify paginated listMembers works cleanly without LazyInitializationException
        org.springframework.data.domain.Page<io.rahulnanhore.orgintel.organization.dto.MemberResponse> membersPage =
                membershipService.listMembers(acmeOrg.id(), org.springframework.data.domain.PageRequest.of(0, 20));
        assertEquals(3, membersPage.getTotalElements()); // admin, dev, analyst
        assertTrue(membersPage.getContent().stream().anyMatch(m -> "analyst@acme.com".equals(m.email())));
        assertTrue(membersPage.getContent().stream().anyMatch(m -> "dev@acme.com".equals(m.email())));

        // Outsider cannot access Acme Corp
        assertThrows(ForbiddenException.class, () -> organizationService.getOrganization(acmeOrg.id(), outsiderId));

        // Member cannot add members (only ORG_ADMIN can)
        assertThrows(ForbiddenException.class, () -> membershipService.addMember(
                acmeOrg.id(),
                outsiderId,
                OrgRole.MEMBER,
                memberId
        ));
    }
}

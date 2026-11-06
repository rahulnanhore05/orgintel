package io.rahulnanhore.orgintel.organization.repository;

import io.rahulnanhore.orgintel.organization.domain.Membership;
import io.rahulnanhore.orgintel.organization.domain.OrgRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MembershipRepository extends JpaRepository<Membership, UUID> {
    Optional<Membership> findByUserIdAndOrganizationId(UUID userId, UUID organizationId);

    @Query("SELECT m FROM Membership m JOIN FETCH m.organization WHERE m.user.id = :userId")
    List<Membership> findByUserId(@Param("userId") UUID userId);

    @Query(value = "SELECT m FROM Membership m JOIN FETCH m.user WHERE m.organization.id = :organizationId",
           countQuery = "SELECT COUNT(m) FROM Membership m WHERE m.organization.id = :organizationId")
    Page<Membership> findByOrganizationId(@Param("organizationId") UUID organizationId, Pageable pageable);

    boolean existsByUserIdAndOrganizationId(UUID userId, UUID organizationId);

    @Query("SELECT m.role FROM Membership m WHERE m.user.id = :userId AND m.organization.id = :orgId AND m.status = 'ACTIVE'")
    Optional<OrgRole> findActiveRoleByUserIdAndOrgId(@Param("userId") UUID userId, @Param("orgId") UUID orgId);
}

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useOrganization } from '../../hooks/useOrganization';
import { organizationService } from '../../services/organizationService';
import { useNotificationStore } from '../../stores/notificationStore';
import { parseApiError } from '../../utils/errorUtils';
import { formatDateTime } from '../../utils/formatters';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Dialog } from '../../components/ui/Dialog';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  Shield,
  UserPlus,
  Trash2,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export function OrgSettingsPage() {
  const { user } = useAuthStore();
  const { activeOrg, isAdmin } = useOrganization();
  const { addNotification } = useNotificationStore();

  const [members, setMembers] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Add Member Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [newRole, setNewRole] = useState('MEMBER');
  const [addError, setAddError] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  // Remove confirmation modal
  const [removeMemberTarget, setRemoveMemberTarget] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const fetchMembers = useCallback(async (targetPage = 0) => {
    if (!activeOrg?.id || !isAdmin) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await organizationService.listMembers(activeOrg.id, targetPage, 20);
      setMembers(data.content || []);
      setPage(data.page ?? data.number ?? 0);
      setTotalPages(data.totalPages || 1);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      const parsed = parseApiError(err);
      addNotification({
        type: 'error',
        title: 'Error Fetching Members',
        message: parsed.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeOrg?.id, isAdmin, addNotification]);

  useEffect(() => {
    if (activeOrg?.id && isAdmin) {
      fetchMembers(0);
    } else {
      setIsLoading(false);
    }
  }, [activeOrg?.id, isAdmin, fetchMembers]);

  // Handle Add Member
  const handleAddMember = async (e) => {
    e.preventDefault();
    const email = memberEmail.trim();
    if (!email || !activeOrg?.id) return;

    setAddError(null);
    setIsAdding(true);

    try {
      await organizationService.addMember(activeOrg.id, {
        email,
        role: newRole,
      });

      addNotification({
        type: 'success',
        title: 'Member Added',
        message: `${email} successfully added to ${activeOrg.name}.`,
      });

      setIsAddModalOpen(false);
      setMemberEmail('');
      setAddError(null);
      fetchMembers(0);
    } catch (err) {
      const parsed = parseApiError(err);
      setAddError(parsed.message || 'Failed to add member to organization.');
    } finally {
      setIsAdding(false);
    }
  };

  // Handle Update Role
  const handleRoleChange = async (userId, targetRole) => {
    if (!activeOrg?.id) return;
    try {
      await organizationService.updateMemberRole(activeOrg.id, userId, targetRole);
      addNotification({
        type: 'success',
        title: 'Role Updated',
        message: `Member role updated to ${targetRole}.`,
      });
      fetchMembers(page);
    } catch (err) {
      const parsed = parseApiError(err);
      addNotification({
        type: 'error',
        title: 'Role Update Failed',
        message: parsed.message,
      });
    }
  };

  // Handle Remove Member
  const handleRemoveMember = async () => {
    if (!removeMemberTarget || !activeOrg?.id) return;
    setIsRemoving(true);
    try {
      await organizationService.removeMember(activeOrg.id, removeMemberTarget.userId);
      addNotification({
        type: 'info',
        title: 'Member Removed',
        message: `${removeMemberTarget.fullName || 'User'} has been removed from organization.`,
      });
      setRemoveMemberTarget(null);
      fetchMembers(page);
    } catch (err) {
      const parsed = parseApiError(err);
      addNotification({
        type: 'error',
        title: 'Remove Member Failed',
        message: parsed.message,
      });
    } finally {
      setIsRemoving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="page-wrapper">
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <Shield size={36} style={{ color: 'var(--status-danger)', margin: '0 auto var(--space-3) auto' }} />
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Access Denied</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
            Only organization administrators (ORG_ADMIN) have permission to manage members and roles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Organization Settings & Members</h1>
          <p className="page-description">
            Manage tenant membership, assign administrative roles, and maintain organization access.
          </p>
        </div>
        <Button
          variant="primary"
          icon={UserPlus}
          onClick={() => setIsAddModalOpen(true)}
        >
          Add Team Member
        </Button>
      </div>

      {/* Org Overview Card */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--primary-50)',
            color: 'var(--primary-800)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Building2 size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)' }}>
            {activeOrg?.name}
          </h2>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
            Tenant UUID: <code>{activeOrg?.id}</code> &bull; Slug: <code>{activeOrg?.slug || 'none'}</code>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border-light)' }}>
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>Active Members ({totalElements})</h3>
        </div>

        {isLoading ? (
          <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Skeleton height="2.5rem" />
            <Skeleton height="2.5rem" />
          </div>
        ) : members.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            No members found in this organization. Click "Add Team Member" above to invite users by email.
          </div>
        ) : (
          <div className="data-table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const isSelf = m.userId === user?.id;
                  return (
                    <tr key={m.membershipId || m.userId || m.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {m.fullName || 'Member'} {isSelf && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--primary-800)', fontWeight: 500 }}>(You)</span>}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          ID: {m.userId}
                        </div>
                      </td>
                      <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        {m.email}
                      </td>
                      <td>
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                          className="form-select"
                          style={{ padding: '0.25rem 0.5rem', fontSize: 'var(--text-xs)' }}
                          disabled={isSelf}
                          title={isSelf ? "You cannot modify your own administrator role" : undefined}
                        >
                          <option value="MEMBER">MEMBER</option>
                          <option value="ORG_ADMIN">ORG_ADMIN</option>
                        </select>
                      </td>
                      <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {formatDateTime(m.joinedAt)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {!isSelf && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setRemoveMemberTarget(m)}
                            style={{ color: 'var(--status-danger-text)' }}
                            title="Remove member"
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div
            style={{
              padding: 'var(--space-3) var(--space-5)',
              borderTop: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-surface-muted)',
            }}
          >
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Page {page + 1} of {totalPages}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button
                size="sm"
                variant="secondary"
                disabled={page === 0}
                onClick={() => fetchMembers(page - 1)}
                icon={ChevronLeft}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= totalPages - 1}
                onClick={() => fetchMembers(page + 1)}
                icon={ChevronRight}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => {
          if (!isAdding) {
            setIsAddModalOpen(false);
            setAddError(null);
            setMemberEmail('');
          }
        }}
        title="Add Member to Organization"
        description="Add a registered user to this organization by entering their work email."
      >
        {addError && (
          <div
            style={{
              padding: 'var(--space-3)',
              backgroundColor: 'var(--status-danger-bg)',
              border: '1px solid var(--status-danger-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--status-danger-text)',
              fontSize: 'var(--text-xs)',
              marginBottom: 'var(--space-4)',
            }}
          >
            {addError}
          </div>
        )}

        <form onSubmit={handleAddMember}>
          <Input
            label="User Work Email"
            type="email"
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
            placeholder="colleague@company.com"
            hint="Enter user's registered work email (they must create an account first)"
            required
            autoFocus
          />

          <div className="form-group">
            <label className="form-label">Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="form-select"
            >
              <option value="MEMBER">MEMBER (Can view documents & ask questions)</option>
              <option value="ORG_ADMIN">ORG_ADMIN (Full workspace administrative privileges)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-5)' }}>
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)} disabled={isAdding}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isAdding} icon={UserPlus}>
              Add to Organization
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Remove Confirmation Modal */}
      <Dialog
        isOpen={!!removeMemberTarget}
        onClose={() => !isRemoving && setRemoveMemberTarget(null)}
        title="Remove Member"
        description="Confirm removal of user from organization."
      >
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
          Are you sure you want to remove <strong>{removeMemberTarget?.fullName || removeMemberTarget?.email}</strong> from {activeOrg?.name}?
          They will immediately lose access to organization documents and conversations.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="secondary" onClick={() => setRemoveMemberTarget(null)} disabled={isRemoving}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleRemoveMember} isLoading={isRemoving} icon={Trash2}>
            Confirm Remove
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

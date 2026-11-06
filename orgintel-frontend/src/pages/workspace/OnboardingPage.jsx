import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useOrganization } from '../../hooks/useOrganization';
import { organizationService } from '../../services/organizationService';
import { useNotificationStore } from '../../stores/notificationStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ROUTES } from '../../app/routes';
import {
  Building2,
  Plus,
  Mail,
  RefreshCw,
  Copy,
  Check,
  LogOut,
  UserCheck,
} from 'lucide-react';

export function OnboardingPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const { userOrgs, switchOrganization, createOrganization, setUserOrgs, setActiveOrg } = useOrganization();
  const { addNotification } = useNotificationStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(userOrgs.length > 0 ? 'create' : 'join');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleRefreshWorkspaces = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const orgs = await organizationService.list();
      setUserOrgs(orgs);
      if (orgs && orgs.length > 0) {
        setActiveOrg(orgs[0]);
        addNotification({
          type: 'success',
          title: 'Organization Found!',
          message: `Entering workspace: ${orgs[0].name}`,
        });
        navigate(ROUTES.DOCUMENTS);
      } else if (!silent) {
        addNotification({
          type: 'info',
          title: 'No Workspaces Found',
          message: `No active memberships found for ${user?.email || 'your email'}. Ask your admin to add you.`,
        });
      }
    } catch (err) {
      if (!silent) {
        addNotification({
          type: 'error',
          title: 'Check Failed',
          message: err.message || 'Could not verify organizations.',
        });
      }
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, [setUserOrgs, setActiveOrg, addNotification, navigate, user?.email]);

  useEffect(() => {
    if (!isAuthenticated) return;
    // Check immediately on mount in case user was added right before loading
    handleRefreshWorkspaces(true);

    // Auto-poll every 5 seconds while user is waiting in onboarding
    const interval = setInterval(() => {
      handleRefreshWorkspaces(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAuthenticated, handleRefreshWorkspaces]);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Organization name is required');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await createOrganization({
        name: name.trim(),
        slug: slug.trim() || undefined,
      });
      navigate(ROUTES.DOCUMENTS);
    } catch (err) {
      setError(err.message || 'Failed to create organization');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOrg = (org) => {
    switchOrganization(org);
    navigate(ROUTES.DOCUMENTS);
  };

  const handleCopyEmail = () => {
    if (!user?.email) return;
    navigator.clipboard?.writeText(user.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="card" style={{ padding: 'var(--space-8)' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--primary-50)',
            color: 'var(--primary-800)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-3) auto',
          }}
        >
          <Building2 size={24} />
        </div>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
          Welcome to OrgIntel
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
          {user?.fullName ? `${user.fullName} (${user.email})` : user?.email}
        </p>
      </div>

      {/* Existing Organizations if any */}
      {userOrgs.length > 0 && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>
            Your Workspaces ({userOrgs.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {userOrgs.map((org) => (
              <div
                key={org.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-surface-muted)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                    {org.name}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Role: {org.role}
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => handleSelectOrg(org)}>
                  Enter Workspace
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-light)',
          marginBottom: 'var(--space-5)',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('join')}
          style={{
            flex: 1,
            padding: 'var(--space-2) var(--space-3)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: activeTab === 'join' ? 'var(--primary-800)' : 'var(--text-muted)',
            borderBottom: activeTab === 'join' ? '2px solid var(--primary-800)' : '2px solid transparent',
            marginBottom: -1,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
          }}
        >
          Join via Invitation
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('create')}
          style={{
            flex: 1,
            padding: 'var(--space-2) var(--space-3)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: activeTab === 'create' ? 'var(--primary-800)' : 'var(--text-muted)',
            borderBottom: activeTab === 'create' ? '2px solid var(--primary-800)' : '2px solid transparent',
            marginBottom: -1,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
          }}
        >
          Create New Workspace
        </button>
      </div>

      {/* Tab 1: Waiting Room / Join via Invitation */}
      {activeTab === 'join' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div
            style={{
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-light)',
              fontSize: 'var(--text-xs)',
              lineHeight: 1.6,
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', color: 'var(--primary-800)', fontWeight: 600 }}>
              <UserCheck size={16} />
              <span>Waiting to be added to an organization?</span>
            </div>
            <p>
              Your personal account has been created without needing to create an organization. To collaborate on documents, share your registered work email with your team administrator.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-sm)',
              border: '1px dashed var(--border-medium)',
              backgroundColor: 'var(--bg-app)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', overflow: 'hidden' }}>
              <Mail size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.email}
              </span>
            </div>
            <button
              onClick={handleCopyEmail}
              className="btn-ghost"
              style={{
                fontSize: 'var(--text-xs)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: copiedEmail ? 'var(--status-success)' : 'var(--primary-800)',
                padding: '4px 8px',
              }}
              title="Copy email to clipboard"
            >
              {copiedEmail ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <Button
            variant="primary"
            onClick={handleRefreshWorkspaces}
            isLoading={isRefreshing}
            icon={RefreshCw}
            style={{ width: '100%', marginTop: 'var(--space-2)' }}
          >
            Check for Invitations / Refresh
          </Button>
        </div>
      )}

      {/* Tab 2: Create Organization Form */}
      {activeTab === 'create' && (
        <div>
          {error && (
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
              role="alert"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} noValidate>
            <Input
              label="Organization Name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
              }}
              placeholder="e.g. Acme Legal Corp"
              hint="You will be assigned as ORG_ADMIN"
              required
              autoFocus
            />

            <Input
              label="Workspace Identifier (Slug)"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. acme-legal"
              hint="Used for tenant domain and isolation"
            />

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              style={{ width: '100%', marginTop: 'var(--space-3)' }}
              icon={Plus}
            >
              Create Workspace & Enter
            </Button>
          </form>
        </div>
      )}

      {/* Sign Out Action */}
      <div
        style={{
          marginTop: 'var(--space-6)',
          paddingTop: 'var(--space-4)',
          borderTop: '1px solid var(--border-light)',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <button
          onClick={logout}
          className="btn-ghost"
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <LogOut size={14} />
          <span>Sign Out of Account</span>
        </button>
      </div>
    </div>
  );
}

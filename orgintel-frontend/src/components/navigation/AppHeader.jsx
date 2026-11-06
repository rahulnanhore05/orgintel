import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useOrganization } from '../../hooks/useOrganization';
import {
  Building2,
  ChevronDown,
  LogOut,
  User,
  Shield,
  Menu,
} from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../app/routes';
import orgIntelLogo from '../../assets/OrgIntelLogo.png';

export function AppHeader() {
  const { user, logout } = useAuth();
  const { activeOrg, userOrgs, switchOrganization } = useOrganization();
  const { toggleSidebar } = useUiStore();
  const navigate = useNavigate();

  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const orgDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target)) {
        setIsOrgDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOrgDropdownOpen(false);
        setIsUserDropdownOpen(false);
      }
    }

    if (isOrgDropdownOpen || isUserDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOrgDropdownOpen, isUserDropdownOpen]);

  return (
    <header
      style={{
        height: 'var(--header-height)',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-6)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Left: Hamburger & Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <button
          onClick={toggleSidebar}
          className="btn-ghost"
          style={{ padding: '6px', borderRadius: 'var(--radius-sm)' }}
          aria-label="Toggle navigation sidebar"
        >
          <Menu size={20} />
        </button>

        <div
          onClick={() => navigate(ROUTES.DOCUMENTS)}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}
          aria-label="Go to Documents Dashboard"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              navigate(ROUTES.DOCUMENTS);
            }
          }}
        >
          <img
            src={orgIntelLogo}
            alt="OrgIntel Logo"
            style={{
              height: '32px',
              width: 'auto',
              display: 'block',
              objectFit: 'contain',
            }}
          />
        </div>
      </div>

      {/* Right: Workspace Selector, Health Indicator, User Menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        {/* Workspace Organization Switcher */}
        {activeOrg && (
          <div ref={orgDropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setIsOrgDropdownOpen(!isOrgDropdownOpen);
                setIsUserDropdownOpen(false);
              }}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
              aria-haspopup="true"
              aria-expanded={isOrgDropdownOpen}
            >
              <Building2 size={14} style={{ color: 'var(--primary-700)' }} />
              <span style={{ fontWeight: 600, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeOrg.name}
              </span>
              {activeOrg.role === 'ORG_ADMIN' && (
                <Shield size={12} style={{ color: 'var(--primary-600)' }} title="Organization Admin" />
              )}
            </button>

            {isOrgDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  width: 220,
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  border: '1px solid var(--border-light)',
                  padding: 'var(--space-2)',
                  zIndex: 100,
                }}
              >
                <div style={{ padding: 'var(--space-2)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Your Workspaces
                </div>
                {userOrgs.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      switchOrganization(org);
                      setIsOrgDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 'var(--text-sm)',
                      color: org.id === activeOrg.id ? 'var(--primary-800)' : 'var(--text-secondary)',
                      backgroundColor: org.id === activeOrg.id ? 'var(--primary-50)' : 'transparent',
                      fontWeight: org.id === activeOrg.id ? 600 : 400,
                      cursor: 'pointer',
                      border: 'none',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {org.name}
                    </span>
                    {org.role === 'ORG_ADMIN' && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Admin</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* User Menu */}
        <div ref={userDropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setIsUserDropdownOpen(!isUserDropdownOpen);
              setIsOrgDropdownOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-medium)',
              background: 'var(--bg-surface)',
            }}
            aria-haspopup="true"
            aria-expanded={isUserDropdownOpen}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: 'var(--bg-surface-active)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
              }}
            >
              <User size={14} />
            </div>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>
              {user?.fullName?.split(' ')[0] || user?.email || 'Account'}
            </span>
            <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          </button>

          {isUserDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                width: 200,
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border-light)',
                padding: 'var(--space-2)',
                zIndex: 100,
              }}
            >
              <div style={{ padding: 'var(--space-2)', borderBottom: '1px solid var(--border-light)', marginBottom: 'var(--space-2)' }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                  {user?.fullName || 'User'}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.email}
                </div>
              </div>
              <button
                onClick={() => {
                  setIsUserDropdownOpen(false);
                  logout();
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--status-danger-text)',
                }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

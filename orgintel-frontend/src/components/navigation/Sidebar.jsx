import { NavLink } from 'react-router-dom';
import { useUiStore } from '../../stores/uiStore';
import { useOrganization } from '../../hooks/useOrganization';
import { ROUTES } from '../../app/routes';
import {
  Files,
  Search,
  MessageSquare,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const { activeOrg, isAdmin } = useOrganization();

  const navItems = [
    { label: 'Documents', path: ROUTES.DOCUMENTS, icon: Files },
    { label: 'Hybrid Search', path: ROUTES.SEARCH, icon: Search },
    { label: 'Grounded QA', path: ROUTES.CHAT, icon: MessageSquare },
  ];

  if (isAdmin) {
    navItems.push({ label: 'Organization', path: ROUTES.SETTINGS, icon: Settings });
  }

  return (
    <aside
      style={{
        width: sidebarCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-light)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'width var(--transition-normal)',
        overflowX: 'hidden',
        zIndex: 40,
      }}
    >
      {/* Top: Nav Links */}
      <div style={{ padding: 'var(--space-4) var(--space-3)' }}>
        {!sidebarCollapsed && activeOrg && (
          <div
            style={{
              padding: 'var(--space-2) var(--space-3)',
              marginBottom: 'var(--space-4)',
              background: 'var(--bg-surface-muted)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-light)',
            }}
          >
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Active Workspace
            </div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeOrg.name}
            </div>
          </div>
        )}

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--primary-800)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--primary-50)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'background-color var(--transition-fast)',
                })}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Collapse Button & Security Tag */}
      <div style={{ padding: 'var(--space-3)', borderTop: '1px solid var(--border-light)' }}>
        {!sidebarCollapsed && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
              marginBottom: 'var(--space-3)',
              padding: '0 var(--space-2)',
            }}
          >
            <ShieldCheck size={14} style={{ color: 'var(--status-success)' }} />
            <span>Passage Grounding Active</span>
          </div>
        )}

        <button
          onClick={toggleSidebar}
          className="btn-ghost"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'space-between',
            padding: 'var(--space-2)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-muted)',
            fontSize: 'var(--text-xs)',
          }}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {!sidebarCollapsed && <span>Collapse Sidebar</span>}
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}

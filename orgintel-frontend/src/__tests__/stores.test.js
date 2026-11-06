import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../stores/authStore';
import { useOrgStore } from '../stores/orgStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useUiStore } from '../stores/uiStore';

describe('Zustand Stores', () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
    useOrgStore.getState().clearOrgState();
    useNotificationStore.getState().clearAll();
    useUiStore.setState({ sidebarCollapsed: false, activeCitation: null, isCitationDrawerOpen: false });
  });

  describe('authStore', () => {
    it('initializes with unauthenticated session', () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
    });

    it('sets session correctly upon login', () => {
      const authPayload = {
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        tokenType: 'Bearer',
        expiresInSeconds: 3600,
        user: {
          id: 'user-uuid-1',
          email: 'jane@example.com',
          fullName: 'Jane Doe',
        },
      };

      useAuthStore.getState().setSession(authPayload);
      const state = useAuthStore.getState();

      expect(state.isAuthenticated).toBe(true);
      expect(state.accessToken).toBe('access-123');
      expect(state.refreshToken).toBe('refresh-456');
      expect(state.user.email).toBe('jane@example.com');
    });

    it('updates tokens on refresh rotation', () => {
      useAuthStore.getState().setSession({
        accessToken: 'old-access',
        refreshToken: 'old-refresh',
        user: { id: 'u1', email: 'test@example.com', fullName: 'Test' },
      });

      useAuthStore.getState().updateTokens('new-access', 'new-refresh');
      const state = useAuthStore.getState();

      expect(state.accessToken).toBe('new-access');
      expect(state.refreshToken).toBe('new-refresh');
      expect(state.isAuthenticated).toBe(true);
    });

    it('clears session completely on logout', () => {
      useAuthStore.getState().setSession({
        accessToken: 'tok',
        refreshToken: 'ref',
        user: { id: 'u1', email: 'test@example.com', fullName: 'Test' },
      });

      useAuthStore.getState().clearSession();
      const state = useAuthStore.getState();

      expect(state.isAuthenticated).toBe(false);
      expect(state.accessToken).toBeNull();
      expect(state.user).toBeNull();
    });
  });

  describe('orgStore', () => {
    it('sets active organization and preserves role', () => {
      const org = {
        id: 'org-uuid-1',
        name: 'Acme Intelligence',
        slug: 'acme',
        role: 'ORG_ADMIN',
      };

      useOrgStore.getState().setActiveOrg(org);
      expect(useOrgStore.getState().activeOrg.name).toBe('Acme Intelligence');
      expect(useOrgStore.getState().activeOrg.role).toBe('ORG_ADMIN');
    });

    it('auto-selects first organization if none active', () => {
      const orgs = [
        { id: 'org-1', name: 'Org One', role: 'MEMBER' },
        { id: 'org-2', name: 'Org Two', role: 'ORG_ADMIN' },
      ];

      useOrgStore.getState().setUserOrgs(orgs);
      expect(useOrgStore.getState().activeOrg.id).toBe('org-1');
    });

    it('clears organization state on workspace exit', () => {
      useOrgStore.getState().setActiveOrg({ id: 'org-1', name: 'Org' });
      useOrgStore.getState().clearOrgState();

      expect(useOrgStore.getState().activeOrg).toBeNull();
      expect(useOrgStore.getState().userOrgs).toEqual([]);
    });
  });

  describe('notificationStore', () => {
    it('queues notification and dismisses by id', () => {
      const id = useNotificationStore.getState().addNotification({
        type: 'success',
        title: 'Uploaded',
        message: 'File ready',
        durationMs: 0,
      });

      expect(useNotificationStore.getState().notifications.length).toBe(1);
      expect(useNotificationStore.getState().notifications[0].title).toBe('Uploaded');

      useNotificationStore.getState().dismissNotification(id);
      expect(useNotificationStore.getState().notifications.length).toBe(0);
    });
  });

  describe('uiStore', () => {
    it('toggles sidebar and opens citation drawer', () => {
      expect(useUiStore.getState().sidebarCollapsed).toBe(false);
      useUiStore.getState().toggleSidebar();
      expect(useUiStore.getState().sidebarCollapsed).toBe(true);

      const citation = {
        citationOrder: 1,
        sourceLocation: 'Doc 1, p. 5',
        quotedText: 'Evidence snippet',
      };

      useUiStore.getState().openCitation(citation);
      expect(useUiStore.getState().isCitationDrawerOpen).toBe(true);
      expect(useUiStore.getState().activeCitation.citationOrder).toBe(1);

      useUiStore.getState().closeCitation();
      expect(useUiStore.getState().isCitationDrawerOpen).toBe(false);
    });
  });
});

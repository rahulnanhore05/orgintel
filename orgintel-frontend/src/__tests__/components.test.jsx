import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ProcessingStatusBadge, VisibilityBadge } from '../components/documents/DocumentStatusBadge';
import { CitationBadge } from '../components/chat/CitationBadge';
import { useUiStore } from '../stores/uiStore';

describe('UI Primitives and Feature Components', () => {
  describe('Button', () => {
    it('renders text and handles clicks', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Execute Query</Button>);

      const btn = screen.getByRole('button', { name: /Execute Query/i });
      expect(btn).toBeDefined();

      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('disables button when isLoading is true', () => {
      render(<Button isLoading>Submitting</Button>);
      const btn = screen.getByRole('button');
      expect(btn.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('Input', () => {
    it('renders label, input, and error messages with ARIA attributes', () => {
      render(
        <Input
          label="Email Address"
          name="email"
          error="Invalid email format"
          value="invalid"
          onChange={() => {}}
        />
      );

      expect(screen.getByLabelText(/Email Address/i)).toBeDefined();
      const errorMsg = screen.getByRole('alert');
      expect(errorMsg.textContent).toBe('Invalid email format');
    });
  });

  describe('DocumentStatusBadge', () => {
    it('renders Ready for COMPLETED state', () => {
      render(<ProcessingStatusBadge state="COMPLETED" />);
      expect(screen.getByText('Ready')).toBeDefined();
    });

    it('renders Processing for PROCESSING state', () => {
      render(<ProcessingStatusBadge state="PROCESSING" />);
      expect(screen.getByText('Processing')).toBeDefined();
    });

    it('renders Failed for FAILED state', () => {
      render(<ProcessingStatusBadge state="FAILED" />);
      expect(screen.getByText('Failed')).toBeDefined();
    });
  });

  describe('VisibilityBadge', () => {
    it('renders Restricted for RESTRICTED visibility', () => {
      render(<VisibilityBadge visibility="RESTRICTED" />);
      expect(screen.getByText('Restricted')).toBeDefined();
    });

    it('renders Organization for ORGANIZATION visibility', () => {
      render(<VisibilityBadge visibility="ORGANIZATION" />);
      expect(screen.getByText('Organization')).toBeDefined();
    });
  });

  describe('CitationBadge', () => {
    it('opens CitationDrawer in uiStore when clicked', () => {
      const citation = {
        citationOrder: 1,
        sourceLocation: 'Q3 Report, p. 14',
        quotedText: 'Revenue increased 18.5%',
      };

      render(<CitationBadge order={1} citation={citation} />);
      const badge = screen.getByRole('button', { name: /View citation source 1/i });

      fireEvent.click(badge);
      expect(useUiStore.getState().isCitationDrawerOpen).toBe(true);
      expect(useUiStore.getState().activeCitation.sourceLocation).toBe('Q3 Report, p. 14');
    });
  });

  describe('LoginPage Form & Validation', () => {
    it('validates required fields and trims email on submit', async () => {
      const { LoginPage } = await import('../pages/auth/LoginPage');
      const { authService } = await import('../services/authService');
      const { organizationService } = await import('../services/organizationService');
      const { MemoryRouter } = await import('react-router-dom');

      vi.spyOn(authService, 'login').mockResolvedValue({
        accessToken: 'mock-access',
        refreshToken: 'mock-refresh',
        user: { id: 'u1', email: 'test@example.com', fullName: 'Test User' },
        activeOrganization: null,
      });
      vi.spyOn(organizationService, 'list').mockResolvedValue([]);

      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );

      const submitBtn = screen.getByRole('button', { name: /Sign In/i });
      fireEvent.click(submitBtn);

      // Expect validation errors
      expect(await screen.findByText('Email is required')).toBeDefined();
      expect(await screen.findByText('Password is required')).toBeDefined();

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: '  user@company.com  ' } });
        fireEvent.change(passwordInput, { target: { value: 'Secret123!' } });
        fireEvent.click(submitBtn);
      });

      await vi.waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith({
          email: 'user@company.com',
          password: 'Secret123!',
        });
      });
    });
  });

  describe('AppHeader Dropdowns & Outside Click', () => {
    it('opens dropdown and closes when clicking outside or pressing Escape', async () => {
      const { AppHeader } = await import('../components/navigation/AppHeader');
      const { MemoryRouter } = await import('react-router-dom');
      const { useOrgStore } = await import('../stores/orgStore');
      const { useAuthStore } = await import('../stores/authStore');

      // Set up store state
      useOrgStore.setState({
        activeOrg: { id: 'org-1', name: 'Acme Corp', role: 'ORG_ADMIN' },
        userOrgs: [
          { id: 'org-1', name: 'Acme Corp', role: 'ORG_ADMIN' },
          { id: 'org-2', name: 'Beta Ltd', role: 'ORG_MEMBER' },
        ],
      });
      useAuthStore.setState({
        user: { id: 'u1', fullName: 'Alice Smith', email: 'alice@example.com' },
        isAuthenticated: true,
      });

      render(
        <MemoryRouter>
          <div data-testid="outside-area" style={{ padding: 20 }}>
            <AppHeader />
          </div>
        </MemoryRouter>
      );

      // Verify org switcher button exists
      const orgBtn = screen.getByRole('button', { name: /Acme Corp/i });
      expect(orgBtn).toBeDefined();

      // Dropdown should not be open initially
      expect(screen.queryByText('Your Workspaces')).toBeNull();

      // Click to open org dropdown
      fireEvent.click(orgBtn);
      expect(screen.getByText('Your Workspaces')).toBeDefined();
      expect(screen.getByText('Beta Ltd')).toBeDefined();

      // Click outside the dropdown
      const outsideArea = screen.getByTestId('outside-area');
      fireEvent.mouseDown(outsideArea);

      // Dropdown should now be closed
      expect(screen.queryByText('Your Workspaces')).toBeNull();

      // Open org dropdown again and test Escape key
      fireEvent.click(orgBtn);
      expect(screen.getByText('Your Workspaces')).toBeDefined();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByText('Your Workspaces')).toBeNull();

      // Test User Menu outside click
      const userBtn = screen.getByRole('button', { name: /Alice/i });
      fireEvent.click(userBtn);
      expect(screen.getByRole('button', { name: /Sign Out/i })).toBeDefined();

      // Click outside user menu
      fireEvent.mouseDown(outsideArea);
      expect(screen.queryByRole('button', { name: /Sign Out/i })).toBeNull();
    });
  });

  describe('Enterprise LandingPage', () => {
    it('renders hero, enterprise navigation, capabilities, and dynamic auth CTA', async () => {
      const { LandingPage } = await import('../pages/landing/LandingPage');
      const { MemoryRouter } = await import('react-router-dom');
      const { useAuthStore } = await import('../stores/authStore');

      // Unauthenticated state
      useAuthStore.setState({ isAuthenticated: false, user: null });

      const { rerender } = render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      // Verify brand, hero headline, and unauthenticated CTAs
      expect(screen.getAllByAltText(/OrgIntel Logo/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Enterprise Document Intelligence Backed by/i)).toBeDefined();
      expect(screen.getByText(/Start Enterprise Free Trial/i)).toBeDefined();
      expect(screen.getAllByRole('button', { name: /^Sign In$/i }).length).toBeGreaterThanOrEqual(1);

      // Verify core enterprise capabilities and security matrix
      expect(screen.getAllByText(/Deterministic Abstention/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Hybrid RRF Retrieval/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Multi-Tenant Isolation/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Compliance/i).length).toBeGreaterThanOrEqual(1);

      // Authenticated state
      act(() => {
        useAuthStore.setState({
          isAuthenticated: true,
          user: { id: 'u1', fullName: 'Executive Officer', email: 'exec@corp.com' },
        });
      });

      rerender(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      // Verify CTA dynamically shifts to "Go to Workspace"
      expect(screen.getByRole('button', { name: /Go to Workspace/i })).toBeDefined();
      expect(screen.getByText(/Launch Workspace Console/i)).toBeDefined();
    });
  });
});

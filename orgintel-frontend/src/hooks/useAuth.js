import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useOrgStore } from '../stores/orgStore';
import { useNotificationStore } from '../stores/notificationStore';
import { authService } from '../services/authService';
import { organizationService } from '../services/organizationService';
import { parseApiError } from '../utils/errorUtils';
import { ROUTES } from '../app/routes';

export function useAuth() {
  const navigate = useNavigate();
  const { user, accessToken, isAuthenticated, isInitialized, setSession, clearSession } = useAuthStore();
  const { activeOrg, setActiveOrg, setUserOrgs, clearOrgState } = useOrgStore();
  const { addNotification } = useNotificationStore();

  const login = async (credentials) => {
    try {
      clearOrgState();
      const response = await authService.login(credentials);
      setSession(response);

      if (response.activeOrganization) {
        setActiveOrg(response.activeOrganization);
      }

      // Fetch user's organizations
      try {
        const orgs = await organizationService.list();
        setUserOrgs(orgs);
        if (!response.activeOrganization && orgs.length > 0) {
          setActiveOrg(orgs[0]);
          navigate(ROUTES.DOCUMENTS);
          return response;
        }
      } catch {
        // If org fetch fails, user will proceed to onboarding if needed
      }

      if (response.activeOrganization || (useOrgStore.getState().userOrgs?.length > 0)) {
        navigate(ROUTES.DOCUMENTS);
      } else {
        navigate(ROUTES.ONBOARDING);
      }

      addNotification({
        type: 'success',
        title: 'Signed in successfully',
        message: `Welcome back, ${response.user?.fullName || 'User'}!`,
      });

      return response;
    } catch (err) {
      const parsed = parseApiError(err);
      addNotification({
        type: 'error',
        title: 'Authentication Failed',
        message: parsed.message,
      });
      throw parsed;
    }
  };

  const register = async (data) => {
    try {
      const response = await authService.register(data);
      setSession(response);

      addNotification({
        type: 'success',
        title: 'Account Created',
        message: 'Your account has been registered successfully.',
      });

      // New users don't have an org yet, direct them to onboarding
      navigate(ROUTES.ONBOARDING);
      return response;
    } catch (err) {
      const parsed = parseApiError(err);
      addNotification({
        type: 'error',
        title: 'Registration Failed',
        message: parsed.message,
      });
      throw parsed;
    }
  };

  const logout = async () => {
    const { refreshToken } = useAuthStore.getState();
    try {
      if (refreshToken) {
        await authService.logout({ refreshToken });
      }
    } catch {
      // Proceed with local logout regardless of network status
    } finally {
      clearSession();
      clearOrgState();
      navigate(ROUTES.LOGIN);
      addNotification({
        type: 'info',
        title: 'Signed Out',
        message: 'You have been safely signed out.',
      });
    }
  };

  return {
    user,
    accessToken,
    isAuthenticated,
    isInitialized,
    activeOrg,
    login,
    register,
    logout,
  };
}

import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useOrgStore } from '../stores/orgStore';
import { organizationService } from '../services/organizationService';
import { ROUTES } from '../app/routes';
import { Loader2 } from 'lucide-react';

export function WorkspaceLayout() {
  const { isAuthenticated } = useAuthStore();
  const { activeOrg, userOrgs, setUserOrgs, setActiveOrg } = useOrgStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated) {
      organizationService.list()
        .then((orgs) => {
          if (!isMounted) return;
          setUserOrgs(orgs);
          const currentActive = useOrgStore.getState().activeOrg;
          if (orgs.length > 0) {
            const matching = currentActive ? orgs.find((o) => o.id === currentActive.id) : null;
            setActiveOrg(matching || orgs[0]);
          } else {
            setActiveOrg(null);
          }
          setLoading(false);
        })
        .catch(() => {
          if (isMounted) setLoading(false);
        });
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, setUserOrgs, setActiveOrg]);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)', color: 'var(--text-muted)' }}>
        <Loader2 className="spinner" size={24} />
        <span>Loading workspace context...</span>
      </div>
    );
  }

  if (!activeOrg && userOrgs.length === 0) {
    return <Navigate to={ROUTES.ONBOARDING} replace />;
  }

  return <Outlet />;
}

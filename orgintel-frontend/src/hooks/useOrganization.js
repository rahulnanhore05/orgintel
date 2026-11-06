import { useCallback } from 'react';
import { useOrgStore } from '../stores/orgStore';
import { organizationService } from '../services/organizationService';
import { useNotificationStore } from '../stores/notificationStore';
import { parseApiError } from '../utils/errorUtils';

export function useOrganization() {
  const { activeOrg, userOrgs, isLoadingOrgs, setActiveOrg, setUserOrgs, setLoadingOrgs } = useOrgStore();
  const { addNotification } = useNotificationStore();

  const fetchUserOrgs = useCallback(async () => {
    setLoadingOrgs(true);
    try {
      const orgs = await organizationService.list();
      setUserOrgs(orgs);
      return orgs;
    } catch (err) {
      const parsed = parseApiError(err);
      addNotification({
        type: 'error',
        title: 'Workspace Error',
        message: parsed.message,
      });
      return [];
    } finally {
      setLoadingOrgs(false);
    }
  }, [setUserOrgs, setLoadingOrgs, addNotification]);

  const switchOrganization = useCallback((orgOrId) => {
    let targetOrg = orgOrId;
    if (typeof orgOrId === 'string') {
      const found = (useOrgStore.getState().userOrgs || []).find((o) => o.id === orgOrId);
      targetOrg = found || { id: orgOrId, name: 'Workspace' };
    }
    setActiveOrg(targetOrg);
    addNotification({
      type: 'info',
      title: 'Workspace Switched',
      message: `Active organization changed to ${targetOrg?.name || 'Workspace'}.`,
    });
  }, [setActiveOrg, addNotification]);

  const createOrganization = useCallback(async (data) => {
    try {
      const newOrg = await organizationService.create(data);
      const updatedList = [...(useOrgStore.getState().userOrgs || []), newOrg];
      setUserOrgs(updatedList);
      setActiveOrg(newOrg);
      addNotification({
        type: 'success',
        title: 'Organization Created',
        message: `Workspace "${newOrg.name}" initialized successfully.`,
      });
      return newOrg;
    } catch (err) {
      const parsed = parseApiError(err);
      addNotification({
        type: 'error',
        title: 'Could Not Create Organization',
        message: parsed.message,
      });
      throw parsed;
    }
  }, [setUserOrgs, setActiveOrg, addNotification]);

  const isAdmin = activeOrg?.role === 'ORG_ADMIN';

  return {
    activeOrg,
    userOrgs,
    isLoadingOrgs,
    isAdmin,
    setActiveOrg,
    setUserOrgs,
    fetchUserOrgs,
    switchOrganization,
    createOrganization,
  };
}

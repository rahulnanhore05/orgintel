import { create } from 'zustand';

const ACTIVE_ORG_KEY = 'orgintel_active_org';

export const useOrgStore = create((set, get) => ({
  activeOrg: JSON.parse(sessionStorage.getItem(ACTIVE_ORG_KEY) || 'null'),
  userOrgs: [],
  isLoadingOrgs: false,

  setUserOrgs: (userOrgs) => {
    set({ userOrgs });
    const currentActive = get().activeOrg;

    // If activeOrg is not yet set or not in current list, select first available
    if ((!currentActive || !userOrgs.some((o) => o.id === currentActive.id)) && userOrgs.length > 0) {
      get().setActiveOrg(userOrgs[0]);
    }
  },

  setActiveOrg: (org) => {
    if (org) {
      sessionStorage.setItem(ACTIVE_ORG_KEY, JSON.stringify(org));
    } else {
      sessionStorage.removeItem(ACTIVE_ORG_KEY);
    }
    set({ activeOrg: org });
  },

  clearOrgState: () => {
    sessionStorage.removeItem(ACTIVE_ORG_KEY);
    set({ activeOrg: null, userOrgs: [], isLoadingOrgs: false });
  },

  setLoadingOrgs: (isLoadingOrgs) => set({ isLoadingOrgs }),
}));

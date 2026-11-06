import { create } from 'zustand';

export const useUiStore = create((set) => ({
  sidebarCollapsed: false,
  activeCitation: null,
  isCitationDrawerOpen: false,

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  openCitation: (citation) => {
    set({
      activeCitation: citation,
      isCitationDrawerOpen: true,
    });
  },

  closeCitation: () => {
    set({
      activeCitation: null,
      isCitationDrawerOpen: false,
    });
  },
}));

import { create } from 'zustand';

export const useNotificationStore = create((set) => ({
  notifications: [],

  addNotification: ({ type = 'info', title, message, durationMs = 5000 }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const notification = { id, type, title, message, durationMs };

    set((state) => ({
      notifications: [...state.notifications, notification],
    }));

    if (durationMs > 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, durationMs);
    }

    return id;
  },

  dismissNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAll: () => set({ notifications: [] }),
}));

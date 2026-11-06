import { useNotificationStore } from '../../stores/notificationStore';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export function ToastContainer() {
  const { notifications, dismissNotification } = useNotificationStore();

  if (notifications.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'var(--space-6)',
        right: 'var(--space-6)',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        maxWidth: 400,
        width: '100%',
        pointerEvents: 'none',
      }}
      aria-live="polite"
    >
      {notifications.map((item) => {
        const iconConfig = {
          success: { Icon: CheckCircle2, color: 'var(--status-success)' },
          error: { Icon: AlertCircle, color: 'var(--status-danger)' },
          warning: { Icon: AlertTriangle, color: 'var(--status-warning)' },
          info: { Icon: Info, color: 'var(--status-info)' },
        }[item.type] || { Icon: Info, color: 'var(--status-info)' };

        const { Icon, color } = iconConfig;

        return (
          <div
            key={item.id}
            style={{
              pointerEvents: 'auto',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              borderLeft: `4px solid ${color}`,
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-md)',
              padding: 'var(--space-3) var(--space-4)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-3)',
              animation: 'fadeIn 0.2s ease-out',
            }}
            role="status"
          >
            <Icon size={18} style={{ color, flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              {item.title && (
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                  {item.title}
                </div>
              )}
              {item.message && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '2px', wordBreak: 'break-word' }}>
                  {item.message}
                </div>
              )}
            </div>
            <button
              onClick={() => dismissNotification(item.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
              }}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

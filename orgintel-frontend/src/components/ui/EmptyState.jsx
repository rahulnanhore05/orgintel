import { Inbox } from 'lucide-react';
import { Button } from './Button';

export function EmptyState({
  icon: Icon = Inbox,
  title = 'No items found',
  description = 'There are no records matching your criteria or context.',
  actionLabel,
  onAction,
  actionIcon,
}) {
  return (
    <div style={{
      textAlign: 'center',
      padding: 'var(--space-12) var(--space-6)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 'var(--radius-full)',
        backgroundColor: 'var(--bg-surface-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        marginBottom: 'var(--space-3)',
      }}>
        <Icon size={24} />
      </div>
      <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
        {title}
      </h3>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: 420, marginBottom: actionLabel ? 'var(--space-5)' : 0 }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction} icon={actionIcon}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

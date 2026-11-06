import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = '540px',
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div
        className="modal-content"
        ref={dialogRef}
        style={{ maxWidth }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: 'var(--space-4) var(--space-5)',
          borderBottom: '1px solid var(--border-light)',
        }}>
          <div>
            <h2 id="dialog-title" style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>
              {title}
            </h2>
            {description && (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{ padding: '4px', borderRadius: 'var(--radius-xs)', color: 'var(--text-muted)' }}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 'var(--space-5)', overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

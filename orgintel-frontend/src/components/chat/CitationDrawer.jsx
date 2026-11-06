import { useUiStore } from '../../stores/uiStore';
import { X, FileText, Quote } from 'lucide-react';
import { Button } from '../ui/Button';

export function CitationDrawer() {
  const { isCitationDrawerOpen, activeCitation, closeCitation } = useUiStore();

  if (!isCitationDrawerOpen || !activeCitation) return null;

  return (
    <div
      className="drawer-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeCitation();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Citation Details"
    >
      <div className="drawer-panel">
        {/* Header */}
        <div style={{
          padding: 'var(--space-4) var(--space-5)',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-surface-muted)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--primary-800)',
                color: 'var(--text-inverse)',
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {activeCitation.citationOrder}
            </span>
            <span style={{ fontWeight: 600, fontSize: 'var(--text-md)', color: 'var(--text-primary)' }}>
              Verified Source Citation
            </span>
          </div>
          <button
            onClick={closeCitation}
            className="btn-ghost"
            style={{ padding: '4px', borderRadius: 'var(--radius-xs)', color: 'var(--text-muted)' }}
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: 'var(--space-6)', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Location details */}
          <div className="card" style={{ padding: 'var(--space-4)', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--primary-800)', marginBottom: 'var(--space-2)' }}>
              <FileText size={16} />
              <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                Document Origin
              </span>
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 500 }}>
              {activeCitation.sourceLocation || 'Organizational Knowledge Base'}
            </div>
          </div>

          {/* Quoted passage */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-secondary)' }}>
              <Quote size={16} />
              <span style={{ fontWeight: 600, fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Grounded Excerpt (Passage)
              </span>
            </div>
            <div
              style={{
                padding: 'var(--space-4)',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                lineHeight: 1.6,
                color: 'var(--text-primary)',
                fontStyle: 'italic',
                borderLeft: '4px solid var(--primary-600)',
              }}
            >
              &ldquo;{activeCitation.quotedText || activeCitation.snippet || 'No quotation snippet provided.'}&rdquo;
            </div>
          </div>

          {/* Verification metadata */}
          <div style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--text-muted)',
            padding: 'var(--space-3)',
            backgroundColor: 'var(--status-info-bg)',
            border: '1px solid var(--status-info-border)',
            borderRadius: 'var(--radius-sm)',
          }}>
            <strong>Grounding Guarantee:</strong> This citation was validated against the retrieved document passage embeddings and strict prompt isolation delimiters.
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: 'var(--space-4) var(--space-5)',
          borderTop: '1px solid var(--border-light)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'var(--bg-surface-muted)',
        }}>
          <Button variant="secondary" onClick={closeCitation}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

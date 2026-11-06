import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ROUTES } from '../../app/routes';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-6)' }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--bg-surface-muted)',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto var(--space-4) auto',
        }}
      >
        <FileQuestion size={28} />
      </div>
      <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
        404 — Page Not Found
      </h1>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto var(--space-6) auto' }}>
        The requested resource, document, or view does not exist or may have been deleted.
      </p>
      <Button variant="primary" icon={ArrowLeft} onClick={() => navigate(ROUTES.DOCUMENTS)}>
        Return to Documents
      </Button>
    </div>
  );
}

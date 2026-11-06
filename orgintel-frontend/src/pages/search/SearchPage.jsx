import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '../../hooks/useOrganization';
import { searchService } from '../../services/searchService';
import { useNotificationStore } from '../../stores/notificationStore';
import { parseApiError } from '../../utils/errorUtils';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import {
  Search,
  FileText,
  ExternalLink,
  Zap,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export function SearchPage() {
  const { activeOrg } = useOrganization();
  const { addNotification } = useNotificationStore();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(6);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim() || !activeOrg?.id) return;

    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await searchService.search(activeOrg.id, {
        query: query.trim(),
        limit,
      });
      setResults(response.results || []);
    } catch (err) {
      const parsed = parseApiError(err);
      addNotification({
        type: 'error',
        title: 'Search Request Failed',
        message: parsed.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getMatchBadge = (matchType) => {
    switch (matchType) {
      case 'HYBRID':
        return <Badge variant="success" icon={Zap}>Hybrid RRF</Badge>;
      case 'SEMANTIC':
        return <Badge variant="info" icon={Sparkles}>Vector Cosine</Badge>;
      case 'KEYWORD':
        return <Badge variant="neutral">Full-Text GIN</Badge>;
      default:
        return <Badge variant="neutral">{matchType || 'Match'}</Badge>;
    }
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Hybrid Retrieval Explorer</h1>
          <p className="page-description">
            Execute Reciprocal Rank Fusion search combining PostgreSQL Full-Text (GIN) and pgvector semantic cosine similarity.
          </p>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
        <form onSubmit={handleSearch}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="Ask or query across organizational document passages..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="form-input"
                style={{ width: '100%', paddingLeft: 38, fontSize: 'var(--text-md)', height: 44 }}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="form-select"
                style={{ height: 44 }}
                aria-label="Result limit"
              >
                <option value={3}>Top 3</option>
                <option value={6}>Top 6</option>
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
              </select>

              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                disabled={!query.trim()}
                style={{ height: 44, padding: '0 var(--space-5)' }}
                icon={Search}
              >
                Execute Search
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Results Section */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Skeleton height="7rem" />
          <Skeleton height="7rem" />
          <Skeleton height="7rem" />
        </div>
      ) : !hasSearched ? (
        <div className="card">
          <EmptyState
            icon={BookOpen}
            title="Explore organizational knowledge"
            description="Type a question, keyword, or concept above to retrieve passage-level chunks ranked by hybrid algorithms."
          />
        </div>
      ) : results.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Search}
            title="No relevant passages located"
            description={`Zero document chunks matched "${query}". Ensure documents have finished indexing or try broadening your query.`}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Found {results.length} ranked {results.length === 1 ? 'passage' : 'passages'}
            </span>
          </div>

          {results.map((item, idx) => (
            <div
              key={item.chunkId || idx}
              className="card"
              style={{
                transition: 'border-color var(--transition-fast)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span
                      style={{
                        fontSize: 'var(--text-xs)',
                        fontWeight: 700,
                        backgroundColor: 'var(--bg-surface-muted)',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-xs)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      #{idx + 1}
                    </span>
                    <button
                      onClick={() => navigate(`/documents/${item.documentId}`)}
                      style={{
                        fontWeight: 600,
                        fontSize: 'var(--text-md)',
                        color: 'var(--primary-800)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        textAlign: 'left',
                      }}
                    >
                      <FileText size={16} />
                      {item.documentTitle}
                      <ExternalLink size={12} style={{ opacity: 0.7 }} />
                    </button>
                  </div>

                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {item.sectionTitle && <span>Section: <strong>{item.sectionTitle}</strong> &bull; </span>}
                    {item.pageNumber && <span>Page: <strong>{item.pageNumber}</strong> &bull; </span>}
                    <span>Version: <strong>v{item.versionNumber}</strong></span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  {getMatchBadge(item.matchType)}
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-muted)',
                      backgroundColor: 'var(--bg-surface-muted)',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-xs)',
                    }}
                    title="Reciprocal Rank Fusion Score"
                  >
                    Score: {item.score?.toFixed(5) || '0.000'}
                  </span>
                </div>
              </div>

              {/* Passage Content */}
              <div
                style={{
                  fontSize: 'var(--text-sm)',
                  lineHeight: 1.6,
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-app)',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: '3px solid var(--primary-700)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {item.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

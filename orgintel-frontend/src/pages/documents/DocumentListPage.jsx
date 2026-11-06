import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '../../hooks/useOrganization';
import { documentService } from '../../services/documentService';
import { useNotificationStore } from '../../stores/notificationStore';
import { parseApiError } from '../../utils/errorUtils';
import { formatDateTime, formatBytes } from '../../utils/formatters';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Dialog } from '../../components/ui/Dialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { VisibilityBadge } from '../../components/documents/DocumentStatusBadge';
import {
  UploadCloud,
  FileText,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'md', 'txt'];
const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export function DocumentListPage() {
  const { activeOrg } = useOrganization();
  const { addNotification } = useNotificationStore();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filterVisibility, setFilterVisibility] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadVisibility, setUploadVisibility] = useState('ORGANIZATION');
  const [uploadError, setUploadError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Delete modal state
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDocuments = useCallback(async (targetPage = 0) => {
    if (!activeOrg?.id) return;
    setIsLoading(true);
    try {
      const data = await documentService.list(activeOrg.id, targetPage, 10);
      setDocuments(data.content || []);
      setPage(data.page ?? data.number ?? 0);
      setTotalPages(data.totalPages || 1);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      const parsed = parseApiError(err);
      addNotification({
        type: 'error',
        title: 'Error Fetching Documents',
        message: parsed.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeOrg, addNotification]);

  useEffect(() => {
    fetchDocuments(0);
  }, [fetchDocuments]);

  // Handle file selection & validation
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setUploadError(`Invalid file format .${ext}. Only PDF, DOCX, Markdown (.md), and TXT are supported.`);
      setUploadFile(null);
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setUploadError(`File exceeds maximum size of 25MB (${formatBytes(file.size)}).`);
      setUploadFile(null);
      return;
    }

    setUploadError(null);
    setUploadFile(file);
    if (!uploadTitle) {
      setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a file to upload');
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      if (uploadTitle.trim()) {
        formData.append('title', uploadTitle.trim());
      }
      if (uploadDesc.trim()) {
        formData.append('description', uploadDesc.trim());
      }
      formData.append('visibility', uploadVisibility);

      const response = await documentService.upload(activeOrg.id, formData);

      addNotification({
        type: 'success',
        title: 'Document Uploaded',
        message: response.message || 'File queued for durable ingestion and chunking.',
      });

      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadDesc('');
      setUploadVisibility('ORGANIZATION');
      fetchDocuments(0);
    } catch (err) {
      const parsed = parseApiError(err);
      setUploadError(parsed.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDoc || !activeOrg?.id) return;
    setIsDeleting(true);
    try {
      await documentService.delete(activeOrg.id, deleteDoc.id);
      addNotification({
        type: 'success',
        title: 'Document Removed',
        message: `"${deleteDoc.title}" has been deleted. Access is immediately revoked.`,
      });
      setDeleteDoc(null);
      fetchDocuments(page);
    } catch (err) {
      const parsed = parseApiError(err);
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: parsed.message,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Client-side quick filter
  const filteredDocs = documents.filter((doc) => {
    if (filterVisibility !== 'ALL' && doc.visibility !== filterVisibility) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        doc.title?.toLowerCase().includes(q) ||
        doc.description?.toLowerCase().includes(q) ||
        doc.ownerName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Document Intelligence Library</h1>
          <p className="page-description">
            Upload and manage organizational documents for hybrid retrieval and citation-grounded QA.
          </p>
        </div>
        <Button
          variant="primary"
          icon={UploadCloud}
          onClick={() => setIsUploadOpen(true)}
        >
          Upload Document
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: 'var(--space-3) var(--space-4)',
          marginBottom: 'var(--space-5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1, minWidth: 260 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Filter library by title or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ width: '100%', paddingLeft: 34 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Visibility:
          </span>
          <select
            value={filterVisibility}
            onChange={(e) => setFilterVisibility(e.target.value)}
            className="form-select"
            style={{ padding: '0.35rem 0.6rem', fontSize: 'var(--text-xs)' }}
          >
            <option value="ALL">All Documents</option>
            <option value="ORGANIZATION">Organization Only</option>
            <option value="RESTRICTED">Restricted Only</option>
          </select>
        </div>
      </div>

      {/* Documents Table / State */}
      {isLoading ? (
        <div className="card" style={{ padding: 'var(--space-6)' }}>
          <Skeleton height="2.5rem" style={{ marginBottom: 'var(--space-3)' }} />
          <Skeleton height="2.5rem" style={{ marginBottom: 'var(--space-3)' }} />
          <Skeleton height="2.5rem" style={{ marginBottom: 'var(--space-3)' }} />
          <Skeleton height="2.5rem" />
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FileText}
            title={searchQuery || filterVisibility !== 'ALL' ? 'No matching documents' : 'Your library is empty'}
            description={
              searchQuery || filterVisibility !== 'ALL'
                ? 'Try clearing filters or search terms to view all authorized documents.'
                : 'Upload corporate PDF, DOCX, Markdown, or text files to start asking grounded questions.'
            }
            actionLabel={!searchQuery && filterVisibility === 'ALL' ? 'Upload First Document' : undefined}
            onAction={!searchQuery && filterVisibility === 'ALL' ? () => setIsUploadOpen(true) : undefined}
            actionIcon={UploadCloud}
          />
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="data-table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document Title</th>
                  <th>Visibility</th>
                  <th>Version</th>
                  <th>Owner</th>
                  <th>Updated</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div
                        onClick={() => navigate(`/documents/${doc.id}`)}
                        style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                      >
                        <span style={{ fontWeight: 600, color: 'var(--primary-800)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <FileText size={15} style={{ flexShrink: 0 }} />
                          {doc.title}
                        </span>
                        {doc.description && (
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px', maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {doc.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <VisibilityBadge visibility={doc.visibility} />
                    </td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                        v{doc.currentVersionNumber || 1}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        {doc.ownerName || '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {formatDateTime(doc.updatedAt || doc.createdAt)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-1)' }}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/documents/${doc.id}`)}
                          title="Open document details"
                        >
                          <ExternalLink size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteDoc(doc)}
                          title="Delete document"
                          style={{ color: 'var(--status-danger-text)' }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div
              style={{
                padding: 'var(--space-3) var(--space-5)',
                borderTop: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-surface-muted)',
              }}
            >
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Page {page + 1} of {totalPages} ({totalElements} total items)
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page === 0}
                  onClick={() => fetchDocuments(page - 1)}
                  icon={ChevronLeft}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page >= totalPages - 1}
                  onClick={() => fetchDocuments(page + 1)}
                  icon={ChevronRight}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Document Modal */}
      <Dialog
        isOpen={isUploadOpen}
        onClose={() => !isUploading && setIsUploadOpen(false)}
        title="Upload Document to Knowledge Base"
        description="Supported formats: PDF, DOCX, Markdown (.md), Plain Text (.txt) up to 25MB."
      >
        {uploadError && (
          <div
            style={{
              padding: 'var(--space-3)',
              backgroundColor: 'var(--status-danger-bg)',
              border: '1px solid var(--status-danger-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--status-danger-text)',
              fontSize: 'var(--text-xs)',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              gap: 'var(--space-2)',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{uploadError}</span>
          </div>
        )}

        <form onSubmit={handleUploadSubmit}>
          <div className="form-group">
            <label className="form-label">
              Select Document File <span style={{ color: 'var(--status-danger)' }}>*</span>
            </label>
            <input
              type="file"
              accept=".pdf,.docx,.md,.txt"
              onChange={handleFileChange}
              className="form-input"
              disabled={isUploading}
              required
            />
            {uploadFile && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
                Selected: <strong>{uploadFile.name}</strong> ({formatBytes(uploadFile.size)})
              </div>
            )}
          </div>

          <Input
            label="Document Title"
            type="text"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            placeholder="Defaults to filename without extension"
            disabled={isUploading}
          />

          <div className="form-group">
            <label className="form-label">Description (Optional)</label>
            <textarea
              value={uploadDesc}
              onChange={(e) => setUploadDesc(e.target.value)}
              placeholder="Brief context or summary..."
              className="form-textarea"
              rows={2}
              disabled={isUploading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Access Visibility</label>
            <select
              value={uploadVisibility}
              onChange={(e) => setUploadVisibility(e.target.value)}
              className="form-select"
              disabled={isUploading}
            >
              <option value="ORGANIZATION">Organization (All active members have access)</option>
              <option value="RESTRICTED">Restricted (Owner + explicitly assigned users)</option>
            </select>
            <span className="form-hint" style={{ marginTop: '4px' }}>
              Restricted documents require explicit READ/WRITE permissions granted by you.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-5)' }}>
            <Button
              variant="secondary"
              onClick={() => setIsUploadOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isUploading}
              disabled={!uploadFile}
              icon={UploadCloud}
            >
              Upload & Process
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        isOpen={!!deleteDoc}
        onClose={() => !isDeleting && setDeleteDoc(null)}
        title="Delete Document"
        description="Confirm deletion of document from organizational knowledge base."
      >
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
          Are you sure you want to delete <strong>{deleteDoc?.title}</strong>? This will immediately revoke access to its passages in hybrid search and AI grounded answering.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button
            variant="secondary"
            onClick={() => setDeleteDoc(null)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteConfirm}
            isLoading={isDeleting}
            icon={Trash2}
          >
            Confirm Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

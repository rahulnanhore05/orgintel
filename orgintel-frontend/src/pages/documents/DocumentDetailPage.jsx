import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrganization } from '../../hooks/useOrganization';
import { documentService } from '../../services/documentService';
import { useNotificationStore } from '../../stores/notificationStore';
import { parseApiError } from '../../utils/errorUtils';
import { formatDateTime, formatBytes } from '../../utils/formatters';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Dialog } from '../../components/ui/Dialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { ProcessingStatusBadge, VisibilityBadge } from '../../components/documents/DocumentStatusBadge';
import { ROUTES } from '../../app/routes';
import {
  ArrowLeft,
  Download,
  UploadCloud,
  FileText,
  Shield,
  Trash2,
  Plus,
} from 'lucide-react';

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'md', 'txt'];
const MAX_SIZE_BYTES = 25 * 1024 * 1024;

export function DocumentDetailPage() {
  const { id: documentId } = useParams();
  const { activeOrg } = useOrganization();
  const { addNotification } = useNotificationStore();
  const navigate = useNavigate();

  const [document, setDocument] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'versions' | 'permissions'

  // Version replacement modal
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [replacementFile, setReplacementFile] = useState(null);
  const [replacementError, setReplacementError] = useState(null);
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);

  // Grant permission modal
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [permUserId, setPermUserId] = useState('');
  const [permLevel, setPermLevel] = useState('READ');
  const [permError, setPermError] = useState(null);
  const [isGrantingPerm, setIsGrantingPerm] = useState(false);

  const fetchDocumentDetail = useCallback(async () => {
    if (!activeOrg?.id || !documentId) return;
    try {
      const doc = await documentService.get(activeOrg.id, documentId);
      setDocument(doc);

      // If document is restricted, fetch permissions
      if (doc.visibility === 'RESTRICTED') {
        try {
          const perms = await documentService.listPermissions(activeOrg.id, documentId);
          setPermissions(perms || []);
        } catch {
          // Non-critical if user is not authorized to view permissions list
        }
      }
    } catch (err) {
      const parsed = parseApiError(err);
      addNotification({
        type: 'error',
        title: 'Failed to load document',
        message: parsed.message,
      });
      navigate(ROUTES.DOCUMENTS);
    } finally {
      setIsLoading(false);
    }
  }, [activeOrg, documentId, addNotification, navigate]);

  useEffect(() => {
    fetchDocumentDetail();
  }, [fetchDocumentDetail]);

  // Polling for in-progress versions
  useEffect(() => {
    if (!document) return;
    const hasPending = document.versions?.some(
      (v) => v.processingState === 'QUEUED' || v.processingState === 'PROCESSING'
    );
    if (!hasPending) return;

    const timer = setTimeout(() => {
      fetchDocumentDetail();
    }, 3000);

    return () => clearTimeout(timer);
  }, [document, fetchDocumentDetail]);

  // Download document handler
  const handleDownload = async (versionNumber = null) => {
    if (!activeOrg?.id || !documentId) return;
    try {
      const response = await documentService.download(activeOrg.id, documentId, versionNumber);
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;

      // Extract filename from header or fallback
      let fileName = document.currentVersion?.fileName || `${document.title}.pdf`;
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) fileName = match[1];
      }

      link.setAttribute('download', fileName);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      addNotification({
        type: 'success',
        title: 'Download Started',
        message: `Downloading ${fileName}`,
      });
    } catch (err) {
      const parsed = parseApiError(err);
      addNotification({
        type: 'error',
        title: 'Download Failed',
        message: parsed.message,
      });
    }
  };

  // Replacement version upload handler
  const handleReplacementSubmit = async (e) => {
    e.preventDefault();
    if (!replacementFile) {
      setReplacementError('Please select a file to upload');
      return;
    }

    setReplacementError(null);
    setIsUploadingVersion(true);

    try {
      const formData = new FormData();
      formData.append('file', replacementFile);

      await documentService.uploadReplacement(activeOrg.id, documentId, formData);

      addNotification({
        type: 'success',
        title: 'Replacement Version Uploaded',
        message: 'New version queued. Previous version remains active until processing succeeds.',
      });

      setIsVersionModalOpen(false);
      setReplacementFile(null);
      fetchDocumentDetail();
    } catch (err) {
      const parsed = parseApiError(err);
      setReplacementError(parsed.message);
    } finally {
      setIsUploadingVersion(false);
    }
  };

  // Grant permission handler
  const handleGrantPermission = async (e) => {
    e.preventDefault();
    if (!permUserId.trim()) {
      setPermError('User ID is required');
      return;
    }

    setPermError(null);
    setIsGrantingPerm(true);

    try {
      await documentService.grantPermission(activeOrg.id, documentId, {
        userId: permUserId.trim(),
        permissionLevel: permLevel,
      });

      addNotification({
        type: 'success',
        title: 'Permission Granted',
        message: `Granted ${permLevel} access to user.`,
      });

      setIsPermModalOpen(false);
      setPermUserId('');
      const perms = await documentService.listPermissions(activeOrg.id, documentId);
      setPermissions(perms || []);
    } catch (err) {
      const parsed = parseApiError(err);
      setPermError(parsed.message);
    } finally {
      setIsGrantingPerm(false);
    }
  };

  // Revoke permission handler
  const handleRevokePermission = async (targetUserId) => {
    try {
      await documentService.revokePermission(activeOrg.id, documentId, targetUserId);
      addNotification({
        type: 'info',
        title: 'Permission Revoked',
        message: 'Access permission removed immediately.',
      });
      setPermissions(permissions.filter((p) => p.userId !== targetUserId));
    } catch (err) {
      const parsed = parseApiError(err);
      addNotification({
        type: 'error',
        title: 'Revoke Failed',
        message: parsed.message,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="page-wrapper">
        <Skeleton height="2rem" width="200px" style={{ marginBottom: 'var(--space-4)' }} />
        <Skeleton height="3rem" style={{ marginBottom: 'var(--space-6)' }} />
        <Skeleton height="15rem" />
      </div>
    );
  }

  if (!document) return null;

  return (
    <div className="page-wrapper">
      {/* Back button */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <button
          onClick={() => navigate(ROUTES.DOCUMENTS)}
          className="btn-ghost"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={14} />
          <span>Back to Documents</span>
        </button>
      </div>

      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <h1 className="page-title">{document.title}</h1>
            <VisibilityBadge visibility={document.visibility} />
            {document.currentVersion && (
              <ProcessingStatusBadge state={document.currentVersion.processingState} />
            )}
          </div>
          {document.description && (
            <p className="page-description" style={{ marginTop: 'var(--space-2)' }}>
              {document.description}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button
            variant="secondary"
            icon={Download}
            onClick={() => handleDownload()}
            disabled={!document.currentVersion || document.currentVersion.processingState === 'FAILED'}
          >
            Download File
          </Button>
          <Button
            variant="primary"
            icon={UploadCloud}
            onClick={() => setIsVersionModalOpen(true)}
          >
            Upload Replacement Version
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-4)',
          borderBottom: '1px solid var(--border-light)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: 'var(--space-2) var(--space-3)',
            fontWeight: 600,
            fontSize: 'var(--text-sm)',
            color: activeTab === 'overview' ? 'var(--primary-800)' : 'var(--text-muted)',
            borderBottom: activeTab === 'overview' ? '2px solid var(--primary-800)' : '2px solid transparent',
            marginBottom: '-1px',
          }}
        >
          Metadata & Details
        </button>
        <button
          onClick={() => setActiveTab('versions')}
          style={{
            padding: 'var(--space-2) var(--space-3)',
            fontWeight: 600,
            fontSize: 'var(--text-sm)',
            color: activeTab === 'versions' ? 'var(--primary-800)' : 'var(--text-muted)',
            borderBottom: activeTab === 'versions' ? '2px solid var(--primary-800)' : '2px solid transparent',
            marginBottom: '-1px',
          }}
        >
          Version History ({document.versions?.length || 0})
        </button>
        {document.visibility === 'RESTRICTED' && (
          <button
            onClick={() => setActiveTab('permissions')}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              color: activeTab === 'permissions' ? 'var(--primary-800)' : 'var(--text-muted)',
              borderBottom: activeTab === 'permissions' ? '2px solid var(--primary-800)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            Access Permissions ({permissions.length})
          </button>
        )}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-5)' }}>
          <div className="card">
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <FileText size={18} style={{ color: 'var(--primary-800)' }} />
              Active Version Specification
            </h3>
            {document.currentVersion ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>File Name</div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{document.currentVersion.fileName}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Version Number</div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>v{document.currentVersion.versionNumber}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Size & MIME</div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>
                    {formatBytes(document.currentVersion.fileSize)} &bull; {document.currentVersion.contentType}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Ingestion State</div>
                  <div style={{ marginTop: '4px' }}>
                    <ProcessingStatusBadge state={document.currentVersion.processingState} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Indexing Completed</div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>{formatDateTime(document.currentVersion.completedAt)}</div>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                No active approved version indexed.
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Shield size={18} style={{ color: 'var(--primary-800)' }} />
              Ownership & Security Boundaries
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Owner / Author</div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                  {document.owner?.fullName || '—'} ({document.owner?.email})
                </div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Visibility Scope</div>
                <div style={{ marginTop: '4px' }}>
                  <VisibilityBadge visibility={document.visibility} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Created At</div>
                <div style={{ fontSize: 'var(--text-sm)' }}>{formatDateTime(document.createdAt)}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Last Modified</div>
                <div style={{ fontSize: 'var(--text-sm)' }}>{formatDateTime(document.updatedAt)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Versions */}
      {activeTab === 'versions' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="data-table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>File Name</th>
                  <th>Size</th>
                  <th>Processing State</th>
                  <th>Created</th>
                  <th>Completed</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {document.versions?.map((ver) => (
                  <tr key={ver.id}>
                    <td>
                      <span className="badge badge-neutral" style={{ fontWeight: 700 }}>
                        v{ver.versionNumber}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {ver.fileName}
                    </td>
                    <td>{formatBytes(ver.fileSize)}</td>
                    <td>
                      <ProcessingStatusBadge state={ver.processingState} />
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {formatDateTime(ver.createdAt)}
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {formatDateTime(ver.completedAt)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={Download}
                        onClick={() => handleDownload(ver.versionNumber)}
                        title={`Download version ${ver.versionNumber}`}
                      >
                        Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Permissions (Restricted Documents) */}
      {activeTab === 'permissions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <div>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>Granted User Permissions</h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Explicit user access rights for this restricted document.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setIsPermModalOpen(true)}
            >
              Grant Access
            </Button>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {permissions.length === 0 ? (
              <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                No explicit permissions granted yet. Only the document owner ({document.owner?.fullName}) can access it.
              </div>
            ) : (
              <div className="data-table-container" style={{ border: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Permission Level</th>
                      <th>Granted Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {p.userFullName || 'User'}
                        </td>
                        <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                          {p.userEmail}
                        </td>
                        <td>
                          <span className="badge badge-info">{p.permissionLevel}</span>
                        </td>
                        <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          {formatDateTime(p.createdAt)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRevokePermission(p.userId)}
                            style={{ color: 'var(--status-danger-text)' }}
                            title="Revoke access"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Replacement Version Modal */}
      <Dialog
        isOpen={isVersionModalOpen}
        onClose={() => !isUploadingVersion && setIsVersionModalOpen(false)}
        title="Upload Replacement Version"
        description="Creates an incremental version. If processing fails, the prior version remains active."
      >
        {replacementError && (
          <div
            style={{
              padding: 'var(--space-3)',
              backgroundColor: 'var(--status-danger-bg)',
              border: '1px solid var(--status-danger-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--status-danger-text)',
              fontSize: 'var(--text-xs)',
              marginBottom: 'var(--space-4)',
            }}
          >
            {replacementError}
          </div>
        )}

        <form onSubmit={handleReplacementSubmit}>
          <div className="form-group">
            <label className="form-label">
              Select Replacement File <span style={{ color: 'var(--status-danger)' }}>*</span>
            </label>
            <input
              type="file"
              accept=".pdf,.docx,.md,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const ext = file.name.split('.').pop()?.toLowerCase();
                if (!ALLOWED_EXTENSIONS.includes(ext)) {
                  setReplacementError(`Invalid file format .${ext}`);
                  return;
                }
                if (file.size > MAX_SIZE_BYTES) {
                  setReplacementError('File exceeds 25MB');
                  return;
                }
                setReplacementError(null);
                setReplacementFile(file);
              }}
              className="form-input"
              disabled={isUploadingVersion}
              required
            />
            {replacementFile && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
                Selected: <strong>{replacementFile.name}</strong> ({formatBytes(replacementFile.size)})
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-5)' }}>
            <Button
              variant="secondary"
              onClick={() => setIsVersionModalOpen(false)}
              disabled={isUploadingVersion}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isUploadingVersion}
              disabled={!replacementFile}
              icon={UploadCloud}
            >
              Submit Replacement
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Grant Permission Modal */}
      <Dialog
        isOpen={isPermModalOpen}
        onClose={() => !isGrantingPerm && setIsPermModalOpen(false)}
        title="Grant Document Permission"
        description="Authorize an individual organization member to access this restricted document."
      >
        {permError && (
          <div
            style={{
              padding: 'var(--space-3)',
              backgroundColor: 'var(--status-danger-bg)',
              border: '1px solid var(--status-danger-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--status-danger-text)',
              fontSize: 'var(--text-xs)',
              marginBottom: 'var(--space-4)',
            }}
          >
            {permError}
          </div>
        )}

        <form onSubmit={handleGrantPermission}>
          <Input
            label="User Identifier (UUID)"
            type="text"
            value={permUserId}
            onChange={(e) => setPermUserId(e.target.value)}
            placeholder="e.g. e81b6bb2-80ff-4f51-b8ef-156c12345678"
            hint="Enter the user's UUID from the Organization Members directory."
            required
            autoFocus
          />

          <div className="form-group">
            <label className="form-label">Permission Level</label>
            <select
              value={permLevel}
              onChange={(e) => setPermLevel(e.target.value)}
              className="form-select"
            >
              <option value="READ">READ (Can view & search passages in QA)</option>
              <option value="WRITE">WRITE (Can upload replacement versions)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-5)' }}>
            <Button
              variant="secondary"
              onClick={() => setIsPermModalOpen(false)}
              disabled={isGrantingPerm}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isGrantingPerm}
              icon={Plus}
            >
              Grant Access
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

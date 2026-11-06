/**
 * Formats byte values into human-readable strings (B, KB, MB, GB).
 */
export function formatBytes(bytes, decimals = 1) {
  if (bytes === 0 || !bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Formats ISO date string to localized date/time.
 */
export function formatDateTime(isoString) {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

/**
 * Formats relative time (e.g. "5 minutes ago", "2 days ago").
 */
export function formatRelativeTime(isoString) {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  } catch {
    return '—';
  }
}

/**
 * Formats a decimal metric score (e.g. 0.8500) into a percentage string (85.0%).
 */
export function formatPercentage(decimalScore) {
  if (decimalScore === null || decimalScore === undefined) return '0.0%';
  const num = typeof decimalScore === 'number' ? decimalScore : parseFloat(decimalScore);
  if (isNaN(num)) return '0.0%';
  return `${(num * 100).toFixed(1)}%`;
}

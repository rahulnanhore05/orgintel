import { CheckCircle2, Clock, Loader2, AlertCircle, Lock, Globe } from 'lucide-react';
import { Badge } from '../ui/Badge';

export function ProcessingStatusBadge({ state }) {
  switch (state) {
    case 'COMPLETED':
      return (
        <Badge variant="success" icon={CheckCircle2}>
          Ready
        </Badge>
      );
    case 'PROCESSING':
      return (
        <Badge variant="warning" icon={Loader2}>
          Processing
        </Badge>
      );
    case 'QUEUED':
      return (
        <Badge variant="neutral" icon={Clock}>
          Queued
        </Badge>
      );
    case 'FAILED':
      return (
        <Badge variant="danger" icon={AlertCircle}>
          Failed
        </Badge>
      );
    default:
      return <Badge variant="neutral">{state || 'Unknown'}</Badge>;
  }
}

export function VisibilityBadge({ visibility }) {
  if (visibility === 'RESTRICTED') {
    return (
      <Badge variant="warning" icon={Lock}>
        Restricted
      </Badge>
    );
  }
  return (
    <Badge variant="info" icon={Globe}>
      Organization
    </Badge>
  );
}

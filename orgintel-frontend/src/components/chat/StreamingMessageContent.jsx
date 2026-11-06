import { useMemo } from 'react';
import { cleanAssistantContent, parseCitationsInText } from '../../utils/citationParser';
import { CitationBadge } from './CitationBadge';

/**
 * Renders assistant message content with:
 * 1. Filtered markdown symbols (clean human text, no raw syntax).
 * 2. Interactive citations badges ([1], [2]).
 * 3. Live stream cursor indicator while tokens are arriving from backend.
 */
export function StreamingMessageContent({
  content = '',
  citations = [],
  isStreaming = false,
}) {
  // Clean markdown symbols and chunk brackets as content streams in
  const cleanFullText = useMemo(() => {
    return cleanAssistantContent(content, citations);
  }, [content, citations]);

  // Parse text segments and interactive citation badges
  const segments = useMemo(() => {
    return parseCitationsInText(cleanFullText, citations);
  }, [cleanFullText, citations]);

  return (
    <div>
      {segments.map((segment, sIdx) => {
        if (segment.type === 'citation') {
          return (
            <CitationBadge
              key={sIdx}
              order={segment.order}
              citation={segment.citation}
            />
          );
        }
        return <span key={sIdx}>{segment.value}</span>;
      })}

      {/* Blinking cursor while tokens are actively streaming from backend */}
      {isStreaming && (
        <span
          className="streaming-cursor"
          style={{
            display: 'inline-block',
            width: 4,
            height: '0.9em',
            backgroundColor: 'var(--primary-700)',
            marginLeft: 3,
            verticalAlign: 'text-bottom',
            borderRadius: 1,
            animation: 'streaming-blink 0.8s infinite',
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

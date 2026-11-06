/**
 * Cleans markdown formatting symbols from text so that raw syntax
 * characters (like **, *, ###, `, _, etc.) are filtered out for clean readability.
 *
 * @param {string} text - Raw input text containing markdown symbols
 * @returns {string} - Clean text with markdown formatting characters removed
 */
export function filterMarkdownSymbols(text) {
  if (!text) return '';

  let cleaned = text;

  // 1. Remove fenced code blocks (```lang ... ```) keeping the code content
  cleaned = cleaned.replace(/```[\w-]*\s*([\s\S]*?)```/g, '$1');

  // 2. Remove inline backticks (`code` -> code)
  cleaned = cleaned.replace(/`([^`\n]+)`/g, '$1');

  // 3. Remove header symbols (# Heading, ## Subheading, ### Section -> Heading)
  cleaned = cleaned.replace(/^#{1,6}\s+(.+)$/gm, '$1');

  // 4. Remove bold & italic combinations (***text***, ___text___ -> text)
  cleaned = cleaned.replace(/\*\*\*([^*]+)\*\*\*/g, '$1');
  cleaned = cleaned.replace(/___([^_]+)___/g, '$1');

  // 5. Remove bold formatting (**text**, __text__ -> text)
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');

  // 6. Remove italic formatting (*text*, _text_ -> text)
  // Ensure we don't accidentally strip underscores inside words like variable_names
  cleaned = cleaned.replace(/(^|[^\w*])\*([^*]+)\*([^\w*]|$)/g, '$1$2$3');
  cleaned = cleaned.replace(/(^|[^\w_])_([^_]+)_([^\w_]|$)/g, '$1$2$3');

  // 7. Remove blockquote markers (> Quote -> Quote)
  cleaned = cleaned.replace(/^>\s?/gm, '');

  // 8. Convert bullet list markers (* item, - item) into clean bullet characters (• item)
  cleaned = cleaned.replace(/^[*-]\s+/gm, '• ');

  // 9. Remove horizontal rules (---, ***, ___)
  cleaned = cleaned.replace(/^(?:[-*_]\s*){3,}$/gm, '');

  // 10. Clean markdown links: [link text](http://...) -> link text
  // Only matches links that have parentheses immediately after square brackets (preserving [1], [2])
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 11. Normalize excessive line breaks (more than 2 consecutive newlines)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

/**
 * Normalizes chunk numbers and references in square brackets (e.g. [chunk: 1], [chunk:1],
 * [chunk 1], [Chunk: 1], [chunk: <uuid>]) into clean citation references like [1], [2],
 * and strips any invalid or unmapped chunk brackets.
 *
 * @param {string} text - Raw input message text
 * @param {Array} citations - Available CitationResponse objects
 * @returns {string} - Text with normalized citation brackets [1], [2] and no raw chunk brackets
 */
export function normalizeChunkBrackets(text, citations = []) {
  if (!text) return '';

  let normalized = text;

  // Build lookup maps from citations if provided
  const chunkIdToOrderMap = new Map();
  citations.forEach((c) => {
    if (c.chunkId) {
      chunkIdToOrderMap.set(String(c.chunkId).toLowerCase(), c.citationOrder);
    }
  });

  // 1. Match [chunk: <number>], [chunk <number>], [Chunk: <number>], [chunk:c<number>]
  normalized = normalized.replace(/\[\s*chunk\s*[:\s-]?\s*c?(\d+)\s*\]/gi, (match, numStr) => {
    const orderNum = parseInt(numStr, 10);
    // If citations exist and contain this order number, keep it as [orderNum]
    if (citations.length > 0) {
      const exists = citations.some((c) => c.citationOrder === orderNum);
      if (exists) {
        return `[${orderNum}]`;
      }
      // If citation count is small, map index 1..N to citationOrder
      if (orderNum >= 1 && orderNum <= citations.length) {
        return `[${citations[orderNum - 1].citationOrder}]`;
      }
    }
    // Default: convert [chunk: 1] to [1]
    return `[${orderNum}]`;
  });

  // 2. Match [chunk: <uuid>] or [chunk <uuid>]
  normalized = normalized.replace(
    /\[\s*chunk\s*[:\s-]?\s*([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\s*\]/gi,
    (match, uuid) => {
      const order = chunkIdToOrderMap.get(uuid.toLowerCase());
      if (order != null) {
        return `[${order}]`;
      }
      // Unmapped chunk UUID: strip it
      return '';
    }
  );

  // 3. Match parenthetical chunk references like (Annual Report, ChunkId: c1) or (Chunk: 1)
  normalized = normalized.replace(/\((?:[^)]*,\s*)?chunk(?:id)?\s*:[^)]+\)/gi, '');

  // 4. Strip any remaining malformed chunk brackets, e.g. [chunk: ...], [chunk ...]
  normalized = normalized.replace(/\[\s*chunk[^\s\]]*\s*[:\s-]?[^\]]*\]/gi, '');

  // Clean double spaces created by stripped brackets
  normalized = normalized.replace(/[ \t]{2,}/g, ' ');

  return normalized;
}

/**
 * Prepares raw assistant text by filtering markdown formatting symbols
 * and normalizing chunk numbers in square brackets into clean citation footnotes.
 *
 * @param {string} text - Raw assistant text
 * @param {Array} citations - Citation metadata array
 * @returns {string} - Clean, formatted assistant message
 */
export function cleanAssistantContent(text, citations = []) {
  if (!text) return '';
  const withoutRawChunks = normalizeChunkBrackets(text, citations);
  return filterMarkdownSymbols(withoutRawChunks);
}

/**
 * Parses message text into segments of plain text and numbered citation references ([1], [2], etc.).
 *
 * @param {string} text - Message content (optionally cleaned)
 * @param {Array} citations - List of CitationResponse objects
 * @returns {Array<{ type: 'text' | 'citation', value: string, order?: number, citation?: object }>}
 */
export function parseCitationsInText(text, citations = []) {
  if (!text) return [];

  // Match [1], [2], etc.
  const regex = /\[(\d+)\]/g;
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const start = match.index;
    const end = regex.lastIndex;
    const orderNum = parseInt(match[1], 10);

    // Push preceding text if any
    if (start > lastIndex) {
      segments.push({
        type: 'text',
        value: text.slice(lastIndex, start),
      });
    }

    // Find citation metadata
    const matchingCitation = citations.find((c) => c.citationOrder === orderNum) || {
      citationOrder: orderNum,
      sourceLocation: `Source [${orderNum}]`,
      quotedText: 'Citation excerpt not available.',
    };

    segments.push({
      type: 'citation',
      value: match[0],
      order: orderNum,
      citation: matchingCitation,
    });

    lastIndex = end;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      value: text.slice(lastIndex),
    });
  }

  return segments;
}

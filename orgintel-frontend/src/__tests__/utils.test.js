import { describe, it, expect } from 'vitest';
import { parseApiError, getFieldError } from '../utils/errorUtils';
import { formatBytes, formatPercentage } from '../utils/formatters';
import {
  parseCitationsInText as parseCitations,
  filterMarkdownSymbols,
  normalizeChunkBrackets,
  cleanAssistantContent,
} from '../utils/citationParser';

describe('Utility Functions', () => {
  describe('errorUtils', () => {
    it('parses structured backend ErrorResponse', () => {
      const mockAxiosError = {
        response: {
          status: 400,
          data: {
            correlationId: 'corr-123',
            errorCode: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            status: 400,
            validationErrors: {
              email: ['Invalid email format'],
            },
          },
        },
      };

      const parsed = parseApiError(mockAxiosError);
      expect(parsed.errorCode).toBe('VALIDATION_ERROR');
      expect(parsed.correlationId).toBe('corr-123');
      expect(parsed.validationErrors.email[0]).toBe('Invalid email format');

      const fieldErr = getFieldError(parsed.validationErrors, 'email');
      expect(fieldErr).toBe('Invalid email format');
    });

    it('handles network error safely', () => {
      const networkError = new Error('Network Error');
      const parsed = parseApiError(networkError);
      expect(parsed.errorCode).toBe('NETWORK_ERROR');
      expect(parsed.status).toBe(0);
    });

    it('handles timeout error cleanly', () => {
      const timeoutError = new Error('timeout of 120000ms exceeded');
      timeoutError.code = 'ECONNABORTED';
      const parsed = parseApiError(timeoutError);
      expect(parsed.errorCode).toBe('TIMEOUT');
      expect(parsed.status).toBe(408);
      expect(parsed.message).toContain('timed out');
    });
  });

  describe('formatters', () => {
    it('formats bytes into KB and MB properly', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(26214400)).toBe('25 MB');
    });

    it('formats decimal fractions as percentages', () => {
      expect(formatPercentage(0.85)).toBe('85.0%');
      expect(formatPercentage(0.9234)).toBe('92.3%');
      expect(formatPercentage(1)).toBe('100.0%');
      expect(formatPercentage(null)).toBe('0.0%');
    });
  });

  describe('citationParser', () => {
    it('splits message text into text and citation tokens', () => {
      const text = 'Revenue grew 18% in fiscal year 2026 [1], with margin expansion [2].';
      const citations = [
        { citationOrder: 1, sourceLocation: 'Q3 Report, p. 12', quotedText: 'Revenue increased 18%' },
        { citationOrder: 2, sourceLocation: 'Executive Summary', quotedText: 'Operating margins expanded' },
      ];

      const segments = parseCitations(text, citations);
      expect(segments.length).toBe(5);

      expect(segments[0].type).toBe('text');
      expect(segments[0].value).toBe('Revenue grew 18% in fiscal year 2026 ');

      expect(segments[1].type).toBe('citation');
      expect(segments[1].order).toBe(1);
      expect(segments[1].citation.quotedText).toBe('Revenue increased 18%');

      expect(segments[2].type).toBe('text');
      expect(segments[3].type).toBe('citation');
      expect(segments[3].order).toBe(2);
      expect(segments[4].type).toBe('text');
    });

    it('returns single text segment when no citations present', () => {
      const text = 'No citations in this message.';
      const segments = parseCitations(text, []);
      expect(segments.length).toBe(1);
      expect(segments[0].type).toBe('text');
      expect(segments[0].value).toBe(text);
    });

    describe('filterMarkdownSymbols', () => {
      it('removes bold, italic, and bold-italic markdown symbols', () => {
        const raw = 'This is **bold** text and *italic* text and ***bold italic***.';
        expect(filterMarkdownSymbols(raw)).toBe('This is bold text and italic text and bold italic.');

        const rawUnderscores = 'This is __bold__ and _italic_ and ___both___.';
        expect(filterMarkdownSymbols(rawUnderscores)).toBe('This is bold and italic and both.');
      });

      it('removes headers, blockquotes, and code backticks', () => {
        const raw = '### Executive Summary\n> High confidence rating\nUse `parseCitations` function.';
        const cleaned = filterMarkdownSymbols(raw);
        expect(cleaned).toContain('Executive Summary');
        expect(cleaned).not.toContain('###');
        expect(cleaned).toContain('High confidence rating');
        expect(cleaned).not.toContain('>');
        expect(cleaned).toContain('Use parseCitations function.');
        expect(cleaned).not.toContain('`');
      });

      it('converts markdown bullet markers to bullet characters', () => {
        const raw = '* Item one\n- Item two';
        const cleaned = filterMarkdownSymbols(raw);
        expect(cleaned).toBe('• Item one\n• Item two');
      });

      it('cleans markdown links while preserving citation brackets', () => {
        const raw = 'See [Documentation](https://orgintel.ai/docs) and reference [1].';
        const cleaned = filterMarkdownSymbols(raw);
        expect(cleaned).toBe('See Documentation and reference [1].');
      });
    });

    describe('normalizeChunkBrackets', () => {
      it('normalizes chunk numbers in square brackets to clean citations', () => {
        const raw = 'Revenue grew 15% [chunk: 1] according to internal records [chunk 2] and [Chunk: 3].';
        const normalized = normalizeChunkBrackets(raw);
        expect(normalized).toBe('Revenue grew 15% [1] according to internal records [2] and [3].');
      });

      it('normalizes chunk with UUID using citations array', () => {
        const uuid = '51d6761c-b631-48f5-93ec-eec09e767e7c';
        const raw = `Data extracted from [chunk: ${uuid}].`;
        const citations = [{ citationOrder: 1, chunkId: uuid }];
        const normalized = normalizeChunkBrackets(raw, citations);
        expect(normalized).toBe('Data extracted from [1].');
      });

      it('strips unmapped or stray chunk brackets', () => {
        const raw = 'Verified data [chunk: unmapped-ref] and (Chunk: 4).';
        const normalized = normalizeChunkBrackets(raw);
        expect(normalized.trim()).toBe('Verified data and .');
      });
    });

    describe('cleanAssistantContent', () => {
      it('combines chunk normalization and markdown filtering seamlessly', () => {
        const raw = '### Summary\n**Revenue** increased [chunk: 1] with *high margins* [chunk: 2].';
        const cleaned = cleanAssistantContent(raw);
        expect(cleaned).toBe('Summary\nRevenue increased [1] with high margins [2].');
      });
    });
  });
});

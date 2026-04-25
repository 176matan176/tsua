import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';

/**
 * Render post body text with inline $TICKER and #hashtag linking.
 *
 * Behavior:
 *   - $NVDA, $TEVA, $LUMI etc. → linked, styled chip
 *   - URLs (http/https) → clickable external link
 *   - Plain text → preserved
 *
 * Ticker pattern: $ followed by 1–6 uppercase Latin letters, terminated
 * by a word boundary. Common Israeli/US convention.
 */

const TICKER_RE = /\$([A-Z]{1,6})\b/g;
const URL_RE = /\bhttps?:\/\/[^\s<>"']+/g;

interface RenderOptions {
  locale: string;
  /** Tickers that already appear as StockPills below the body — still linked, just less emphasized */
  knownTickers?: Set<string>;
}

interface Token {
  type: 'text' | 'ticker' | 'url';
  value: string;
}

function tokenize(text: string): Token[] {
  // First split on URLs, then within each non-URL chunk split on tickers
  const tokens: Token[] = [];

  let lastIndex = 0;
  const matches: Array<{ index: number; length: number; type: 'ticker' | 'url'; value: string }> = [];

  // Collect URL matches
  let m: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(text)) !== null) {
    matches.push({ index: m.index, length: m[0].length, type: 'url', value: m[0] });
  }

  // Collect ticker matches (skip if inside a URL)
  TICKER_RE.lastIndex = 0;
  while ((m = TICKER_RE.exec(text)) !== null) {
    const idx = m.index;
    const insideUrl = matches.some(
      x => x.type === 'url' && idx >= x.index && idx < x.index + x.length,
    );
    if (insideUrl) continue;
    matches.push({ index: idx, length: m[0].length, type: 'ticker', value: m[1] });
  }

  // Sort by index
  matches.sort((a, b) => a.index - b.index);

  for (const match of matches) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    tokens.push({ type: match.type, value: match.value });
    lastIndex = match.index + match.length;
  }
  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return tokens;
}

export function renderPostBody(text: string, opts: RenderOptions): ReactNode {
  const tokens = tokenize(text);
  return tokens.map((t, i) => {
    if (t.type === 'ticker') {
      return (
        <Link
          key={i}
          href={`/${opts.locale}/stocks/${t.value}`}
          onClick={(e) => e.stopPropagation()}
          className="font-bold transition-colors"
          style={{
            color: '#00e5b0',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.textDecoration = 'underline';
            (e.currentTarget as HTMLElement).style.textUnderlineOffset = '3px';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.textDecoration = 'none';
          }}
        >
          ${t.value}
        </Link>
      );
    }
    if (t.type === 'url') {
      return (
        <a
          key={i}
          href={t.value}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="font-medium transition-colors"
          style={{
            color: '#60a5fa',
            textDecoration: 'underline',
            textUnderlineOffset: '2px',
            textDecorationColor: 'rgba(96, 165, 250, 0.4)',
          }}
        >
          {t.value.length > 50 ? t.value.slice(0, 47) + '…' : t.value}
        </a>
      );
    }
    return <Fragment key={i}>{t.value}</Fragment>;
  });
}

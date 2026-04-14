'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { PhotoIcon, ChartBarIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Sentiment } from '@/types/shared';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

function extractTickers(body: string): string[] {
  const matches = body.match(/\$([A-Za-zא-ת][A-Za-z0-9.]{0,9})/g) || [];
  return [...new Set(matches.map(m => m.replace('$', '').toUpperCase()))];
}

// Returns the $TICKER being typed at the cursor position, or null
function getActiveTicker(text: string, cursorPos: number): { query: string; start: number } | null {
  const before = text.slice(0, cursorPos);
  const match = before.match(/\$([A-Za-z][A-Za-z0-9.]*)$/);
  if (!match) return null;
  return { query: match[1], start: cursorPos - match[0].length };
}

interface TickerSuggestion {
  ticker: string;
  name: string;
  exchange: string;
}

export function PostComposer({ onPost }: { onPost?: () => void }) {
  const locale = useLocale();
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [body, setBody] = useState('');
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Image upload state
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<TickerSuggestion[]>([]);
  const [activeTicker, setActiveTicker] = useState<{ query: string; start: number } | null>(null);
  const [acLoading, setAcLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const charLimit = 280;
  const charsLeft = charLimit - body.length;
  const pct = body.length / charLimit;
  const circumference = 2 * Math.PI * 10;
  const strokeDash = circumference * (1 - pct);

  const tickers = extractTickers(body);

  // Fetch suggestions with debounce
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 1) { setSuggestions([]); return; }
    setAcLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=stocks`);
      const data = await res.json();
      setSuggestions((data.stocks ?? []).slice(0, 6));
      setSelectedIdx(0);
    } catch {
      setSuggestions([]);
    } finally {
      setAcLoading(false);
    }
  }, []);

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setBody(val);

    const cursor = e.target.selectionStart ?? val.length;
    const active = getActiveTicker(val, cursor);
    setActiveTicker(active);

    if (active) {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => fetchSuggestions(active.query), 280);
    } else {
      setSuggestions([]);
    }
  }

  function insertTicker(ticker: string) {
    if (!activeTicker || !textareaRef.current) return;
    const before = body.slice(0, activeTicker.start);
    const cursor = textareaRef.current.selectionStart ?? body.length;
    const after = body.slice(cursor);
    const newBody = `${before}$${ticker} ${after}`;
    setBody(newBody);
    setSuggestions([]);
    setActiveTicker(null);

    // Restore focus + position
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = before.length + ticker.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, suggestions.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); insertTicker(suggestions[selectedIdx].ticker); return; }
      if (e.key === 'Escape') { setSuggestions([]); return; }
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handlePost();
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bucket', 'post-images');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'שגיאה בהעלאת התמונה');
      }
      const { url } = await res.json();
      setImageUrl(url);
    } catch (e: any) {
      setError(e.message ?? 'שגיאה בהעלאת התמונה');
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handlePost() {
    if (!body.trim() || !user) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: body.trim(),
          sentiment: sentiment ?? null,
          stockMentions: tickers,
          lang: 'he',
          imageUrls: imageUrl ? [imageUrl] : [],
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to post');
      }
      setBody('');
      setSentiment(null);
      setFocused(false);
      setSuggestions([]);
      setImageUrl(null);
      onPost?.();
    } catch (e: any) {
      setError(e.message ?? 'שגיאה בשמירת הפוסט');
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div
        className="relative overflow-hidden rounded-xl p-5"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: '0 2px 16px rgba(0,0,0,0.1)',
        }}
      >
        {/* Decorative grid lines */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(0,229,176,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,176,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative flex items-center gap-4" dir="rtl">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
          >
            📊
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-black" style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}>
              שתף את הניתוח שלך
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
              הצטרף לאלפי משקיעים ישראלים
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              href={`/${locale}/login`}
              className="text-[12px] font-bold px-3.5 py-2 rounded-lg transition-all hover:opacity-80"
              style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}
            >
              כניסה
            </Link>
            <Link
              href={`/${locale}/signup`}
              className="text-[12px] font-black px-4 py-2 rounded-lg transition-all hover:brightness-110 active:scale-95"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: '#030d09', boxShadow: '0 4px 12px rgba(0,229,176,0.2)' }}
            >
              הצטרף →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayName = user.user_metadata?.username || user.user_metadata?.display_name || user.email?.split('@')[0] || '';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div
      className="rounded-xl overflow-visible transition-all duration-200 relative"
      style={{
        background: 'var(--card)',
        border: focused ? '1px solid rgba(0,229,176,0.4)' : '1px solid var(--border)',
        boxShadow: focused ? '0 0 0 3px rgba(0,229,176,0.06), 0 4px 24px rgba(0,0,0,0.15)' : '0 2px 12px rgba(0,0,0,0.08)',
      }}
    >
      {/* Terminal header strip */}
      <div
        className="flex items-center gap-2 px-4 py-2"
        style={{ borderBottom: '1px solid var(--border2)', background: 'var(--surface2)' }}
        dir="rtl"
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: focused ? 'var(--accent)' : 'var(--muted2)', boxShadow: focused ? '0 0 6px rgba(0,229,176,0.6)' : 'none', transition: 'all 0.2s' }}
        />
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          {focused ? 'כותב...' : 'פרסם ניתוח · שתף תחזית · $TAG מניה'}
        </span>
        {sentiment && (
          <span
            className="ms-auto text-[10px] font-black px-2 py-0.5 rounded-md"
            style={{
              background: sentiment === 'bullish' ? 'rgba(0,229,176,0.12)' : 'rgba(255,77,106,0.12)',
              color: sentiment === 'bullish' ? 'var(--accent)' : 'var(--red)',
              border: `1px solid ${sentiment === 'bullish' ? 'rgba(0,229,176,0.25)' : 'rgba(255,77,106,0.25)'}`,
            }}
          >
            {sentiment === 'bullish' ? '▲ שורי' : '▼ דובי'}
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="flex gap-3" dir="rtl">
          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-[13px] shrink-0 mt-0.5"
            style={{
              background: 'linear-gradient(135deg, #003d2e, #00e5b0)',
              color: '#00e5b0',
              border: '1px solid rgba(0,229,176,0.2)',
              boxShadow: '0 0 12px rgba(0,229,176,0.15)',
            }}
          >
            {initial}
          </div>

          <div className="flex-1 min-w-0 relative">
            <textarea
              ref={textareaRef}
              dir="auto"
              value={body}
              onChange={handleTextChange}
              onFocus={() => setFocused(true)}
              onBlur={() => !body && setFocused(false)}
              onKeyDown={handleKeyDown}
              maxLength={charLimit}
              rows={focused || body ? 3 : 2}
              placeholder="מה דעתך על השוק? השתמש ב-$TEVA לתיוג מניה..."
              className="w-full bg-transparent resize-none focus:outline-none leading-relaxed"
              style={{ color: 'var(--text)', fontSize: '14px' }}
            />

            {/* $TICKER Autocomplete Dropdown */}
            {suggestions.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-50"
                style={{
                  background: 'rgba(8,13,26,0.97)',
                  border: '1px solid rgba(0,229,176,0.25)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,229,176,0.05)',
                  backdropFilter: 'blur(16px)',
                }}
              >
                {acLoading && (
                  <div className="px-3 py-2 text-xs text-tsua-muted">
                    מחפש...
                  </div>
                )}
                {suggestions.map((s, idx) => (
                  <button
                    key={s.ticker}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); insertTicker(s.ticker); }}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-start transition-all"
                    style={{
                      background: idx === selectedIdx ? 'rgba(0,229,176,0.08)' : 'transparent',
                      borderBottom: idx < suggestions.length - 1 ? '1px solid rgba(26,40,64,0.5)' : 'none',
                    }}
                  >
                    <span
                      className="font-black text-xs px-2 py-0.5 rounded-md shrink-0 font-mono"
                      style={{ background: 'rgba(0,229,176,0.1)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.2)', minWidth: '52px', textAlign: 'center' }}
                    >
                      ${s.ticker}
                    </span>
                    <span className="flex-1 text-xs text-tsua-text truncate">{s.name}</span>
                    <span className="text-[10px] text-tsua-muted shrink-0">{s.exchange?.replace('NASDAQ NMS - GLOBAL MARKET', 'NASDAQ').replace('NEW YORK STOCK EXCHANGE', 'NYSE').slice(0, 6)}</span>
                  </button>
                ))}
                <div className="px-3 py-1.5" style={{ borderTop: '1px solid rgba(26,40,64,0.5)' }}>
                  <span className="text-[10px] text-tsua-muted">
                    ↑↓ לניווט · Enter להוספה · Esc לסגירה
                  </span>
                </div>
              </div>
            )}

            {/* Ticker preview chips */}
            {tickers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
                {tickers.map(t => (
                  <span key={t} className="text-[11px] font-bold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(0,229,176,0.1)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.2)' }}>
                    ${t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image preview */}
      {imageUrl && (
        <div className="relative mx-4 mb-2 rounded-xl overflow-hidden" style={{ maxHeight: '200px', border: '1px solid rgba(26,40,64,0.6)' }}>
          <img src={imageUrl} alt="תצוגה מקדימה" className="w-full object-cover" style={{ maxHeight: '200px' }} />
          <button
            type="button"
            onClick={() => setImageUrl(null)}
            className="absolute top-2 end-2 w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: 'rgba(6,11,22,0.8)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <XMarkIcon className="w-3.5 h-3.5 text-tsua-muted" />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div
        className="flex items-center gap-1.5 px-3 py-2"
        style={{ borderTop: '1px solid var(--border2)', background: 'var(--surface2)' }}
        dir="rtl"
      >
        {/* Sentiment buttons */}
        <button
          onClick={() => setSentiment(sentiment === 'bullish' ? null : 'bullish')}
          className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1.5 rounded-lg transition-all duration-150 hover:scale-105 active:scale-95"
          style={sentiment === 'bullish'
            ? { background: 'rgba(0,229,176,0.15)', color: 'var(--accent)', border: '1px solid rgba(0,229,176,0.3)' }
            : { background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          ▲ שורי
        </button>
        <button
          onClick={() => setSentiment(sentiment === 'bearish' ? null : 'bearish')}
          className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1.5 rounded-lg transition-all duration-150 hover:scale-105 active:scale-95"
          style={sentiment === 'bearish'
            ? { background: 'rgba(255,77,106,0.15)', color: 'var(--red)', border: '1px solid rgba(255,77,106,0.3)' }
            : { background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          ▼ דובי
        </button>

        {/* Image */}
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleImageSelect} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={imageUploading || !!imageUrl}
          className="p-1.5 rounded-lg transition-all hover:bg-white/5 disabled:opacity-40"
          style={{ color: imageUrl ? 'var(--accent)' : 'var(--muted)' }}
          title="הוסף תמונה"
        >
          {imageUploading
            ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin block" />
            : <PhotoIcon className="w-4 h-4" />
          }
        </button>

        <div className="flex-1" />

        {error && <span className="text-[11px] font-semibold" style={{ color: 'var(--red)' }}>{error}</span>}

        {/* Char counter */}
        {body.length > 0 && (
          <div className="flex items-center gap-1.5">
            {charsLeft <= 20 && (
              <span className="text-[11px] font-black font-mono" style={{ color: charsLeft <= 0 ? 'var(--red)' : 'var(--gold)' }}>
                {charsLeft}
              </span>
            )}
            <svg width="22" height="22" className="shrink-0 -rotate-90">
              <circle cx="11" cy="11" r="9" fill="none" stroke="rgba(26,40,64,0.5)" strokeWidth="2" />
              <circle cx="11" cy="11" r="9" fill="none"
                stroke={pct > 0.9 ? 'var(--red)' : pct > 0.75 ? 'var(--gold)' : 'var(--accent)'}
                strokeWidth="2"
                strokeDasharray={2 * Math.PI * 9}
                strokeDashoffset={2 * Math.PI * 9 * (1 - pct)}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.15s, stroke 0.3s' }}
              />
            </svg>
          </div>
        )}

        {/* Post button */}
        <button
          onClick={handlePost}
          disabled={!body.trim() || loading || body.length > charLimit}
          className="text-[12px] font-black px-5 py-1.5 rounded-lg transition-all duration-150 disabled:opacity-25 disabled:cursor-not-allowed hover:brightness-110 active:scale-95"
          style={{
            background: body.trim() ? 'linear-gradient(135deg, var(--accent), var(--accent2))' : 'var(--surface2)',
            color: body.trim() ? '#030d09' : 'var(--muted)',
            border: `1px solid ${body.trim() ? 'transparent' : 'var(--border)'}`,
            boxShadow: body.trim() ? '0 4px 14px rgba(0,229,176,0.2)' : 'none',
            letterSpacing: '-0.01em',
          }}
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              שולח
            </span>
          ) : 'פרסם'}
        </button>
      </div>
    </div>
  );
}

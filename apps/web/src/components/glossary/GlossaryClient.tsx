'use client';

import { useEffect, useMemo, useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, LinkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { DICTIONARY, GLOSSARY_CATEGORIES, type DictEntry, type DictKey } from '@/lib/financialDictionary';

const TOTAL_TERMS = GLOSSARY_CATEGORIES.reduce((n, c) => n + c.terms.length, 0);
const ALL_KEYS = GLOSSARY_CATEGORIES.flatMap(c => c.terms);

/** Per-category accent (rgb triplet) — used for dots, tints and section markers.
 *  Text stays on theme tokens so contrast holds in both light and dark. */
const CAT_RGB: Record<string, string> = {
  valuation: '0,229,176', performance: '34,211,238', dividend: '251,191,36',
  risk: '255,84,112', price: '59,130,246', technical: '139,92,246',
  market: '244,63,126', instruments: '20,211,180', strategy: '251,146,60',
  company: '96,165,250', macro: '52,211,153',
};
const catOf = (k: DictKey) => GLOSSARY_CATEGORIES.find(c => (c.terms as readonly string[]).includes(k))!;

export function GlossaryClient() {
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string>('all');
  const [featured, setFeatured] = useState<DictKey | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Random "term of the moment" — set after mount to avoid hydration mismatch.
  const pickRandom = () => ALL_KEYS[Math.floor(Math.random() * ALL_KEYS.length)];
  useEffect(() => { setFeatured(pickRandom()); }, []);

  const q = query.trim();

  const groups = useMemo(() => {
    return GLOSSARY_CATEGORIES
      .filter(c => activeCat === 'all' || c.key === activeCat)
      .map(c => ({
        ...c,
        entries: c.terms
          .map(k => ({ key: k, ...(DICTIONARY[k] as DictEntry) }))
          .filter(e => !q || e.term.includes(q) || e.short.includes(q) || e.text.includes(q)),
      }))
      .filter(c => c.entries.length > 0);
  }, [q, activeCat]);

  const shown = groups.reduce((n, c) => n + c.entries.length, 0);
  const showFeatured = !q && activeCat === 'all' && featured;

  function copyLink(key: string) {
    try {
      const url = `${window.location.origin}${window.location.pathname}#${key}`;
      navigator.clipboard?.writeText(url);
      setCopied(key);
      setTimeout(() => setCopied(c => (c === key ? null : c)), 1400);
    } catch { /* clipboard blocked — non-fatal */ }
  }

  return (
    <div dir="rtl" className="max-w-4xl mx-auto pb-10">
      {/* ─── Hero ─── */}
      <header className="mb-6">
        <div className="flex items-center gap-2.5">
          <span
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: 'rgb(var(--rgb-accent) / 0.12)', border: '1px solid rgb(var(--rgb-accent) / 0.25)' }}
          >📖</span>
          <div>
            <h1 className="text-2xl md:text-3xl font-black leading-none" style={{ color: 'var(--text)' }}>מילון המשקיע</h1>
            <p className="mt-1.5 text-[13px]" style={{ color: 'var(--muted)' }}>
              <span className="font-black" style={{ color: 'var(--accent)' }}>{TOTAL_TERMS}</span> מונחים · {GLOSSARY_CATEGORIES.length} קטגוריות · בעברית פשוטה
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text2)' }}>
          כל מה שסוחר חייב להכיר — עם הסברים ברורים ודוגמאות מהחיים. חפש מונח, או גלה לפי קטגוריה.
        </p>
      </header>

      {/* ─── Featured term ─── */}
      {showFeatured && (() => {
        const e = DICTIONARY[featured!] as DictEntry;
        const rgb = CAT_RGB[catOf(featured!).key];
        return (
          <div
            className="mb-6 rounded-2xl p-5 relative overflow-hidden"
            style={{ background: `linear-gradient(160deg, rgb(${rgb} / 0.10), rgb(var(--rgb-card) / 0.7))`, border: `1px solid rgb(${rgb} / 0.35)` }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black tracking-widest uppercase flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: `rgb(${rgb})` }} />🎲 מונח אקראי
              </span>
              <button
                type="button"
                onClick={() => setFeatured(pickRandom())}
                className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all active:scale-95"
                style={{ color: 'var(--text2)', background: 'rgb(var(--rgb-card) / 0.6)', border: '1px solid var(--border)' }}
              >
                <ArrowPathIcon className="w-3.5 h-3.5" /> עוד אחד
              </button>
            </div>
            <h2 className="text-xl font-black" style={{ color: 'var(--text)' }}>{e.term}</h2>
            <p className="mt-0.5 text-[14px] font-semibold" style={{ color: 'var(--accent)' }}>{e.short}</p>
            <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: 'var(--text2)' }}>{e.text}</p>
            {e.example && (
              <p className="mt-2.5 text-[12.5px] leading-relaxed" style={{ color: 'var(--text2)' }}>
                <span className="font-bold" style={{ color: 'var(--accent)' }}>דוגמה: </span>{e.example}
              </p>
            )}
          </div>
        );
      })()}

      {/* ─── Search ─── */}
      <div className="relative mb-3">
        <MagnifyingGlassIcon className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'rgb(var(--rgb-muted) / 0.7)' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="חפש מונח... (מכפיל, בטא, שורט, ETF, MACD)"
          aria-label="חיפוש במילון"
          className="w-full rounded-xl py-3 ps-11 pe-10 text-sm focus:outline-none transition-all"
          style={{ background: 'rgb(var(--rgb-card) / 0.7)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="נקה חיפוש"
            className="absolute end-3 top-1/2 -translate-y-1/2 p-1 rounded-md" style={{ color: 'var(--muted)' }}>
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ─── Category chips (with counts) ─── */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Chip label="הכל" count={TOTAL_TERMS} active={activeCat === 'all'} onClick={() => setActiveCat('all')} />
        {GLOSSARY_CATEGORIES.map(c => (
          <Chip
            key={c.key}
            label={`${c.emoji} ${c.label}`}
            count={c.terms.length}
            rgb={CAT_RGB[c.key]}
            active={activeCat === c.key}
            onClick={() => setActiveCat(activeCat === c.key ? 'all' : c.key)}
          />
        ))}
      </div>

      {/* ─── Results ─── */}
      {groups.length === 0 ? (
        <div className="rounded-2xl py-16 text-center" style={{ background: 'rgb(var(--rgb-card) / 0.5)', border: '1px solid var(--border)' }}>
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text2)' }}>{`לא נמצאו מונחים עבור "${query}"`}</p>
          <button type="button" onClick={() => setQuery('')} className="mt-3 text-[13px] font-bold" style={{ color: 'var(--accent)' }}>
            נקה חיפוש
          </button>
        </div>
      ) : (
        <>
          {q && <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>{shown} תוצאות</p>}
          <div className="space-y-8">
            {groups.map(cat => {
              const rgb = CAT_RGB[cat.key];
              return (
                <section key={cat.key} aria-labelledby={`cat-${cat.key}`}>
                  <h2 id={`cat-${cat.key}`} className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: `rgb(${rgb})`, boxShadow: `0 0 8px rgb(${rgb} / 0.6)` }} />
                    <span className="text-sm font-black" style={{ color: 'var(--text)' }}>{cat.emoji} {cat.label}</span>
                    <span className="text-[11px] font-bold" style={{ color: 'var(--muted)' }}>{cat.entries.length}</span>
                  </h2>
                  <div className="grid gap-2.5">
                    {cat.entries.map(e => (
                      <article
                        key={e.key}
                        id={e.key}
                        className="group/term rounded-2xl p-4 scroll-mt-24 transition-all"
                        style={{ background: 'rgb(var(--rgb-card) / 0.7)', border: '1px solid var(--border)' }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-[15.5px] font-black" style={{ color: 'var(--text)' }}>{e.term}</h3>
                            <p className="mt-0.5 text-[13px] font-semibold" style={{ color: 'var(--accent)' }}>{e.short}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyLink(e.key)}
                            aria-label="העתק קישור למונח"
                            className="shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-all md:opacity-0 md:group-hover/term:opacity-100"
                            style={{ color: copied === e.key ? 'var(--accent)' : 'var(--muted)', background: 'rgb(var(--rgb-card) / 0.6)', border: '1px solid var(--border)' }}
                          >
                            <LinkIcon className="w-3 h-3" />
                            {copied === e.key ? 'הועתק' : 'קישור'}
                          </button>
                        </div>
                        <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: 'var(--text2)' }}>{e.text}</p>
                        {e.example && (
                          <p className="mt-2.5 pt-2.5 text-[12.5px] leading-relaxed" style={{ borderTop: '1px solid rgb(var(--rgb-border) / 0.6)', color: 'var(--text2)' }}>
                            <span className="font-bold" style={{ color: 'var(--accent)' }}>דוגמה: </span>{e.example}
                          </p>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}

      <p className="mt-10 text-center text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
        המידע במילון הוא לצרכי לימוד בלבד ואינו מהווה ייעוץ השקעות.
      </p>
    </div>
  );
}

function Chip({ label, count, active, onClick, rgb }: { label: string; count: number; active: boolean; onClick: () => void; rgb?: string }) {
  // Active state uses theme accent tokens (contrast-safe in both themes);
  // the per-category color appears only as a small decorative dot.
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-95"
      style={active
        ? { background: 'rgb(var(--rgb-accent) / 0.15)', color: 'var(--accent)', border: '1px solid rgb(var(--rgb-accent) / 0.3)' }
        : { background: 'rgb(var(--rgb-card) / 0.6)', color: 'var(--text2)', border: '1px solid var(--border)' }}
    >
      {rgb && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: `rgb(${rgb})` }} />}
      <span>{label}</span>
      <span className="text-[10px] font-black opacity-60">{count}</span>
    </button>
  );
}

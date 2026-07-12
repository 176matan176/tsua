'use client';

import { useMemo, useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { DICTIONARY, GLOSSARY_CATEGORIES, type DictEntry } from '@/lib/financialDictionary';

const TOTAL_TERMS = GLOSSARY_CATEGORIES.reduce((n, c) => n + c.terms.length, 0);

export function GlossaryClient() {
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string>('all');

  const q = query.trim();

  // Group + filter in one pass. Empty categories drop out.
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

  return (
    <div dir="rtl" className="max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <span className="text-3xl">📖</span>
          <h1 className="text-2xl md:text-3xl font-black" style={{ color: 'var(--text)' }}>מילון המשקיע</h1>
        </div>
        <p className="mt-2 text-sm md:text-[15px] leading-relaxed" style={{ color: 'var(--text2)' }}>
          כל המונחים שסוחר חייב להכיר — בעברית פשוטה, עם דוגמאות. {TOTAL_TERMS} מונחים ועוד באים.
        </p>
      </header>

      {/* Search */}
      <div className="relative mb-4">
        <MagnifyingGlassIcon
          className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: 'rgb(var(--rgb-muted) / 0.7)' }}
        />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="חפש מונח... (מכפיל, בטא, שורט, שוק שורי)"
          aria-label="חיפוש במילון"
          className="w-full rounded-xl py-3 ps-11 pe-10 text-sm focus:outline-none transition-all"
          style={{
            background: 'rgb(var(--rgb-card) / 0.7)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="נקה חיפוש"
            className="absolute end-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors"
            style={{ color: 'var(--muted)' }}
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Chip label="הכל" active={activeCat === 'all'} onClick={() => setActiveCat('all')} />
        {GLOSSARY_CATEGORIES.map(c => (
          <Chip
            key={c.key}
            label={`${c.emoji} ${c.label}`}
            active={activeCat === c.key}
            onClick={() => setActiveCat(activeCat === c.key ? 'all' : c.key)}
          />
        ))}
      </div>

      {/* Results */}
      {groups.length === 0 ? (
        <div
          className="rounded-2xl py-16 text-center"
          style={{ background: 'rgb(var(--rgb-card) / 0.5)', border: '1px solid var(--border)' }}
        >
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm" style={{ color: 'var(--text2)' }}>
            {`לא נמצאו מונחים עבור "${query}"`}
          </p>
        </div>
      ) : (
        <>
          {q && (
            <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
              {shown} תוצאות
            </p>
          )}
          <div className="space-y-8">
            {groups.map(cat => (
              <section key={cat.key} aria-labelledby={`cat-${cat.key}`}>
                <h2
                  id={`cat-${cat.key}`}
                  className="text-sm font-black mb-3 flex items-center gap-2"
                  style={{ color: 'var(--accent)' }}
                >
                  <span>{cat.emoji}</span>{cat.label}
                </h2>
                <div className="grid gap-3">
                  {cat.entries.map(e => (
                    <article
                      key={e.key}
                      id={e.key}
                      className="rounded-2xl p-4 scroll-mt-24 transition-colors"
                      style={{ background: 'rgb(var(--rgb-card) / 0.7)', border: '1px solid var(--border)' }}
                    >
                      <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <h3 className="text-base font-black" style={{ color: 'var(--text)' }}>{e.term}</h3>
                        <span className="text-[13px] font-semibold" style={{ color: 'var(--accent)' }}>{e.short}</span>
                      </div>
                      <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: 'var(--text2)' }}>
                        {e.text}
                      </p>
                      {e.example && (
                        <p
                          className="mt-2.5 pt-2.5 text-[12.5px] leading-relaxed"
                          style={{ borderTop: '1px solid rgb(var(--rgb-accent) / 0.15)', color: 'var(--text2)' }}
                        >
                          <span className="font-bold" style={{ color: 'var(--accent)' }}>דוגמה: </span>
                          {e.example}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      {/* Footer note */}
      <p className="mt-10 text-center text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
        המידע במילון הוא לצרכי לימוד בלבד ואינו מהווה ייעוץ השקעות.
      </p>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[12.5px] font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-95"
      style={active
        ? { background: 'rgb(var(--rgb-accent) / 0.15)', color: 'var(--accent)', border: '1px solid rgb(var(--rgb-accent) / 0.3)' }
        : { background: 'rgb(var(--rgb-card) / 0.6)', color: 'var(--text2)', border: '1px solid var(--border)' }}
    >
      {label}
    </button>
  );
}

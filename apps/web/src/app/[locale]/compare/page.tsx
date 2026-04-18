import { Suspense } from 'react';
import { CompareClient } from './CompareClient';

export const metadata = {
  title: 'השוואת מניות | תשואה',
  description: 'השווה עד 4 מניות זה לצד זה על המכפילים והביצועים החשובים',
};

export default function ComparePage() {
  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <header className="rounded-2xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <h1 className="text-2xl font-black text-tsua-text mb-2">⚖️ השוואת מניות</h1>
        <p className="text-sm text-tsua-muted leading-relaxed max-w-2xl">
          הוסף עד 4 מניות וראה אותן זו לצד זו — מחיר, מכפילים, ביצועים, ודיבידנד.
          שתף את הקישור כדי להציג את אותה השוואה לחבר.
        </p>
      </header>

      <Suspense fallback={<div className="h-40 rounded-2xl animate-pulse" style={{ background: 'var(--card)' }} />}>
        <CompareClient />
      </Suspense>
    </div>
  );
}

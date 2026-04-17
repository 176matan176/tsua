import { CryptoGrid } from '@/components/crypto/CryptoGrid';

export const metadata = {
  title: 'קריפטו | תשואה',
  description: 'מחירי 20 המטבעות הקריפטוגרפיים הגדולים בזמן אמת',
};

export default function CryptoPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <header className="rounded-2xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-tsua-text mb-2">₿ קריפטו</h1>
            <p className="text-sm text-tsua-muted leading-relaxed max-w-2xl">
              20 המטבעות הדיגיטליים הגדולים בעולם לפי שווי שוק — מחירים חיים מ-CoinGecko,
              מתעדכנים כל דקה. לחץ על מטבע לפרטים מלאים וגרף שבועי.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg shrink-0"
            style={{ background: 'rgba(247,147,26,0.08)', border: '1px solid rgba(247,147,26,0.25)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#f7931a' }} />
            <span className="text-xs font-bold" style={{ color: '#f7931a' }}>24/7 LIVE</span>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-xl text-[11px] leading-relaxed"
          style={{ background: 'rgba(247,147,26,0.05)', border: '1px solid rgba(247,147,26,0.15)', color: '#c8d8f0' }}
        >
          <span className="font-bold" style={{ color: '#f7931a' }}>⚠️ חשוב:</span>{' '}
          קריפטו הוא נכס תנודתי במיוחד. מחירים יכולים לנוע ב-10%+ ביום. הנתונים כאן הם למטרת מידע בלבד —
          אינם מהווים ייעוץ השקעות.
        </div>
      </header>

      <CryptoGrid />
    </div>
  );
}

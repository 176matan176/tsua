import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

interface Quote { c: number; d: number; dp: number; h: number; l: number; pc: number; }

async function fetchQuote(ticker: string): Promise<Quote | null> {
  if (!FINNHUB_KEY) return null;
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_KEY}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    const q = await res.json();
    return q?.c ? q : null;
  } catch { return null; }
}

export async function GET(
  req: Request,
  { params }: { params: { ticker: string } },
) {
  const ticker = params.ticker.toUpperCase();
  const url = new URL(req.url);
  const nameHe = url.searchParams.get('name') || ticker;

  const quote = await fetchQuote(ticker);
  const price = quote?.c;
  const changePct = quote?.dp ?? 0;
  const up = changePct >= 0;

  const accent = up ? '#00e5b0' : '#ff4d6a';
  const glow = up ? 'rgba(0,229,176,0.22)' : 'rgba(255,77,106,0.22)';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #060b16 0%, #0d1424 50%, #060b16 100%)',
          display: 'flex',
          flexDirection: 'column',
          padding: '56px 72px',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{
          position: 'absolute', top: '-140px', right: '-140px', width: '560px', height: '560px',
          borderRadius: '50%', background: `radial-gradient(circle, ${glow}, transparent 70%)`,
        }} />
        <div style={{
          position: 'absolute', bottom: '-140px', left: '-140px', width: '520px', height: '520px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.14), transparent 70%)',
        }} />

        {/* Top header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #00e5b0, #00a884)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px rgba(0,229,176,0.4)',
          }}>
            <span style={{ color: '#060b16', fontSize: 38, fontWeight: 900 }}>ת</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#e8f0ff', fontSize: 26, fontWeight: 900, letterSpacing: -1 }}>תשואה</span>
            <span style={{ color: '#5a7090', fontSize: 14, letterSpacing: 4, textTransform: 'uppercase' }}>TSUA · STOCK PROFILE</span>
          </div>
        </div>

        {/* Ticker hero */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 52 }}>
          <div style={{ color: accent, fontSize: 22, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase' }}>
            {up ? '▲ עלייה' : '▼ ירידה'}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 20, marginTop: 10 }}>
            <span style={{ color: '#ffffff', fontSize: 120, fontWeight: 900, letterSpacing: -4, lineHeight: 1 }}>
              {ticker}
            </span>
          </div>
          <div style={{ color: '#b3c2d6', fontSize: 34, fontWeight: 600, marginTop: 14, maxWidth: 900 }}>
            {nameHe}
          </div>
        </div>

        {/* Price + change cards */}
        {price != null && (
          <div style={{ display: 'flex', gap: 20, marginTop: 44 }}>
            <div style={{
              display: 'flex', flexDirection: 'column', padding: '20px 28px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, minWidth: 220,
            }}>
              <span style={{ color: '#5a7090', fontSize: 14, letterSpacing: 2, textTransform: 'uppercase' }}>מחיר</span>
              <span style={{ color: '#ffffff', fontSize: 48, fontWeight: 900, fontFamily: 'monospace', marginTop: 4 }}>
                ${price.toFixed(2)}
              </span>
            </div>
            <div style={{
              display: 'flex', flexDirection: 'column', padding: '20px 28px',
              background: up ? 'rgba(0,229,176,0.08)' : 'rgba(255,77,106,0.08)',
              border: `1px solid ${up ? 'rgba(0,229,176,0.25)' : 'rgba(255,77,106,0.25)'}`,
              borderRadius: 16, minWidth: 220,
            }}>
              <span style={{ color: '#5a7090', fontSize: 14, letterSpacing: 2, textTransform: 'uppercase' }}>שינוי יומי</span>
              <span style={{ color: accent, fontSize: 48, fontWeight: 900, fontFamily: 'monospace', marginTop: 4 }}>
                {up ? '+' : ''}{changePct.toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          position: 'absolute', bottom: 56, left: 72, right: 72,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 18px', borderRadius: 999,
            background: 'rgba(0,229,176,0.1)', border: '1px solid rgba(0,229,176,0.28)',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00e5b0' }} />
            <span style={{ color: '#00e5b0', fontSize: 17, fontWeight: 800 }}>tsua.co</span>
          </div>
          <span style={{ color: '#5a7090', fontSize: 16 }}>הרשת החברתית של שוק ההון הישראלי</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

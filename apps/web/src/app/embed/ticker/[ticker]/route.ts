import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 60;

interface Quote { c: number; d: number; dp: number; h: number; l: number; pc: number; o: number; }

async function fetchQuote(ticker: string): Promise<Quote | null> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${key}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    const q = await res.json();
    return q?.c ? q : null;
  } catch { return null; }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  } as any)[c]);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { ticker: string } },
) {
  const ticker = decodeURIComponent(params.ticker).toUpperCase().replace(/[^A-Z0-9.]/g, '').slice(0, 12);
  if (!ticker) {
    return new NextResponse('bad ticker', { status: 400 });
  }

  const url = new URL(req.url);
  const theme = url.searchParams.get('theme') === 'light' ? 'light' : 'dark';
  const compact = url.searchParams.get('compact') === '1';

  const quote = await fetchQuote(ticker);
  const up = (quote?.dp ?? 0) >= 0;
  const accent = up ? '#00e5b0' : '#ff4d6a';

  const palette = theme === 'light'
    ? { bg: '#ffffff', border: '#e3e8ef', text: '#0a1a2e', muted: '#5a7090' }
    : { bg: '#060b16', border: '#1a2840', text: '#e8f0ff', muted: '#5a7090' };

  const changeBg = up ? 'rgba(0,229,176,0.12)' : 'rgba(255,77,106,0.12)';
  const changeBorder = up ? 'rgba(0,229,176,0.3)' : 'rgba(255,77,106,0.3)';

  const priceHtml = quote ? `
    <span style="font-family:'JetBrains Mono',monospace;font-size:${compact ? 22 : 26}px;font-weight:800;color:${palette.text};margin-inline-start:auto;">$${quote.c.toFixed(2)}</span>
  ` : '';

  const changeHtml = quote ? `
    <div style="margin-top:6px;display:flex;align-items:center;gap:10px;">
      <span style="font-family:'JetBrains Mono',monospace;font-size:${compact ? 13 : 14}px;font-weight:800;color:${accent};background:${changeBg};border:1px solid ${changeBorder};padding:2px 10px;border-radius:999px;">
        ${up ? '▲' : '▼'} ${up ? '+' : ''}${quote.dp.toFixed(2)}%
      </span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:${palette.muted};">
        ${up ? '+' : ''}$${quote.d.toFixed(2)}
      </span>
    </div>
  ` : `<div style="margin-top:8px;font-size:13px;color:${palette.muted};">מחיר לא זמין</div>`;

  const ctaHtml = compact ? '' : `
    <div style="margin-top:12px;font-size:11px;color:${palette.muted};letter-spacing:0.3px;">
      לחץ לגרף מלא, חדשות וסנטימנט בתשואה →
    </div>
  `;

  const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta name="robots" content="noindex,nofollow">
<title>${escapeHtml(ticker)} — Tsua Embed</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;800;900&family=JetBrains+Mono:wght@600;800&display=swap" rel="stylesheet">
<style>
  html,body { margin:0; padding:0; background:transparent; font-family:'Heebo','Arial Hebrew',sans-serif; }
  a.card:hover { transform: translateY(-1px); box-shadow: 0 10px 30px rgba(0,0,0,0.25); }
  a.card { transition: transform .15s, box-shadow .15s; }
</style>
</head>
<body>
<a class="card" href="https://tsua.co/he/stocks/${encodeURIComponent(ticker)}?utm_source=embed&utm_medium=widget" target="_blank" rel="noopener noreferrer"
  style="display:block;text-decoration:none;color:${palette.text};background:${palette.bg};border:1px solid ${palette.border};border-radius:14px;padding:${compact ? '12px 14px' : '18px 20px'};min-width:${compact ? 220 : 300}px;max-width:420px;">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,#00e5b0,#00a884);display:inline-flex;align-items:center;justify-content:center;color:#060b16;font-weight:900;font-size:12px;">ת</span>
      <span style="font-size:11px;letter-spacing:2px;color:${palette.muted};text-transform:uppercase;">TSUA</span>
    </div>
    <span style="font-size:10px;color:${palette.muted};">עודכן עכשיו</span>
  </div>
  <div style="display:flex;align-items:baseline;gap:10px;margin-top:${compact ? 8 : 12}px;">
    <span style="font-family:'JetBrains Mono',monospace;font-size:${compact ? 26 : 32}px;font-weight:900;letter-spacing:-1px;">$${escapeHtml(ticker)}</span>
    ${priceHtml}
  </div>
  ${changeHtml}
  ${ctaHtml}
</a>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=600',
      'x-frame-options': 'ALLOWALL',
      'content-security-policy': "frame-ancestors *",
    },
  });
}

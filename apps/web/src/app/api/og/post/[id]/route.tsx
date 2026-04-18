import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

async function fetchPost(id: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const supa = createClient(url, key, { auth: { persistSession: false } });
    const { data } = await supa
      .from('posts')
      .select('id,body,stock_mentions,author:profiles(username,display_name,avatar_url)')
      .eq('id', id)
      .single();
    return data;
  } catch { return null; }
}

function truncate(s: string, n: number) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const post = await fetchPost(params.id);
  const body = truncate(post?.body ?? 'פוסט בתשואה', 220);
  const author = (post as any)?.author;
  const authorName = author?.display_name || author?.username || 'משתמש תשואה';
  const mentions: string[] = Array.isArray(post?.stock_mentions) ? post!.stock_mentions.slice(0, 4) : [];

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
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        <div style={{
          position: 'absolute', top: '-140px', right: '-140px', width: '520px', height: '520px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,176,0.18), transparent 70%)',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg, #00e5b0, #00a884)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#060b16', fontSize: 32, fontWeight: 900 }}>ת</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#e8f0ff', fontSize: 22, fontWeight: 900 }}>תשואה</span>
            <span style={{ color: '#5a7090', fontSize: 13, letterSpacing: 3, textTransform: 'uppercase' }}>
              פוסט מאת {authorName}
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{
          display: 'flex',
          color: '#e8f0ff',
          fontSize: 40,
          fontWeight: 700,
          lineHeight: 1.35,
          letterSpacing: -0.5,
          marginTop: 60,
          maxWidth: 1060,
        }}>
          {body}
        </div>

        {/* Mentions */}
        {mentions.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginTop: 36, flexWrap: 'wrap' }}>
            {mentions.map(m => (
              <div key={m} style={{
                padding: '10px 18px',
                background: 'rgba(0,229,176,0.1)',
                border: '1px solid rgba(0,229,176,0.3)',
                borderRadius: 999,
                color: '#00e5b0',
                fontSize: 22,
                fontWeight: 900,
                fontFamily: 'monospace',
              }}>
                ${m}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{
          position: 'absolute', bottom: 48, left: 72, right: 72,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ color: '#5a7090', fontSize: 16 }}>הרשת החברתית של שוק ההון הישראלי</span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 18px', borderRadius: 999,
            background: 'rgba(0,229,176,0.1)', border: '1px solid rgba(0,229,176,0.28)',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00e5b0' }} />
            <span style={{ color: '#00e5b0', fontSize: 17, fontWeight: 800 }}>tsua.co</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

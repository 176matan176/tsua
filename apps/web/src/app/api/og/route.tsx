import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #060b16 0%, #0d1424 50%, #060b16 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Glow effects */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            left: '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,229,176,0.15), transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            right: '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.12), transparent 70%)',
          }}
        />

        {/* Logo */}
        <div
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #00e5b0, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '32px',
            boxShadow: '0 0 60px rgba(0,229,176,0.4)',
          }}
        >
          <span style={{ color: 'white', fontSize: '56px', fontWeight: 900 }}>ת</span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '72px',
            fontWeight: 900,
            color: '#e8f0ff',
            marginBottom: '16px',
            letterSpacing: '-2px',
          }}
        >
          תשואה
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: '28px',
            color: '#5a7090',
            textAlign: 'center',
            maxWidth: '700px',
            lineHeight: 1.4,
          }}
        >
          הרשת החברתית הראשונה לשוק ההון הישראלי
        </div>

        {/* Bottom badge */}
        <div
          style={{
            position: 'absolute',
            bottom: '48px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0,229,176,0.1)',
            border: '1px solid rgba(0,229,176,0.25)',
            borderRadius: '100px',
            padding: '8px 24px',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#00e5b0',
            }}
          />
          <span style={{ color: '#00e5b0', fontSize: '18px', fontWeight: 700 }}>
            tsua.co
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

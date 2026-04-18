'use client';

import { useEffect, useState } from 'react';
import { ClipboardDocumentIcon, CheckIcon, ShareIcon, UserPlusIcon } from '@heroicons/react/24/outline';

interface ReferralData {
  code: string | null;
  credits: number;
  invites: number;
  link: string | null;
}

export function ReferralsCard() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/referral', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .finally(() => setLoading(false));
  }, []);

  async function copy() {
    if (!data?.link) return;
    try {
      await navigator.clipboard.writeText(data.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function share() {
    if (!data?.link) return;
    const text = `הצטרף אליי לתשואה — הרשת החברתית לשוק ההון הישראלי 📈`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'תשואה', text, url: data.link });
        return;
      } catch {}
    }
    // Fallback to WhatsApp
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text + ' ' + data.link)}`,
      '_blank', 'noopener'
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl p-6 animate-pulse"
        style={{ background: 'rgba(13,20,36,0.5)', border: '1px solid var(--border)', minHeight: 180 }} />
    );
  }

  if (!data?.code) return null;

  return (
    <div
      className="rounded-2xl p-6 space-y-5"
      style={{
        background: 'linear-gradient(135deg, rgba(0,229,176,0.05), rgba(10,20,36,0.7))',
        border: '1px solid rgba(0,229,176,0.22)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #00e5b0, #00a884)', color: '#060b16' }}
        >
          <UserPlusIcon className="w-6 h-6" strokeWidth={2.5} />
        </div>
        <div>
          <div className="text-base font-black text-tsua-text">הזמן חברים · קבל נקודות</div>
          <div className="text-xs text-tsua-muted mt-0.5">
            על כל חבר שמצטרף דרך הקישור שלך — נקודת זיכוי אחת
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3 text-center"
          style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)' }}>
          <div className="text-3xl font-black font-mono" style={{ color: '#00e5b0' }}>{data.invites}</div>
          <div className="text-[10px] text-tsua-muted uppercase tracking-widest mt-1">הזמנות שהצליחו</div>
        </div>
        <div className="rounded-xl p-3 text-center"
          style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)' }}>
          <div className="text-3xl font-black font-mono" style={{ color: '#00e5b0' }}>{data.credits}</div>
          <div className="text-[10px] text-tsua-muted uppercase tracking-widest mt-1">נקודות זיכוי</div>
        </div>
      </div>

      {/* Link box */}
      <div>
        <div className="text-[11px] font-semibold text-tsua-muted uppercase tracking-widest mb-2">
          קישור ההזמנה שלך
        </div>
        <div className="flex gap-2">
          <div
            dir="ltr"
            className="flex-1 rounded-xl px-3 py-2.5 text-[12px] font-mono truncate"
            style={{
              background: 'rgba(6,11,22,0.6)',
              border: '1px solid rgba(26,40,64,0.8)',
              color: '#b3c2d6',
            }}
          >
            {data.link}
          </div>
          <button
            onClick={copy}
            className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all hover:brightness-110 active:scale-95"
            style={{
              background: copied ? 'rgba(0,229,176,0.18)' : 'rgba(0,229,176,0.1)',
              border: '1px solid rgba(0,229,176,0.3)',
              color: '#00e5b0',
              minWidth: 84,
            }}
          >
            {copied ? <CheckIcon className="w-4 h-4" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
            {copied ? 'הועתק' : 'העתק'}
          </button>
        </div>
      </div>

      {/* Share button */}
      <button
        onClick={share}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all hover:brightness-110 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #00e5b0, #00a884)',
          color: '#060b16',
          boxShadow: '0 4px 16px rgba(0,229,176,0.25)',
        }}
      >
        <ShareIcon className="w-4 h-4" strokeWidth={2.5} />
        שתף עם חברים
      </button>
    </div>
  );
}

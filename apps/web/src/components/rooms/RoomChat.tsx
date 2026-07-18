'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { PaperAirplaneIcon, TrashIcon } from '@heroicons/react/24/solid';
import { getCommunity } from '@/lib/communities';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { renderPostBody } from '@/components/feed/renderPostBody';

const REACTIONS = ['👍', '🚀', '❤️', '🐻', '🔥', '😂'];

interface Reaction { emoji: string; count: number; reacted: boolean }
interface ChatMessage {
  id: string;
  body: string;
  createdAt: string;
  isOwn: boolean;
  reactions: Reaction[];
  author: { id: string; username: string; displayName: string; avatarUrl: string | null };
}

export function RoomChat({ slug }: { slug: string }) {
  const locale = useLocale();
  const community = getCommunity(slug);
  const { user } = useAuth();
  const supabase = createClient();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [membership, setMembership] = useState<{ members: number; isMember: boolean } | null>(null);
  const [joinBusy, setJoinBusy] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch(`/api/rooms/${slug}/messages?limit=50`, { cache: 'no-store', signal });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    return Array.isArray(data.messages) ? (data.messages as ChatMessage[]) : [];
  }, [slug]);

  // Initial load + realtime (messages AND reactions → full refetch, replace).
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setLoadError(false);
    (async () => {
      try {
        const msgs = await loadMessages(ctrl.signal);
        if (!ctrl.signal.aborted) { setMessages(msgs); setLoadError(false); }
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setLoadError(true);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();

    const refetch = async () => {
      try { const msgs = await loadMessages(); setMessages(msgs); } catch { /* next event retries */ }
    };
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      const suffix = Math.random().toString(36).slice(2, 10);
      channel = supabase
        .channel(`room-chat:${slug}:${suffix}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_slug=eq.${slug}` }, () => { if (!cancelled) refetch(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions', filter: `room_slug=eq.${slug}` }, () => { if (!cancelled) refetch(); })
        .subscribe();
    } catch (err) { console.warn('[RoomChat] realtime failed', err); }

    return () => {
      cancelled = true;
      ctrl.abort();
      if (channel) { try { supabase.removeChannel(channel); } catch {} }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, retryKey]);

  // Membership state
  useEffect(() => {
    let alive = true;
    fetch(`/api/rooms/${slug}/membership`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (alive && d) setMembership(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [slug, user]);

  // Presence — "online now". Realtime-only (no DB table): everyone viewing the
  // room joins a presence channel; the sync event gives the live participant
  // set. Guests are counted too (they're here reading).
  useEffect(() => {
    const key = user?.id ?? `guest-${Math.random().toString(36).slice(2, 10)}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase.channel(`presence:room:${slug}`, { config: { presence: { key } } });
      channel
        .on('presence', { event: 'sync' }, () => {
          try { setOnlineCount(Object.keys(channel!.presenceState()).length); } catch { /* ignore */ }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            try { await channel!.track({ at: Date.now() }); } catch { /* ignore */ }
          }
        });
    } catch (err) { console.warn('[RoomChat] presence failed', err); }
    return () => { if (channel) { try { supabase.removeChannel(channel); } catch {} } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  async function toggleMembership() {
    if (!user || joinBusy) return;
    setJoinBusy(true);
    const join = !membership?.isMember;
    try {
      const res = await fetch(`/api/rooms/${slug}/membership`, { method: join ? 'POST' : 'DELETE' });
      if (res.ok) setMembership(await res.json());
    } catch { /* ignore */ } finally { setJoinBusy(false); }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending || !user) return;
    setSending(true); setSendError(null);
    try {
      const res = await fetch(`/api/rooms/${slug}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: text }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d?.error || `status ${res.status}`); }
      const created: ChatMessage = await res.json();
      setMessages(prev => (prev.some(m => m.id === created.id) ? prev : [...prev, created]));
      setInput('');
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'שליחה נכשלה');
    } finally { setSending(false); }
  }

  async function deleteMessage(id: string) {
    const snapshot = messages;
    setMessages(prev => prev.filter(m => m.id !== id)); // optimistic
    try {
      const res = await fetch(`/api/rooms/${slug}/messages/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
    } catch { setMessages(snapshot); } // revert on failure
  }

  function applyToggle(list: ChatMessage[], id: string, emoji: string): ChatMessage[] {
    return list.map(m => {
      if (m.id !== id) return m;
      const rx = [...m.reactions];
      const i = rx.findIndex(r => r.emoji === emoji);
      if (i === -1) { rx.push({ emoji, count: 1, reacted: true }); }
      else if (rx[i].reacted) {
        rx[i] = { ...rx[i], count: rx[i].count - 1, reacted: false };
        if (rx[i].count <= 0) rx.splice(i, 1);
      } else { rx[i] = { ...rx[i], count: rx[i].count + 1, reacted: true }; }
      return { ...m, reactions: rx };
    });
  }

  async function toggleReaction(id: string, emoji: string) {
    if (!user) return;
    setPickerFor(null);
    const snapshot = messages;
    setMessages(prev => applyToggle(prev, id, emoji)); // optimistic
    try {
      const res = await fetch(`/api/rooms/${slug}/messages/${id}/react`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emoji }),
      });
      if (!res.ok) throw new Error();
    } catch { setMessages(snapshot); }
  }

  return (
    <div className="bg-tsua-card border border-tsua-border rounded-2xl flex flex-col h-[600px]">
      {/* Header */}
      <div className="border-b border-tsua-border px-4 py-3 flex items-center gap-2">
        <span className="text-tsua-green font-bold">{community?.icon ?? '👥'}</span>
        <h2 className="font-bold text-tsua-text">
          {community ? (locale === 'he' ? community.nameHe : community.nameEn) : (locale === 'he' ? 'קהילה' : 'Community')}
        </h2>
        <span className="text-xs ms-auto flex items-center gap-1.5" style={{ color: onlineCount > 0 ? 'var(--accent)' : 'var(--muted)' }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: onlineCount > 0 ? 'var(--accent)' : 'var(--muted)' }} />
          <span className="tabular-nums" dir="ltr">{onlineCount || 1}</span> {locale === 'he' ? 'מחוברים' : 'online'}
          {membership && membership.members > 0 && (
            <span className="text-tsua-muted">· <span className="tabular-nums" dir="ltr">{membership.members}</span> {locale === 'he' ? 'חברים' : 'members'}</span>
          )}
        </span>
        {user && (
          <button
            onClick={toggleMembership}
            disabled={joinBusy}
            className="text-xs font-bold px-3 py-1 rounded-full transition-all disabled:opacity-50 shrink-0"
            style={membership?.isMember
              ? { background: 'transparent', color: 'var(--muted)', border: '1px solid rgb(var(--rgb-border))' }
              : { background: 'var(--accent)', color: 'var(--bg)', border: '1px solid var(--accent)' }}
          >
            {membership?.isMember ? (locale === 'he' ? '✓ חבר' : '✓ Member') : (locale === 'he' ? 'הצטרף' : 'Join')}
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && [1, 2, 3].map(i => (
          <div key={i} className="flex gap-2.5 animate-pulse">
            <div className="w-8 h-8 rounded-full shrink-0" style={{ background: 'rgb(var(--rgb-border) / 0.7)' }} />
            <div className="flex-1 space-y-1.5 pt-1">
              <div className="h-2.5 w-24 rounded" style={{ background: 'rgb(var(--rgb-border) / 0.7)' }} />
              <div className="h-3 w-2/3 rounded" style={{ background: 'rgb(var(--rgb-border) / 0.5)' }} />
            </div>
          </div>
        ))}

        {!loading && loadError && (
          <div className="text-center py-10">
            <div className="text-3xl mb-2">📡</div>
            <div className="text-sm text-tsua-muted mb-3">לא הצלחנו לטעון את ההודעות</div>
            <button onClick={() => setRetryKey(k => k + 1)} className="text-xs font-bold px-4 py-2 rounded-lg"
              style={{ background: 'rgb(var(--rgb-accent) / 0.1)', color: 'var(--accent)', border: '1px solid rgb(var(--rgb-accent) / 0.3)' }}>
              🔄 נסה שוב
            </button>
          </div>
        )}

        {!loading && !loadError && messages.length === 0 && (
          <div className="text-center py-10">
            <div className="text-3xl mb-2">💬</div>
            <div className="text-sm text-tsua-muted">אין הודעות עדיין — פתחו את הדיון!</div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-2.5 group">
            {msg.author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={msg.author.avatarUrl} alt="" className="w-8 h-8 rounded-full shrink-0 object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-tsua-green/20 flex items-center justify-center text-tsua-green text-xs font-bold shrink-0">
                {msg.author.displayName.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link href={`/${locale}/profile/${msg.author.username}`} className="text-xs font-semibold text-tsua-text hover:text-tsua-accent transition-colors">
                  {msg.author.displayName}
                </Link>
                <span className="text-[10px] text-tsua-muted" suppressHydrationWarning>
                  {new Date(msg.createdAt).toLocaleTimeString(locale === 'he' ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.isOwn && (
                  <button
                    onClick={() => deleteMessage(msg.id)}
                    aria-label={locale === 'he' ? 'מחק הודעה' : 'Delete message'}
                    className="ms-auto opacity-0 group-hover:opacity-100 transition-opacity text-tsua-muted hover:text-tsua-red"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p dir="auto" className="text-sm text-tsua-text/90 mt-0.5 break-words">
                {renderPostBody(msg.body, { locale })}
              </p>

              {/* Reactions */}
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {msg.reactions.map(r => (
                  <button
                    key={r.emoji}
                    onClick={() => toggleReaction(msg.id, r.emoji)}
                    disabled={!user}
                    className="text-xs px-2 py-0.5 rounded-full transition-all tabular-nums disabled:cursor-default"
                    style={r.reacted
                      ? { background: 'rgb(var(--rgb-accent) / 0.14)', border: '1px solid rgb(var(--rgb-accent) / 0.35)', color: 'var(--accent)' }
                      : { background: 'rgb(var(--rgb-border) / 0.3)', border: '1px solid rgb(var(--rgb-border) / 0.5)', color: 'var(--text2)' }}
                  >
                    {r.emoji} {r.count}
                  </button>
                ))}
                {user && (
                  <div className="relative">
                    <button
                      onClick={() => setPickerFor(pickerFor === msg.id ? null : msg.id)}
                      aria-label={locale === 'he' ? 'הוסף ריאקציה' : 'Add reaction'}
                      className="text-xs px-2 py-0.5 rounded-full text-tsua-muted hover:text-tsua-text transition-colors"
                      style={{ border: '1px dashed rgb(var(--rgb-border) / 0.7)' }}
                    >
                      ＋
                    </button>
                    {pickerFor === msg.id && (
                      <div className="absolute z-20 mt-1 flex gap-1 p-1.5 rounded-xl"
                        style={{ background: 'rgb(var(--rgb-bg2))', border: '1px solid rgb(var(--rgb-border))', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                        {REACTIONS.map(e => (
                          <button key={e} onClick={() => toggleReaction(msg.id, e)} className="text-base hover:scale-125 transition-transform leading-none">
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer / login gate */}
      {user ? (
        <div className="border-t border-tsua-border p-3">
          {sendError && <div className="text-[11px] mb-2 text-center" style={{ color: 'var(--red)' }}>⚠️ {sendError}</div>}
          <div className="flex gap-2">
            <input
              dir="auto" value={input} maxLength={500}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder={locale === 'he' ? 'הקלד הודעה...' : 'Type a message...'}
              className="flex-1 bg-tsua-bg border border-tsua-border rounded-xl px-3 py-2 text-sm text-tsua-text placeholder:text-tsua-muted focus:outline-none focus:border-tsua-green transition-colors"
            />
            <button onClick={sendMessage} disabled={!input.trim() || sending}
              aria-label={locale === 'he' ? 'שלח הודעה' : 'Send message'}
              className="bg-tsua-green text-tsua-bg p-2.5 rounded-xl hover:bg-tsua-green/90 disabled:opacity-40 transition-all">
              <PaperAirplaneIcon className="w-4 h-4" style={{ transform: locale === 'he' ? 'scaleX(-1)' : 'none' }} />
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-tsua-border p-3 text-center">
          <Link href={`/${locale}/login`} className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
            {locale === 'he' ? '🔐 התחבר כדי להשתתף בשיחה' : '🔐 Log in to join the conversation'}
          </Link>
        </div>
      )}
    </div>
  );
}

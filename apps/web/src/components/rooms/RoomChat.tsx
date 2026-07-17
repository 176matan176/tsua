'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { getCommunity } from '@/lib/communities';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { renderPostBody } from '@/components/feed/renderPostBody';

interface ChatMessage {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

interface RoomChatProps {
  slug: string;
}

/**
 * Real community chat backed by Supabase (table: room_messages).
 *
 * - Initial load + sends go through /api/rooms/[slug]/messages (rate-limited,
 *   validated server-side).
 * - Live updates via Supabase Realtime postgres_changes INSERTs filtered to
 *   this room — same proven pattern as FeedStream. On an event we refetch the
 *   latest few and merge-dedupe (the realtime payload lacks the profile join).
 * - Guests see the conversation but must log in to participate.
 */
export function RoomChat({ slug }: RoomChatProps) {
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
  const bottomRef = useRef<HTMLDivElement>(null);

  const mergeMessages = useCallback((incoming: ChatMessage[]) => {
    setMessages(prev => {
      const seen = new Set(prev.map(m => m.id));
      const fresh = incoming.filter(m => !seen.has(m.id));
      if (fresh.length === 0) return prev;
      return [...prev, ...fresh].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });
  }, []);

  // Initial load + realtime subscription
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setLoadError(false);
    setMessages([]);

    (async () => {
      try {
        const res = await fetch(`/api/rooms/${slug}/messages?limit=50`, {
          cache: 'no-store',
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        if (ctrl.signal.aborted) return;
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        setLoadError(false);
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setLoadError(true);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();

    // Realtime — unique channel per mount (StrictMode/HMR safety, same as
    // FeedStream), filtered server-side to this room only.
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      const suffix = Math.random().toString(36).slice(2, 10);
      channel = supabase
        .channel(`room-chat:${slug}:${suffix}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_slug=eq.${slug}` },
          async () => {
            if (cancelled) return;
            try {
              const res = await fetch(`/api/rooms/${slug}/messages?limit=10`, { cache: 'no-store' });
              if (!res.ok || cancelled) return;
              const data = await res.json();
              if (Array.isArray(data.messages)) mergeMessages(data.messages);
            } catch { /* next event will retry */ }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('[RoomChat] realtime subscribe failed', err);
    }

    return () => {
      cancelled = true;
      ctrl.abort();
      if (channel) {
        try { supabase.removeChannel(channel); } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, retryKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending || !user) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(`/api/rooms/${slug}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `status ${res.status}`);
      }
      const created: ChatMessage = await res.json();
      mergeMessages([created]);
      setInput('');
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'שליחה נכשלה');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-tsua-card border border-tsua-border rounded-2xl flex flex-col h-[600px]">
      {/* Header — resolved from the slug; unknown slug gets a generic title */}
      <div className="border-b border-tsua-border px-4 py-3 flex items-center gap-2">
        <span className="text-tsua-green font-bold">{community?.icon ?? '👥'}</span>
        <h2 className="font-bold text-tsua-text">
          {community
            ? (locale === 'he' ? community.nameHe : community.nameEn)
            : (locale === 'he' ? 'קהילה' : 'Community')}
        </h2>
        {community && (
          <span className="text-xs text-tsua-muted ms-auto truncate">
            {locale === 'he' ? community.descHe : community.descEn}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-2.5 animate-pulse">
                <div className="w-8 h-8 rounded-full shrink-0" style={{ background: 'rgb(var(--rgb-border) / 0.7)' }} />
                <div className="flex-1 space-y-1.5 pt-1">
                  <div className="h-2.5 w-24 rounded" style={{ background: 'rgb(var(--rgb-border) / 0.7)' }} />
                  <div className="h-3 w-2/3 rounded" style={{ background: 'rgb(var(--rgb-border) / 0.5)' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && loadError && (
          <div className="text-center py-10">
            <div className="text-3xl mb-2">📡</div>
            <div className="text-sm text-tsua-muted mb-3">לא הצלחנו לטעון את ההודעות</div>
            <button
              onClick={() => setRetryKey(k => k + 1)}
              className="text-xs font-bold px-4 py-2 rounded-lg"
              style={{ background: 'rgb(var(--rgb-accent) / 0.1)', color: 'var(--accent)', border: '1px solid rgb(var(--rgb-accent) / 0.3)' }}
            >
              🔄 נסה שוב
            </button>
          </div>
        )}

        {!loading && !loadError && messages.length === 0 && (
          <div className="text-center py-10">
            <div className="text-3xl mb-2">💬</div>
            <div className="text-sm text-tsua-muted">
              {locale === 'he' ? 'אין הודעות עדיין — פתחו את הדיון!' : 'No messages yet — start the conversation!'}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-2.5">
            {msg.author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={msg.author.avatarUrl}
                alt=""
                className="w-8 h-8 rounded-full shrink-0 object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-tsua-green/20 flex items-center justify-center text-tsua-green text-xs font-bold shrink-0">
                {msg.author.displayName.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={`/${locale}/profile/${msg.author.username}`}
                  className="text-xs font-semibold text-tsua-text hover:text-tsua-accent transition-colors"
                >
                  {msg.author.displayName}
                </Link>
                <span className="text-[10px] text-tsua-muted" suppressHydrationWarning>
                  {new Date(msg.createdAt).toLocaleTimeString(locale === 'he' ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p dir="auto" className="text-sm text-tsua-text/90 mt-0.5 break-words">
                {renderPostBody(msg.body, { locale })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer — gated on auth */}
      {user ? (
        <div className="border-t border-tsua-border p-3">
          {sendError && (
            <div className="text-[11px] mb-2 text-center" style={{ color: 'var(--red)' }}>
              ⚠️ {sendError}
            </div>
          )}
          <div className="flex gap-2">
            <input
              dir="auto"
              value={input}
              maxLength={500}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder={locale === 'he' ? 'הקלד הודעה...' : 'Type a message...'}
              className="flex-1 bg-tsua-bg border border-tsua-border rounded-xl px-3 py-2 text-sm text-tsua-text placeholder:text-tsua-muted focus:outline-none focus:border-tsua-green transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              aria-label={locale === 'he' ? 'שלח הודעה' : 'Send message'}
              className="bg-tsua-green text-tsua-bg p-2.5 rounded-xl hover:bg-tsua-green/90 disabled:opacity-40 transition-all"
            >
              <PaperAirplaneIcon className="w-4 h-4" style={{ transform: locale === 'he' ? 'scaleX(-1)' : 'none' }} />
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-tsua-border p-3 text-center">
          <Link
            href={`/${locale}/login`}
            className="text-sm font-bold"
            style={{ color: 'var(--accent)' }}
          >
            {locale === 'he' ? '🔐 התחבר כדי להשתתף בשיחה' : '🔐 Log in to join the conversation'}
          </Link>
        </div>
      )}
    </div>
  );
}

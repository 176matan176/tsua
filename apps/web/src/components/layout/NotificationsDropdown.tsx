'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellSolid } from '@heroicons/react/24/solid';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  actor: { id: string; username: string; displayName: string | null; avatarUrl: string | null } | null;
}

const TYPE_ICON: Record<string, string> = {
  new_follower:    '👤',
  post_liked:      '❤️',
  post_reply:      '💬',
  alert_triggered: '🔔',
  mention:         '@',
};

export function NotificationsDropdown({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=20');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setLoaded(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Open → fetch if not loaded
  useEffect(() => {
    if (open && !loaded) fetchNotifications();
  }, [open, loaded, fetchNotifications]);

  // Realtime subscription — new notifications
  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as any;
          const newNotif: Notification = {
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.body,
            link: n.link,
            isRead: false,
            createdAt: n.created_at,
            actor: null,
          };
          setNotifications(prev => [newNotif, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PATCH' });
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }

  function handleOpen() {
    setOpen(o => !o);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-xl text-tsua-muted hover:text-tsua-text transition-all duration-200 hover:bg-tsua-card"
      >
        {unreadCount > 0
          ? <BellSolid className="w-5 h-5" style={{ color: '#00e5b0' }} />
          : <BellIcon className="w-5 h-5" />
        }
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -end-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center"
            style={{ background: '#ff4d6a', color: '#fff', boxShadow: '0 0 8px rgba(255,77,106,0.6)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute end-0 top-full mt-2 w-80 rounded-2xl overflow-hidden z-50"
          style={{
            background: 'rgba(8,14,26,0.99)',
            border: '1px solid rgba(26,40,64,0.8)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(26,40,64,0.6)' }}
          >
            <span className="text-sm font-black text-tsua-text">
              🔔 התראות
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-[10px] font-bold text-tsua-muted hover:text-tsua-accent transition-colors px-2 py-1 rounded-lg hover:bg-tsua-card"
              >
                <CheckIcon className="w-3 h-3" />
                סמן הכל כנקרא
              </button>
            )}
          </div>

          {/* Content */}
          <div className="max-h-[380px] overflow-y-auto">
            {loading && (
              <div className="space-y-0 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid rgba(26,40,64,0.3)' }}>
                    <div className="w-9 h-9 rounded-full shrink-0" style={{ background: 'rgba(26,40,64,0.5)' }} />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-3/4 rounded" style={{ background: 'rgba(26,40,64,0.5)' }} />
                      <div className="h-2.5 w-1/2 rounded" style={{ background: 'rgba(26,40,64,0.35)' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <div className="text-3xl mb-2">🔕</div>
                <div className="text-sm text-tsua-muted">
                  אין התראות עדיין
                </div>
              </div>
            )}

            {!loading && notifications.map(n => {
              const initial = (n.actor?.displayName ?? n.actor?.username ?? '?').charAt(0).toUpperCase();
              const timeAgo = formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: he });

              const content = (
                <div
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/3 cursor-pointer"
                  style={{
                    borderBottom: '1px solid rgba(26,40,64,0.3)',
                    background: n.isRead ? 'transparent' : 'rgba(0,229,176,0.02)',
                  }}
                >
                  {/* Actor avatar */}
                  <div className="shrink-0 relative">
                    {n.actor?.avatarUrl ? (
                      <img src={n.actor.avatarUrl} className="w-9 h-9 rounded-full object-cover" alt="" />
                    ) : (
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-tsua-bg"
                        style={{ background: 'linear-gradient(135deg, #00e5b0, #3b82f6)' }}
                      >
                        {n.actor ? initial : TYPE_ICON[n.type] ?? '🔔'}
                      </div>
                    )}
                    {/* Type icon badge */}
                    <span
                      className="absolute -bottom-0.5 -end-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px]"
                      style={{ background: 'rgba(8,14,26,1)', border: '1px solid rgba(26,40,64,0.6)' }}
                    >
                      {TYPE_ICON[n.type] ?? '🔔'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-tsua-text leading-snug">{n.title}</p>
                      {!n.isRead && (
                        <div className="w-2 h-2 rounded-full shrink-0 mt-0.5" style={{ background: '#00e5b0' }} />
                      )}
                    </div>
                    {n.body && (
                      <p className="text-[11px] text-tsua-muted mt-0.5 truncate">{n.body}</p>
                    )}
                    <p className="text-[10px] text-tsua-muted mt-1 opacity-60">{timeAgo}</p>
                  </div>
                </div>
              );

              return n.link ? (
                <Link key={n.id} href={n.link} onClick={() => setOpen(false)}>
                  {content}
                </Link>
              ) : (
                <div key={n.id}>{content}</div>
              );
            })}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div
              className="px-4 py-2.5 text-center"
              style={{ borderTop: '1px solid rgba(26,40,64,0.5)' }}
            >
              <button
                onClick={() => { fetchNotifications(); }}
                className="text-[11px] text-tsua-muted hover:text-tsua-accent transition-colors"
              >
                רענן
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

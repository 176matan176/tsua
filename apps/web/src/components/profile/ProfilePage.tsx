'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { PostCard } from '@/components/feed/PostCard';
import type { Post } from '@/types/shared';
import { XMarkIcon, CameraIcon } from '@heroicons/react/24/outline';

type Tab = 'posts' | 'portfolio';

const BADGE_CONFIG = {
  legend: { emoji: '👑', labelHe: 'אגדה',  labelEn: 'Legend', color: '#f5b942', bg: 'rgba(245,185,66,0.12)', border: 'rgba(245,185,66,0.3)' },
  expert:  { emoji: '⭐', labelHe: 'מומחה', labelEn: 'Expert',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
  rising:  { emoji: '🚀', labelHe: 'עולה',  labelEn: 'Rising',  color: '#00e5b0', bg: 'rgba(0,229,176,0.12)', border: 'rgba(0,229,176,0.3)' },
};

interface ProfileData {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  is_verified: boolean;
  rating?: number;
  followers: number;
  following: number;
  post_count: number;
  created_at: string;
  isMe: boolean;
  isFollowing: boolean;
}

function EditProfileModal({
  profile,
  onClose,
  onSave,
}: {
  profile: ProfileData;
  onClose: () => void;
  onSave: (updated: Partial<ProfileData>) => void;
}) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '');
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bucket', 'avatars');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'שגיאה בהעלאת תמונה');
      }
      const { url } = await res.json();
      setAvatarUrl(url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAvatarUploading(false);
      if (avatarFileRef.current) avatarFileRef.current.value = '';
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const body: Record<string, string> = {};
      if (displayName !== profile.display_name) body.display_name = displayName;
      if (bio !== (profile.bio ?? '')) body.bio = bio;
      if (avatarUrl !== (profile.avatar_url ?? '')) body.avatar_url = avatarUrl;

      if (!Object.keys(body).length) { onClose(); return; }

      const res = await fetch('/api/profile/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'שגיאה בשמירה');
      } else {
        onSave({ display_name: displayName, bio, avatar_url: avatarUrl });
        onClose();
      }
    } catch {
      setError('שגיאת רשת');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'rgba(10,16,30,0.99)', border: '1px solid rgba(26,40,64,0.8)', boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(26,40,64,0.6)' }}>
          <h2 className="text-base font-black text-tsua-text">
            {'עריכת פרופיל'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-xl text-tsua-muted hover:text-tsua-text hover:bg-tsua-card transition-all">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-16 h-16 rounded-2xl object-cover" />
              ) : (
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-tsua-bg"
                  style={{ background: 'linear-gradient(135deg, #00e5b0, #3b82f6)' }}
                >
                  {(displayName || profile.username).charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => avatarFileRef.current?.click()}
                disabled={avatarUploading}
                className="absolute -bottom-1.5 -end-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50"
                style={{ background: 'rgba(0,229,176,1)', boxShadow: '0 2px 8px rgba(0,229,176,0.4)' }}
              >
                {avatarUploading
                  ? <span className="w-3 h-3 border-2 border-tsua-bg border-t-transparent rounded-full animate-spin block" />
                  : <CameraIcon className="w-3.5 h-3.5 text-tsua-bg" />
                }
              </button>
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-tsua-muted mb-1">{'תמונת פרופיל'}</p>
              <input
                ref={avatarFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <button
                type="button"
                onClick={() => avatarFileRef.current?.click()}
                disabled={avatarUploading}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all disabled:opacity-50"
                style={{ background: 'rgba(0,229,176,0.1)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.2)' }}
              >
                {avatarUploading ? 'מעלה...' : 'העלה תמונה'}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="text-xs text-tsua-muted hover:text-tsua-text transition-colors ms-2"
                >
                  הסר
                </button>
              )}
            </div>
          </div>

          {/* Display name */}
          <div>
            <label className="text-[11px] font-bold tracking-wider uppercase text-tsua-muted block mb-1.5">
              {'שם תצוגה'}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={50}
              placeholder={profile.username}
              className="w-full rounded-xl px-3 py-2 text-sm placeholder:text-tsua-muted focus:outline-none transition-all"
              style={{
                background: 'rgba(15,25,41,0.6)',
                border: '1px solid rgba(26,40,64,0.6)',
                color: '#e8f0ff',
              }}
              onFocus={e => {
                e.target.style.border = '1px solid rgba(0,229,176,0.3)';
                e.target.style.boxShadow = '0 0 0 3px rgba(0,229,176,0.06)';
              }}
              onBlur={e => {
                e.target.style.border = '1px solid rgba(26,40,64,0.6)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Bio */}
          <div>
            <label className="text-[11px] font-bold tracking-wider uppercase text-tsua-muted block mb-1.5">
              {'ביוגרפיה'}
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              maxLength={160}
              placeholder="ספר על עצמך..."
              className="w-full resize-none rounded-xl px-3 py-2 text-sm placeholder:text-tsua-muted focus:outline-none transition-all"
              style={{
                background: 'rgba(15,25,41,0.6)',
                border: '1px solid rgba(26,40,64,0.6)',
                color: '#e8f0ff',
              }}
              onFocus={e => {
                e.target.style.border = '1px solid rgba(0,229,176,0.3)';
                e.target.style.boxShadow = '0 0 0 3px rgba(0,229,176,0.06)';
              }}
              onBlur={e => {
                e.target.style.border = '1px solid rgba(26,40,64,0.6)';
                e.target.style.boxShadow = 'none';
              }}
            />
            <div className="text-right text-[10px] text-tsua-muted mt-1">{bio.length}/160</div>
          </div>

          {error && (
            <div className="text-xs text-red-400 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.2)' }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-tsua-muted hover:text-tsua-text transition-colors"
            style={{ background: 'rgba(15,25,41,0.5)', border: '1px solid rgba(26,40,64,0.7)' }}
          >
            {'ביטול'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-black text-tsua-bg transition-all disabled:opacity-50 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #00e5b0, #00c49a)', boxShadow: '0 4px 16px rgba(0,229,176,0.25)' }}
          >
            {saving ? 'שומר...' : 'שמור שינויים'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProfilePage({ username }: { username: string }) {
  const locale = useLocale();
  const { user } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('posts');
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      const res = await fetch(`/api/profile/${username}`, { cache: 'no-store' });
      if (!res.ok) { setNotFound(true); setLoading(false); return; }
      const data = await res.json();
      setProfile(data.profile);
      setPosts(data.posts ?? []);
      setLoading(false);
    }
    fetchProfile();
  }, [username]);

  async function toggleFollow() {
    if (!user || !profile) return;
    setFollowLoading(true);
    const res = await fetch(`/api/profile/${username}`, { method: 'POST' });
    if (res.ok) {
      const { following } = await res.json();
      setProfile(prev => prev ? {
        ...prev,
        isFollowing: following,
        followers: following ? prev.followers + 1 : prev.followers - 1,
      } : null);
    }
    setFollowLoading(false);
  }

  function handleProfileSave(updated: Partial<ProfileData>) {
    setProfile(prev => prev ? { ...prev, ...updated } : null);
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(26,40,64,0.8)' }}>
          <div className="h-32" style={{ background: 'rgba(26,40,64,0.5)' }} />
          <div className="px-4 pb-4 pt-2 space-y-2" style={{ background: 'rgba(15,25,41,0.9)' }}>
            <div className="w-16 h-16 rounded-2xl -mt-8" style={{ background: 'rgba(26,40,64,0.8)' }} />
            <div className="w-32 h-4 rounded" style={{ background: 'rgba(26,40,64,0.7)' }} />
            <div className="w-48 h-3 rounded" style={{ background: 'rgba(26,40,64,0.5)' }} />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-5xl mb-4">👤</div>
        <h2 className="text-xl font-black text-tsua-text mb-2">{'משתמש לא נמצא'}</h2>
        <p className="text-tsua-muted text-sm">@{username}</p>
      </div>
    );
  }

  const initial = (profile.display_name ?? profile.username).charAt(0).toUpperCase();
  const joinedYear = new Date(profile.created_at).getFullYear();

  return (
    <div className="space-y-4 animate-fade-in" dir="rtl">
      {editOpen && profile && (
        <EditProfileModal
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSave={handleProfileSave}
        />
      )}

      {/* Cover + Avatar + Info */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(26,40,64,0.8)' }}>
        {/* Cover */}
        <div
          className="h-28 md:h-36"
          style={{
            background: 'linear-gradient(135deg, rgba(0,229,176,0.15), rgba(59,130,246,0.15))',
          }}
        >
          <div className="h-full w-full" style={{
            background: 'radial-gradient(ellipse at 30% 50%, rgba(0,229,176,0.12), transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(59,130,246,0.1), transparent 60%)'
          }} />
        </div>

        <div className="px-4 pb-4" style={{ background: 'rgba(13,20,36,0.95)' }}>
          <div className="flex items-end justify-between -mt-8 mb-3">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-tsua-bg shrink-0"
              style={{
                background: 'linear-gradient(135deg, #00e5b0, #3b82f6)',
                boxShadow: '0 0 24px rgba(0,229,176,0.3), 0 0 0 4px rgba(13,20,36,1)',
              }}
            >
              {initial}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-8">
              {profile.isMe ? (
                <button
                  onClick={() => setEditOpen(true)}
                  className="text-sm font-semibold px-4 py-1.5 rounded-xl text-tsua-muted hover:text-tsua-text transition-all hover:border-tsua-accent/40"
                  style={{ background: 'rgba(15,25,41,0.6)', border: '1px solid rgba(26,40,64,0.8)' }}
                >
                  {'✏️ עריכת פרופיל'}
                </button>
              ) : user ? (
                <button
                  onClick={toggleFollow}
                  disabled={followLoading}
                  className="text-sm font-bold px-4 py-1.5 rounded-xl transition-all active:scale-95 disabled:opacity-60"
                  style={profile.isFollowing
                    ? { background: 'rgba(15,25,41,0.6)', border: '1px solid rgba(26,40,64,0.8)', color: '#5a7090' }
                    : { background: 'linear-gradient(135deg, #00e5b0, #00c49a)', color: '#080d1a', boxShadow: '0 4px 12px rgba(0,229,176,0.25)' }
                  }
                >
                  {profile.isFollowing ? '✓ עוקב' : '+ עקוב'}
                </button>
              ) : (
                <Link
                  href={`/${locale}/login`}
                  className="text-sm font-bold px-4 py-1.5 rounded-xl text-tsua-bg"
                  style={{ background: 'linear-gradient(135deg, #00e5b0, #00c49a)' }}
                >
                  {'+ עקוב'}
                </Link>
              )}
            </div>
          </div>

          {/* Name */}
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-black text-tsua-text">{profile.display_name ?? profile.username}</h1>
            {profile.is_verified && (
              <span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-black text-tsua-bg" style={{ background: 'linear-gradient(135deg, #00e5b0, #3b82f6)' }}>✓</span>
            )}
            {profile.rating && profile.rating >= 9 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: BADGE_CONFIG.legend.bg, color: BADGE_CONFIG.legend.color, border: `1px solid ${BADGE_CONFIG.legend.border}` }}>
                {BADGE_CONFIG.legend.emoji} {BADGE_CONFIG.legend.labelHe}
              </span>
            )}
          </div>
          <div className="text-xs text-tsua-muted mt-0.5">@{profile.username}</div>
          {profile.bio && <p className="text-sm text-tsua-text mt-2 leading-relaxed">{profile.bio}</p>}

          {/* Stats row */}
          <div className="flex flex-wrap gap-4 mt-3 text-sm">
            <span>
              <strong className="text-tsua-text font-bold">{profile.following.toLocaleString()}</strong>
              <span className="text-tsua-muted text-xs ms-1">{'עוקב'}</span>
            </span>
            <span>
              <strong className="text-tsua-text font-bold">{profile.followers.toLocaleString()}</strong>
              <span className="text-tsua-muted text-xs ms-1">{'עוקבים'}</span>
            </span>
            <span>
              <strong className="text-tsua-text font-bold">{profile.post_count.toLocaleString()}</strong>
              <span className="text-tsua-muted text-xs ms-1">{'פוסטים'}</span>
            </span>
            <span className="text-tsua-muted text-xs mt-0.5">
              {`הצטרף ${joinedYear}`}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(15,25,41,0.6)', border: '1px solid rgba(26,40,64,0.8)' }}>
        {([
          ['posts', '📝 פוסטים'],
          ['portfolio', '💼 תיק'],
        ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 text-xs font-semibold py-2 rounded-lg transition-all"
            style={tab === t
              ? { background: 'linear-gradient(135deg, #00e5b0, #00c49a)', color: '#080d1a' }
              : { color: '#5a7090' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Posts tab */}
      {tab === 'posts' && (
        <div className="space-y-3">
          {posts.length > 0 ? (
            posts.map(post => <PostCard key={post.id} post={post} />)
          ) : (
            <div
              className="rounded-2xl p-10 text-center"
              style={{ background: 'rgba(13,20,36,0.5)', border: '1px solid rgba(26,40,64,0.5)' }}
            >
              <div className="text-3xl mb-2">📝</div>
              <div className="text-tsua-muted text-sm">
                {profile.isMe
                  ? 'פרסם את הפוסט הראשון שלך!'
                  : 'עדיין אין פוסטים'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Portfolio tab */}
      {tab === 'portfolio' && (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'rgba(13,20,36,0.5)', border: '1px solid rgba(26,40,64,0.5)' }}
        >
          <div className="text-3xl mb-2">💼</div>
          <div className="text-tsua-muted text-sm mb-4">
            {profile.isMe
              ? 'נהל את התיק הוירטואלי שלך'
              : 'התיק הוירטואלי פרטי'}
          </div>
          {profile.isMe && (
            <Link
              href={`/${locale}/portfolio`}
              className="inline-block text-sm font-bold px-5 py-2 rounded-xl text-tsua-bg"
              style={{ background: 'linear-gradient(135deg, #00e5b0, #00c49a)' }}
            >
              {'לתיק שלי →'}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Admin gating.
 *
 * A user is considered an admin when their auth email matches one of the
 * comma-separated entries in the ADMIN_EMAILS env var (case-insensitive).
 *
 * This helper runs in server components and API routes — never expose
 * ADMIN_EMAILS to the client.
 */

import { createClient } from '@/lib/supabase/server';

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return raw
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function isAdminRequest(): Promise<{
  ok: boolean;
  userId: string | null;
  email: string | null;
}> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user?.email) return { ok: false, userId: null, email: null };

    const allowed = getAdminEmails();
    const ok = allowed.includes(user.email.toLowerCase());
    return { ok, userId: user.id, email: user.email };
  } catch {
    return { ok: false, userId: null, email: null };
  }
}

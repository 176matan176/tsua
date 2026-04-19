import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * Lightweight endpoint used by nav components to decide whether to show
 * the admin shortcut. The dashboard itself re-gates server-side, so this
 * is purely a UI affordance.
 */
export async function GET() {
  const auth = await isAdminRequest();
  return NextResponse.json({ isAdmin: auth.ok });
}

import { redirect } from 'next/navigation';
import { isAdminRequest } from '@/lib/adminAuth';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'חדר בקרה',
  robots: { index: false, follow: false },
};

interface Props {
  params: { locale: string };
}

/**
 * `/he/admin` — gated by ADMIN_EMAILS.
 *
 * Non-admins are silently bounced to the feed so the existence of
 * the dashboard isn't advertised in the URL.
 */
export default async function AdminPage({ params: { locale } }: Props) {
  const auth = await isAdminRequest();
  if (!auth.ok) {
    redirect(`/${locale}`);
  }

  return <AdminDashboard viewerEmail={auth.email ?? ''} locale={locale} />;
}

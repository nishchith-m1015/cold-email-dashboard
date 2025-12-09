import NextDynamic from 'next/dynamic';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DashboardPageClient = NextDynamic(() => import('@/components/pages/dashboard-page-client'), {
  ssr: false,
  loading: () => (
    <div className="p-6 text-sm text-text-secondary">Loading dashboard…</div>
  ),
});

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-text-secondary">Loading dashboard…</div>}>
      <DashboardPageClient />
    </Suspense>
  );
}

import NextDynamic from 'next/dynamic';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const AnalyticsPageClient = NextDynamic(() => import('@/components/pages/analytics-page-client'), {
  ssr: false,
  loading: () => (
    <div className="p-6 text-sm text-text-secondary">Loading analytics…</div>
  ),
});

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-text-secondary">Loading analytics…</div>}>
      <AnalyticsPageClient />
    </Suspense>
  );
}

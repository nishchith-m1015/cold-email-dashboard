import NextDynamic from 'next/dynamic';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const JoinTeamPageClient = NextDynamic(() => import('@/components/pages/join-page-client'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center text-sm text-text-secondary">Loading join flow…</div>
  ),
});

export default function JoinTeamPage() {
  return (
    <div className="h-screen overflow-hidden">
      <Suspense fallback={<div className="h-screen flex items-center justify-center text-sm text-text-secondary">Loading join flow…</div>}>
        <JoinTeamPageClient />
      </Suspense>
    </div>
  );
}

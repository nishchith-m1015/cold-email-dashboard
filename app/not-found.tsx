import Link from 'next/link';
import NextDynamic from 'next/dynamic';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NotFoundClient = NextDynamic(() => import('@/components/pages/not-found-client'), {
  ssr: false,
});

export default function NotFound() {
  return (
    <Suspense fallback={null}>
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center space-y-6">
        <div className="text-6xl font-bold">404</div>
        <p className="text-lg text-gray-600">
          The page you are looking for does not exist.
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-500 transition"
        >
          Back to dashboard
        </Link>
      </div>
      <NotFoundClient />
    </Suspense>
  );
}


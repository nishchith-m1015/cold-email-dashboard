import type { Metadata } from 'next';
import './globals.css';
import { ClientShell } from '@/components/layout/client-shell';

export const metadata: Metadata = {
  title: 'Cold Email Analytics Dashboard',
  description: 'Real-time analytics for your cold email campaigns',
  icons: {
    icon: '/favicon.ico',
  },
};

/**
 * RootLayout - Server component for the application root
 * 
 * This layout is a server component that:
 * - Sets up HTML structure and metadata
 * - Applies dark theme class
 * - Loads Google Fonts
 * - Wraps children in ClientShell for client-side functionality
 * 
 * Benefits of keeping this as a server component:
 * - Faster initial page load (no client JS needed for layout)
 * - Proper metadata handling for SEO
 * - Ready for Clerk auth integration (providers go here)
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Google Fonts - Inter & JetBrains Mono */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="min-h-screen bg-background antialiased">
        <ClientShell>
          {children}
        </ClientShell>
      </body>
    </html>
  );
}
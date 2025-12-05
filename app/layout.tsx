import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
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
 * RootLayout - Server component with Clerk authentication
 * 
 * This layout:
 * - Wraps the app with ClerkProvider for authentication
 * - Sets up HTML structure and metadata
 * - Applies dark theme class
 * - Loads Google Fonts
 * - Wraps children in ClientShell for client-side functionality
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#3b82f6',
          colorBackground: '#0a0a0f',
          colorInputBackground: '#13131a',
          colorInputText: '#f5f5f7',
          colorText: '#f5f5f7',
        },
        elements: {
          formButtonPrimary: 'bg-blue-500 hover:bg-blue-600',
          card: 'bg-[#13131a] border border-[#2a2a3c]',
          headerTitle: 'text-white',
          headerSubtitle: 'text-gray-400',
          socialButtonsBlockButton: 'bg-[#1a1a2e] border border-[#2a2a3c] text-white',
          formFieldInput: 'bg-[#1a1a2e] border border-[#2a2a3c] text-white',
          footerActionLink: 'text-blue-400 hover:text-blue-300',
          userButtonPopoverCard: 'bg-[#13131a] border border-[#2a2a3c]',
          userButtonPopoverActionButton: 'hover:bg-[#1a1a2e]',
          userButtonPopoverActionButtonText: 'text-white',
        },
      }}
    >
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
    </ClerkProvider>
  );
}

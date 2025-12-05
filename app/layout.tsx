import type { Metadata } from 'next';
import {
  ClerkProvider,
} from '@clerk/nextjs';
import { dark } from '@clerk/themes';
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
        baseTheme: dark,
        variables: {
          colorPrimary: '#3b82f6',
          colorBackground: '#0a0a0f',
          colorInputBackground: '#13131a',
          colorInputText: '#f5f5f7',
        },
        elements: {
          formButtonPrimary: 'bg-accent-primary hover:bg-accent-primary/90',
          card: 'bg-surface border border-border',
          headerTitle: 'text-text-primary',
          headerSubtitle: 'text-text-secondary',
          socialButtonsBlockButton: 'bg-surface-elevated border border-border',
          formFieldInput: 'bg-surface-elevated border border-border text-text-primary',
          footerActionLink: 'text-accent-primary hover:text-accent-primary/80',
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

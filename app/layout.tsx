'use client';

import { useState } from 'react';
import './globals.css';
import { Header } from '@/components/layout/header';
import { CommandPalette } from '@/components/layout/command-palette';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [commandOpen, setCommandOpen] = useState(false);

  return (
    <html lang="en" className="dark">
      <head>
        <title>Cold Email Analytics Dashboard</title>
        <meta name="description" content="Real-time analytics for your cold email campaigns" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        {/* Google Fonts - Inter */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="min-h-screen bg-background antialiased">
        {/* Background pattern */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 via-transparent to-accent-purple/5" />
          <div className="absolute inset-0 dot-pattern opacity-30" />
        </div>

        {/* Header */}
        <Header onCommandOpen={() => setCommandOpen(true)} />

        {/* Main content */}
        <main className="max-w-[1600px] mx-auto px-6 py-8">
          {children}
        </main>

        {/* Command palette */}
        <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      </body>
    </html>
  );
}

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

// Clerk theme matching dashboard design
const clerkAppearance = {
  variables: {
    // Core colors
    colorPrimary: '#3b82f6',
    colorBackground: '#141416',
    colorInputBackground: '#1c1c1f',
    colorInputText: '#fafafa',
    colorText: '#fafafa',
    colorTextSecondary: '#a1a1aa',
    colorDanger: '#ef4444',
    colorSuccess: '#22c55e',
    colorWarning: '#f59e0b',
    // Typography
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: {
      normal: 400,
      medium: 500,
      bold: 600,
    },
    // Borders
    borderRadius: '0.75rem',
    colorNeutral: '#27272a',
  },
  elements: {
    // Main card/container
    card: 'bg-[#141416] border border-[#27272a] shadow-2xl rounded-xl',
    rootBox: 'w-full',
    
    // Header
    headerTitle: 'text-[#fafafa] font-semibold text-xl',
    headerSubtitle: 'text-[#a1a1aa]',
    
    // Form elements
    formFieldLabel: 'text-[#a1a1aa] text-sm font-medium',
    formFieldInput: 'bg-[#1c1c1f] border border-[#27272a] text-[#fafafa] rounded-lg focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] placeholder:text-[#52525b]',
    formFieldInputShowPasswordButton: 'text-[#a1a1aa] hover:text-[#fafafa]',
    formButtonPrimary: 'bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium rounded-lg transition-colors',
    formButtonReset: 'text-[#3b82f6] hover:text-[#60a5fa]',
    formFieldAction: 'text-[#3b82f6] hover:text-[#60a5fa]',
    formFieldErrorText: 'text-[#ef4444]',
    formFieldSuccessText: 'text-[#22c55e]',
    
    // Social buttons
    socialButtonsBlockButton: 'bg-[#1c1c1f] border border-[#27272a] text-[#fafafa] hover:bg-[#27272a] rounded-lg transition-colors',
    socialButtonsBlockButtonText: 'text-[#fafafa] font-medium',
    socialButtonsProviderIcon: 'w-5 h-5',
    
    // Divider
    dividerLine: 'bg-[#27272a]',
    dividerText: 'text-[#52525b] text-sm',
    
    // Footer
    footer: 'bg-transparent',
    footerAction: 'text-[#a1a1aa]',
    footerActionText: 'text-[#a1a1aa]',
    footerActionLink: 'text-[#3b82f6] hover:text-[#60a5fa] font-medium',
    
    // Identity preview (shows email)
    identityPreview: 'bg-[#1c1c1f] border border-[#27272a] rounded-lg',
    identityPreviewText: 'text-[#fafafa]',
    identityPreviewEditButton: 'text-[#3b82f6] hover:text-[#60a5fa]',
    
    // User button (profile dropdown trigger)
    userButtonBox: 'rounded-full',
    userButtonTrigger: 'rounded-full focus:ring-2 focus:ring-[#3b82f6] focus:ring-offset-2 focus:ring-offset-[#0a0a0b]',
    userButtonAvatarBox: 'rounded-full w-8 h-8',
    
    // User button popover (dropdown menu)
    userButtonPopoverCard: 'bg-[#141416] border border-[#27272a] rounded-xl shadow-2xl',
    userButtonPopoverMain: 'p-0',
    userButtonPopoverActions: 'border-t border-[#27272a]',
    userButtonPopoverActionButton: 'text-[#fafafa] hover:bg-[#1c1c1f] rounded-lg transition-colors',
    userButtonPopoverActionButtonText: 'text-[#fafafa] font-medium',
    userButtonPopoverActionButtonIcon: 'text-[#a1a1aa]',
    userButtonPopoverFooter: 'hidden',
    
    // User preview in popover
    userPreview: 'p-4',
    userPreviewMainIdentifier: 'text-[#fafafa] font-semibold',
    userPreviewSecondaryIdentifier: 'text-[#a1a1aa] text-sm',
    userPreviewAvatarBox: 'rounded-full w-10 h-10',
    
    // Menu items
    menuButton: 'text-[#fafafa] hover:bg-[#1c1c1f]',
    menuItem: 'text-[#fafafa] hover:bg-[#1c1c1f]',
    
    // Alerts
    alert: 'bg-[#1c1c1f] border border-[#27272a] rounded-lg',
    alertText: 'text-[#fafafa]',
    
    // Loading states
    spinner: 'text-[#3b82f6]',
    
    // Badges
    badge: 'bg-[#3b82f6]/20 text-[#60a5fa] rounded-md',
    
    // OTP input
    otpCodeFieldInput: 'bg-[#1c1c1f] border border-[#27272a] text-[#fafafa] rounded-lg',
    
    // Navigation
    navbarButton: 'text-[#a1a1aa] hover:text-[#fafafa]',
    
    // Profile page elements
    profileSectionTitle: 'text-[#fafafa] font-semibold',
    profileSectionTitleText: 'text-[#fafafa]',
    profileSectionContent: 'bg-[#1c1c1f] border border-[#27272a] rounded-lg',
    profileSectionPrimaryButton: 'bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg',
    
    // Scrollbar
    scrollBox: 'scrollbar-thin scrollbar-thumb-[#27272a] scrollbar-track-transparent',
  },
};

/**
 * RootLayout - Server component with Clerk authentication
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
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

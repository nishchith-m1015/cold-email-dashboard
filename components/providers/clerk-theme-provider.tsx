'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useEffect, useState } from 'react';

// Base appearance that works for both themes
const baseAppearance = {
  variables: {
    colorPrimary: '#3b82f6',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: '0.75rem',
  },
  elements: {
    card: 'shadow-2xl rounded-xl',
    rootBox: 'w-full',
    formButtonPrimary: 'bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium rounded-lg transition-colors',
    formButtonReset: 'text-[#3b82f6] hover:text-[#60a5fa]',
    formFieldAction: 'text-[#3b82f6] hover:text-[#60a5fa]',
    userButtonBox: 'rounded-full',
    userButtonTrigger: 'rounded-full focus:ring-2 focus:ring-[#3b82f6] focus:ring-offset-2',
    userButtonAvatarBox: 'rounded-full w-8 h-8',
    footerActionLink: 'text-[#3b82f6] hover:text-[#60a5fa] font-medium',
    profileSectionPrimaryButton: 'bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg',
  },
};

interface ClerkThemeProviderProps {
  children: React.ReactNode;
}

export function ClerkThemeProvider({ children }: ClerkThemeProviderProps) {
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check initial theme
    const checkTheme = () => {
      const isLightMode = document.documentElement.classList.contains('light');
      setIsDark(!isLightMode);
    };
    
    checkTheme();

    // Watch for theme changes via MutationObserver
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          checkTheme();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Build appearance based on current theme
  const appearance = {
    ...baseAppearance,
    baseTheme: isDark ? dark : undefined,
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <ClerkProvider appearance={{ ...baseAppearance, baseTheme: dark }}>
        {children}
      </ClerkProvider>
    );
  }

  return (
    <ClerkProvider appearance={appearance}>
      {children}
    </ClerkProvider>
  );
}

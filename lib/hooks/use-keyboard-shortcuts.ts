'use client';

/**
 * Keyboard Shortcuts Hook
 * 
 * Global keyboard shortcuts for quick actions.
 */

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface ShortcutAction {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

interface UseKeyboardShortcutsOptions {
  onCommandPalette?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { onCommandPalette, enabled = true } = options;
  const router = useRouter();

  const shortcuts: ShortcutAction[] = [
    // Command Palette (⌘K)
    {
      key: 'k',
      meta: true,
      action: () => onCommandPalette?.(),
      description: 'Open command palette',
    },
    // New Campaign (⌘N)
    {
      key: 'n',
      meta: true,
      action: () => router.push('/?new=campaign'),
      description: 'New campaign',
    },
    // Go to Dashboard (G then D)
    {
      key: 'd',
      alt: true,
      action: () => router.push('/'),
      description: 'Go to dashboard',
    },
    // Go to Contacts (G then C)
    {
      key: 'c',
      alt: true,
      action: () => router.push('/contacts'),
      description: 'Go to contacts',
    },
    // Go to Sequences (G then S)
    {
      key: 's',
      alt: true,
      action: () => router.push('/sequences'),
      description: 'Go to sequences',
    },
    // Go to Settings (⌘,)
    {
      key: ',',
      meta: true,
      action: () => router.push('/settings'),
      description: 'Open settings',
    },
    // Refresh (⌘R is reserved, use ⌘⇧R)
    {
      key: 'r',
      meta: true,
      shift: true,
      action: () => window.location.reload(),
      description: 'Refresh page',
    },
  ];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    
    // Ignore if typing in an input
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    for (const shortcut of shortcuts) {
      const metaMatch = shortcut.meta ? (e.metaKey || e.ctrlKey) : true;
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
      const altMatch = shortcut.alt ? e.altKey : !e.altKey;
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

      if (keyMatch && metaMatch && shiftMatch && altMatch) {
        // Don't prevent default for command palette (already handled elsewhere)
        if (shortcut.key !== 'k' || !shortcut.meta) {
          e.preventDefault();
        }
        shortcut.action();
        return;
      }
    }
  }, [enabled, shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { shortcuts };
}

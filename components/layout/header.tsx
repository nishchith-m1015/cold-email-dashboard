'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  Settings, 
  Bell,
  Search,
  Command,
  Zap,
  Sun,
  Moon,
  User,
  Users,
  LayoutDashboard,
  Globe,
  Palette,
  Clock,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Info,
  Database,
  Trash2,
  Loader2,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WorkspaceSwitcher } from '@/components/dashboard/workspace-switcher';
import { SignedIn, SignedOut, SignInButton, useUser, useClerk } from '@clerk/nextjs';
import { LogOut, UserCircle } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { SystemHealthBar } from '@/components/ui/system-health-bar';
import { RoleBadge } from '@/components/ui/role-badge';
import { useNotifications } from '@/hooks/use-notifications';
import { getNotificationIcon, getNotificationColor, formatTimeAgo as formatTime } from '@/lib/notification-utils';
import { ShareDialog } from '@/components/dashboard/share-dialog';

interface HeaderProps {
  onCommandOpen?: () => void;
}

// Theme hook
function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check localStorage or system preference
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
      document.documentElement.classList.toggle('light', stored === 'light');
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light');
      document.documentElement.classList.add('light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('light', newTheme === 'light');
  };

  return { theme, toggleTheme, mounted };
}

// Click outside hook
function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

// Removed - now using notification-utils.ts

// Cache stats type
interface CacheStats {
  validEntries: number;
  entries: Array<{ key: string; expiresIn: number }>;
}

// Removed - now using types from use-notifications.ts

export function Header({ onCommandOpen }: HeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { theme, toggleTheme, mounted } = useTheme();
  const { workspaceId, workspace, userRole } = useWorkspace();
  const { user } = useUser();
  
  // Preserve URL params when navigating
  const currentParams = searchParams.toString();
  const query = currentParams ? `?${currentParams}` : '';
  
  // Dropdown states
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  
  // Notifications from API
  const { notifications, unreadCount, markAsRead, dismiss } = useNotifications();

  // Cache states
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [clearStatus, setClearStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Preferences state
  const [timezone, setTimezone] = useState<string>('America/Los_Angeles');
  const [autoRefresh, setAutoRefresh] = useState<number>(30);
  const [savingPref, setSavingPref] = useState(false);

  // Initialize prefs on mount and when workspace settings change
  useEffect(() => {
    const savedTz = localStorage.getItem('dashboard_timezone');
    const savedRefresh = localStorage.getItem('dashboard_auto_refresh');
    if (workspace?.settings?.timezone && typeof workspace.settings.timezone === 'string') {
      setTimezone(workspace.settings.timezone);
      localStorage.setItem('dashboard_timezone', workspace.settings.timezone);
    } else if (savedTz) {
      setTimezone(savedTz);
    }
    if (typeof workspace?.settings?.auto_refresh_seconds === 'number') {
      setAutoRefresh(Number(workspace.settings.auto_refresh_seconds));
      localStorage.setItem('dashboard_auto_refresh', String(workspace.settings.auto_refresh_seconds));
    } else if (savedRefresh) {
      const val = Number(savedRefresh);
      if (Number.isFinite(val)) setAutoRefresh(val);
    }
  }, [workspace?.settings]);

  // Listen to storage updates to stay in sync with other controls
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'dashboard_timezone' && e.newValue) {
        setTimezone(e.newValue);
      }
      if (e.key === 'dashboard_auto_refresh' && e.newValue) {
        const val = Number(e.newValue);
        if (Number.isFinite(val)) setAutoRefresh(val);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Profile dropdown state
  const [showProfile, setShowProfile] = useState(false);
  const { signOut, openUserProfile } = useClerk();

  // Refs for click outside
  const notificationsRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useClickOutside(notificationsRef, () => setShowNotifications(false));
  useClickOutside(settingsRef, () => setShowSettings(false));
  useClickOutside(profileRef, () => setShowProfile(false));
  
  // Notification handlers
  const markAllAsRead = () => markAsRead('all');
  const dismissNotification = (id: string) => dismiss(id);

  // Fetch cache stats when settings opens
  const fetchCacheStats = useCallback(async () => {
    try {
      const response = await fetch('/api/cache');
      if (response.ok) {
        const data = await response.json();
        setCacheStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch cache stats:', error);
    }
  }, []);

  // Clear cache and refresh data
  const clearCache = useCallback(async () => {
    setIsClearing(true);
    setClearStatus('idle');

    try {
      const response = await fetch('/api/cache', { method: 'DELETE' });
      if (response.ok) {
        setClearStatus('success');
        await fetchCacheStats();
        // Trigger page refresh to get fresh data
        window.location.reload();
      } else {
        setClearStatus('error');
        setTimeout(() => setClearStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      setClearStatus('error');
      setTimeout(() => setClearStatus('idle'), 3000);
    } finally {
      setIsClearing(false);
    }
  }, [fetchCacheStats]);

  // Fetch stats when settings dropdown opens
  useEffect(() => {
    if (showSettings) {
      fetchCacheStats();
    }
  }, [showSettings, fetchCacheStats]);

  // Load persisted prefs when settings opens
  useEffect(() => {
    if (!showSettings || !workspaceId) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/workspaces/settings?workspace_id=${workspaceId}`);
        if (res.ok) {
          const data = await res.json();
          const settings = data.settings || {};
          if (settings.timezone) {
            setTimezone(settings.timezone);
            localStorage.setItem('dashboard_timezone', settings.timezone);
          }
          if (typeof settings.auto_refresh_seconds === 'number') {
            setAutoRefresh(settings.auto_refresh_seconds);
            localStorage.setItem('dashboard_auto_refresh', String(settings.auto_refresh_seconds));
          }
        }
      } catch (err) {
        console.error('Failed to load workspace settings', err);
      }
    };
    load();
  }, [showSettings, workspaceId]);

  const savePrefs = useCallback(async (next: { timezone?: string; auto_refresh_seconds?: number }) => {
    if (!workspaceId) return;
    setSavingPref(true);
    try {
      const res = await fetch('/api/workspaces/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, ...next }),
      });
      if (res.ok) {
        if (next.timezone) localStorage.setItem('dashboard_timezone', next.timezone);
        if (next.auto_refresh_seconds !== undefined) localStorage.setItem('dashboard_auto_refresh', String(next.auto_refresh_seconds));
      }
    } catch (err) {
      console.error('Failed to save settings', err);
    } finally {
      setSavingPref(false);
    }
  }, [workspaceId]);

  // Helper to format time ago
  function formatTimeAgo(timestamp: string): string {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }

  return (
    <>
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border"
    >
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Nav */}
          <div className="flex items-center gap-8">
            {/* Logo - Always visible */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-br from-accent-primary to-accent-purple shadow-lg shadow-accent-primary/20">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent-primary to-accent-purple opacity-0 blur-xl group-hover:opacity-40 transition-opacity" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-text-primary tracking-tight">
                  Cold Email
                </h1>
                <p className="text-[10px] text-text-secondary -mt-0.5 tracking-wide uppercase">
                  Analytics
                </p>
              </div>
            </Link>

            {/* Dashboard elements - Only visible when signed in */}
            <SignedIn>
              {/* Workspace Switcher */}
              <div className="hidden lg:block border-l border-border pl-6 ml-2" data-tour="workspace">
                <WorkspaceSwitcher />
              </div>

              {/* Navigation Tabs */}
              <nav className="hidden md:flex items-center gap-1 bg-surface-elevated rounded-lg p-1">
                <Link href={`/${query}`}>
                  <button
                    className={cn(
                      'px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2',
                      pathname === '/'
                        ? 'bg-surface text-text-primary shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    )}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Overview
                  </button>
                </Link>
                <Link href={`/analytics${query}`}>
                  <button
                    className={cn(
                      'px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2',
                      pathname === '/analytics'
                        ? 'bg-surface text-text-primary shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    )}
                  >
                    <BarChart3 className="h-4 w-4" />
                    Analytics
                  </button>
                </Link>
                <Link href={`/contacts${query}`}>
                  <button
                    className={cn(
                      'px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2',
                      pathname === '/contacts'
                        ? 'bg-surface text-text-primary shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    )}
                  >
                    <Users className="h-4 w-4" />
                    Contacts
                  </button>
                </Link>
                <Link href={`/sequences${query}`}>
                  <button
                    className={cn(
                      'px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2',
                      pathname === '/sequences'
                        ? 'bg-surface text-text-primary shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    )}
                  >
                    <Mail className="h-4 w-4" />
                    Sequences
                  </button>
                </Link>
              </nav>
            </SignedIn>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Dashboard controls - Only visible when signed in */}
            <SignedIn>
              {/* Search / Command */}
              <Button
                variant="outline"
                size="sm"
                onClick={onCommandOpen}
                className="hidden sm:flex items-center gap-2 text-text-secondary hover:text-text-primary"
                data-tour="search"
              >
                <Search className="h-4 w-4" />
                <span className="text-xs">Search...</span>
                <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-surface-elevated px-1.5 font-mono text-[10px] font-medium text-text-secondary">
                  <Command className="h-3 w-3" />K
                </kbd>
              </Button>

              {/* System Health Status */}
              {workspaceId && (
                <div className="hidden xl:block">
                  <SystemHealthBar workspaceId={workspaceId} />
                </div>
              )}

              {/* Team Button */}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShareOpen(true)}
                className="relative"
                title="Team & Sharing"
              >
                <Users className="h-5 w-5 text-text-secondary hover:text-accent-primary transition-colors" />
              </Button>

              {/* Theme Toggle */}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={toggleTheme}
                className="relative"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {mounted && (
                  theme === 'dark' ? (
                    <Sun className="h-5 w-5 text-text-secondary hover:text-accent-warning transition-colors" />
                  ) : (
                    <Moon className="h-5 w-5 text-text-secondary hover:text-accent-primary transition-colors" />
                  )
                )}
              </Button>

              {/* Notifications Dropdown */}
              <div className="relative" ref={notificationsRef}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative"
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowSettings(false);
                  }}
                >
                  <Bell className="h-5 w-5 text-text-secondary" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-accent-danger rounded-full animate-pulse" />
                  )}
                </Button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-surface shadow-2xl overflow-hidden z-50"
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-elevated">
                        <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
                        {unreadCount > 0 && (
                          <button 
                            onClick={markAllAsRead}
                            className="text-xs text-accent-primary hover:text-accent-primary/80 transition-colors"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <Bell className="h-8 w-8 mx-auto text-text-secondary mb-2 opacity-50" />
                            <p className="text-sm text-text-secondary">No notifications</p>
                          </div>
                        ) : (
                          notifications.map((notification) => {
                            const Icon = getNotificationIcon(notification.type);
                            const iconColor = getNotificationColor(notification.type);
                            return (
                              <div
                                key={notification.id}
                                className={cn(
                                  'px-4 py-3 border-b border-border last:border-0 hover:bg-surface-elevated/50 transition-colors cursor-pointer',
                                  !notification.read_at && 'bg-accent-primary/5'
                                )}
                                onClick={() => {
                                  if (!notification.read_at) {
                                    markAsRead([notification.id]);
                                  }
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={cn('mt-0.5', iconColor)}>
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-sm font-medium text-text-primary truncate">
                                        {notification.title}
                                      </p>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          dismissNotification(notification.id);
                                        }}
                                        className="text-text-secondary hover:text-text-primary transition-colors"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                    <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                                      {notification.message}
                                    </p>
                                    <p className="text-[10px] text-text-secondary mt-1">
                                      {formatTime(notification.created_at)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                      
                      <div className="px-4 py-2 border-t border-border bg-surface-elevated">
                        <button className="w-full text-xs text-center text-accent-primary hover:text-accent-primary/80 transition-colors py-1">
                          View all notifications
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Settings Dropdown */}
              <div className="relative" ref={settingsRef}>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    setShowSettings(!showSettings);
                    setShowNotifications(false);
                  }}
                >
                  <Settings className={cn(
                    'h-5 w-5 text-text-secondary transition-transform',
                    showSettings && 'rotate-90'
                  )} />
                </Button>

                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-surface shadow-2xl overflow-hidden z-50"
                    >
                      <div className="px-4 py-3 border-b border-border bg-surface-elevated">
                        <h3 className="text-sm font-semibold text-text-primary">Settings</h3>
                      </div>
                      
                      <div className="p-2">
                        {/* Theme setting */}
                        <button
                          onClick={toggleTheme}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-surface-elevated transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Palette className="h-4 w-4 text-text-secondary" />
                            <span className="text-sm text-text-primary">Theme</span>
                          </div>
                          <span className="text-xs text-text-secondary capitalize">{theme}</span>
                        </button>

                        {/* Timezone setting */}
                        <div className="w-full px-2 py-2.5 rounded-lg hover:bg-surface-elevated transition-colors">
                          <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Globe className="h-4 w-4 text-text-secondary" />
                            <span className="text-sm text-text-primary">Timezone</span>
                            </div>
                            <span className="text-xs text-text-secondary">{timezone}</span>
                          </div>
                          <div className="mt-2 grid grid-cols-1 gap-1">
                            {['America/Los_Angeles', 'America/New_York', 'UTC'].map(tz => (
                              <button
                                key={tz}
                                onClick={() => {
                                  setTimezone(tz);
                                  savePrefs({ timezone: tz });
                                }}
                                className={cn(
                                  'w-full text-left px-3 py-2 rounded-md text-xs',
                                  timezone === tz
                                    ? 'bg-accent-primary/10 text-accent-primary'
                                    : 'text-text-secondary hover:bg-surface'
                                )}
                                disabled={savingPref}
                              >
                                {tz}
                        </button>
                            ))}
                          </div>
                        </div>

                        {/* Refresh interval */}
                        <div className="w-full px-2 py-2.5 rounded-lg hover:bg-surface-elevated transition-colors">
                          <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4 text-text-secondary" />
                            <span className="text-sm text-text-primary">Auto-refresh</span>
                            </div>
                            <span className="text-xs text-text-secondary">
                              {autoRefresh === 0 ? 'Off' : `${autoRefresh}s`}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            {[0, 30, 60].map(v => (
                              <button
                                key={v}
                                onClick={() => {
                                  setAutoRefresh(v);
                                  savePrefs({ auto_refresh_seconds: v });
                                }}
                                className={cn(
                                  'px-2 py-2 rounded-md text-xs text-center',
                                  autoRefresh === v
                                    ? 'bg-accent-primary/10 text-accent-primary'
                                    : 'text-text-secondary hover:bg-surface'
                                )}
                                disabled={savingPref}
                              >
                                {v === 0 ? 'Off' : `${v}s`}
                        </button>
                            ))}
                          </div>
                        </div>

                        <div className="my-2 border-t border-border" />

                        {/* Cache Status */}
                        <div className="px-3 py-2">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Database className="h-4 w-4 text-accent-purple" />
                              <span className="text-sm font-medium text-text-primary">Data Cache</span>
                            </div>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              cacheStats && cacheStats.validEntries > 0
                                ? "bg-accent-success/10 text-accent-success"
                                : "bg-surface-elevated text-text-secondary"
                            )}>
                              {cacheStats ? `${cacheStats.validEntries} cached` : '...'}
                            </span>
                          </div>
                          {cacheStats && cacheStats.entries.length > 0 && (
                            <div className="text-[10px] text-text-secondary mb-2 pl-6">
                              {cacheStats.entries.slice(0, 2).map((e, i) => (
                                <div key={i} className="flex justify-between">
                                  <span className="truncate max-w-[120px]">{e.key.replace('sheets_data_', '')}</span>
                                  <span>{Math.floor(e.expiresIn / 60)}m left</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Clear Cache Button */}
                        <button
                          onClick={clearCache}
                          disabled={isClearing}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors",
                            clearStatus === 'success' 
                              ? "bg-accent-success/10 text-accent-success"
                              : clearStatus === 'error'
                              ? "bg-accent-danger/10 text-accent-danger"
                              : "hover:bg-surface-elevated"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {isClearing ? (
                              <Loader2 className="h-4 w-4 text-text-secondary animate-spin" />
                            ) : clearStatus === 'success' ? (
                              <Check className="h-4 w-4 text-accent-success" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-text-secondary" />
                            )}
                            <span className="text-sm text-text-primary">
                              {isClearing ? 'Clearing...' : clearStatus === 'success' ? 'Cache cleared!' : 'Clear cache & refresh'}
                            </span>
                          </div>
                        </button>

                        <p className="px-3 py-1.5 text-[10px] text-text-secondary">
                          Clears cached data to fetch fresh data
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </SignedIn>

            {/* User Profile - Clerk Authentication */}
            <SignedOut>
              <SignInButton mode="redirect">
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  Sign In
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => {
                    setShowProfile(!showProfile);
                    setShowNotifications(false);
                    setShowSettings(false);
                  }}
                  className="relative h-9 w-9 rounded-full ring-2 ring-transparent hover:ring-accent-primary/50 transition-all overflow-hidden focus:outline-none focus:ring-accent-primary/50"
                >
                  {user?.imageUrl ? (
                    <img 
                      src={user.imageUrl} 
                      alt={user.fullName || 'Profile'} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-accent-primary to-accent-purple flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  )}
                </button>

                <AnimatePresence>
                  {showProfile && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border bg-surface shadow-2xl overflow-hidden z-50"
                    >
                      {/* User Info Header */}
                      <div className="px-4 py-4 border-b border-border bg-surface-elevated">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full overflow-hidden ring-2 ring-accent-primary/30">
                            {user?.imageUrl ? (
                              <img 
                                src={user.imageUrl} 
                                alt={user.fullName || 'Profile'} 
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full bg-gradient-to-br from-accent-primary to-accent-purple flex items-center justify-center">
                                <User className="h-6 w-6 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-text-primary truncate">
                              {user?.fullName || 'User'}
                            </p>
                            <p className="text-xs text-text-secondary truncate">
                              {user?.primaryEmailAddress?.emailAddress || ''}
                            </p>
                          </div>
                          {userRole && <RoleBadge role={userRole} size="sm" />}
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        <button
                          onClick={() => {
                            setShowProfile(false);
                            openUserProfile();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-elevated transition-colors"
                        >
                          <UserCircle className="h-4 w-4 text-text-secondary" />
                          Manage Account
                        </button>
                        <button
                          onClick={() => {
                            setShowProfile(false);
                            signOut({ redirectUrl: '/sign-in' });
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-accent-danger hover:bg-surface-elevated transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </SignedIn>
          </div>
        </div>
      </div>
    </motion.header>
    
    {/* Share Dialog */}
    <ShareDialog open={shareOpen} onOpenChange={setShareOpen} />
    </>
  );
}
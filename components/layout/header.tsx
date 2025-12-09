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
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WorkspaceSwitcher } from '@/components/dashboard/workspace-switcher';
import { SignedIn, SignedOut, SignInButton, useUser, useClerk } from '@clerk/nextjs';
import { LogOut, UserCircle } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';

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

// Notification type mapping
const notificationTypeMap: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
  'reply': 'success',
  'opt_out': 'warning',
  'budget_alert': 'error',
  'campaign_complete': 'success',
  'system': 'info',
};

const notificationIcons = {
  success: CheckCircle2,
  info: Info,
  warning: AlertCircle,
  error: X,
};

const notificationColors = {
  success: 'text-accent-success',
  info: 'text-accent-primary',
  warning: 'text-accent-warning',
  error: 'text-accent-danger',
};

// Cache stats type
interface CacheStats {
  validEntries: number;
  entries: Array<{ key: string; expiresIn: number }>;
}

interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  time: string;
  read: boolean;
  created_at: string;
}

export function Header({ onCommandOpen }: HeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { theme, toggleTheme, mounted } = useTheme();
  const { workspaceId } = useWorkspace();
  const { user } = useUser();
  
  // Preserve URL params when navigating
  const currentParams = searchParams.toString();
  const query = currentParams ? `?${currentParams}` : '';
  
  // Dropdown states
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Cache states
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [clearStatus, setClearStatus] = useState<'idle' | 'success' | 'error'>('idle');

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
  

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!workspaceId) return;

    try {
      const response = await fetch(`/api/notifications?workspace_id=${workspaceId}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        const formatted = data.notifications.map((n: any) => ({
          id: n.id,
          type: notificationTypeMap[n.type] || 'info',
          title: n.title,
          message: n.message,
          time: formatTimeAgo(n.created_at),
          read: !!n.read_at,
          created_at: n.created_at,
        }));
        setNotifications(formatted);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [workspaceId]);

  // Fetch notifications on workspace change
  useEffect(() => {
    if (!workspaceId || !user?.id) return;
    fetchNotifications();
  }, [workspaceId, user, fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = async () => {
    if (!workspaceId) return;

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_ids: 'all',
          action: 'read',
          workspace_id: workspaceId,
        }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const dismissNotification = async (id: string) => {
    if (!workspaceId) return;

    try {
      await fetch(`/api/notifications?id=${id}&workspace_id=${workspaceId}`, {
        method: 'DELETE',
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

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
              <div className="hidden lg:block border-l border-border pl-6 ml-2">
                <WorkspaceSwitcher />
              </div>

              {/* Navigation Tabs */}
              <nav className="hidden md:flex items-center gap-1 bg-surface-elevated rounded-lg p-1">
                <Link href={`/${query}`}>
                  <button
                    className={cn(
                      'px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
                      pathname === '/'
                        ? 'bg-surface text-text-primary shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    )}
                  >
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
              >
                <Search className="h-4 w-4" />
                <span className="text-xs">Search...</span>
                <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-surface-elevated px-1.5 font-mono text-[10px] font-medium text-text-secondary">
                  <Command className="h-3 w-3" />K
                </kbd>
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
                            const Icon = notificationIcons[notification.type];
                            return (
                              <div
                                key={notification.id}
                                className={cn(
                                  'px-4 py-3 border-b border-border last:border-0 hover:bg-surface-elevated/50 transition-colors',
                                  !notification.read && 'bg-accent-primary/5'
                                )}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={cn('mt-0.5', notificationColors[notification.type])}>
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-sm font-medium text-text-primary truncate">
                                        {notification.title}
                                      </p>
                                      <button
                                        onClick={() => dismissNotification(notification.id)}
                                        className="text-text-secondary hover:text-text-primary transition-colors"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                    <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                                      {notification.message}
                                    </p>
                                    <p className="text-[10px] text-text-secondary mt-1">{notification.time}</p>
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
                        <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-surface-elevated transition-colors">
                          <div className="flex items-center gap-3">
                            <Globe className="h-4 w-4 text-text-secondary" />
                            <span className="text-sm text-text-primary">Timezone</span>
                          </div>
                          <span className="text-xs text-text-secondary">UTC-8</span>
                        </button>

                        {/* Refresh interval */}
                        <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-surface-elevated transition-colors">
                          <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4 text-text-secondary" />
                            <span className="text-sm text-text-primary">Auto-refresh</span>
                          </div>
                          <span className="text-xs text-text-secondary">30s</span>
                        </button>

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
  );
}
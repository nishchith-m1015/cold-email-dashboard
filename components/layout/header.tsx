'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  UserPlus,
  LayoutDashboard,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Info,
  Database,
  Trash2,
  Loader2,
  Mail,
  Shield
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
import { SignOutTransition } from '@/components/ui/sign-out-transition';

interface HeaderProps {
  onCommandOpen?: () => void;
}

// Theme hook
function useTheme() {
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check localStorage or system preference
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      setThemeState(stored);
      document.documentElement.classList.toggle('light', stored === 'light');
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      setThemeState('light');
      document.documentElement.classList.add('light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('light', newTheme === 'light');
  };

  const changeTheme = (newTheme: 'dark' | 'light') => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('light', newTheme === 'light');
  };

  return { theme, toggleTheme, changeTheme, mounted };
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
  const { theme, toggleTheme, changeTheme, mounted } = useTheme();
  const { workspaceId, workspace, userRole, isSuperAdmin } = useWorkspace();
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

  // Profile dropdown state
  const [showProfile, setShowProfile] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { signOut, openUserProfile } = useClerk();

  // Sign out handler with transition
  const handleSignOut = () => {
    setShowProfile(false);
    setIsSigningOut(true);
    setTimeout(() => {
      signOut({ redirectUrl: '/sign-in' });
    }, 500);
  };

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
      className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border shadow-sm hidden md:block"
    >
      <div className="max-w-[1600px] mx-auto px-6">
        {/* CSS Grid: conditional layout based on pathname */}
        <div className={cn(
          "items-center h-16 gap-2",
          pathname === '/join' 
            ? "flex justify-end" // On /join page, align profile to right
            : "grid grid-cols-[auto_1fr_auto]" // Normal 3-column grid
        )}>
          {/* LEFT ZONE: Logo & Workspace - Hidden on /join page */}
          {pathname !== '/join' && (
            <div className="flex items-center gap-4 flex-shrink-0">
              {/* Logo */}
              <Link href={`/${query}`} className="flex items-center gap-2 group">
                <div className="relative">
                  <div className="w-8 h-8 rounded-lg overflow-hidden shadow-lg">
                    <Image src="/logo.png" alt="Logo" width={32} height={32} className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="text-base font-semibold text-text-primary transition-colors duration-200 group-hover:text-slate-400 hidden md:block">
                  <p className="leading-tight">
                    Cold Email
                  </p>
                  <p className="text-[10px] uppercase tracking-wider font-medium text-slate-400 opacity-70">
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
              </SignedIn>
            </div>
          )}

          {/* CENTER ZONE: Navigation Tabs - Centered & Compact - Hidden on /join page */}
          {pathname !== '/join' && (
            <SignedIn>
              <nav className="hidden md:flex items-center justify-center w-fit mx-auto bg-surface-elevated rounded-lg p-0.5 relative">
                <Link href={`/${query}`}>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className={cn(
                      'relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 flex items-center gap-1.5',
                      pathname === '/'
                        ? 'text-text-primary'
                        : 'text-text-secondary hover:text-text-primary'
                    )}
                  >
                    {pathname === '/' && (
                      <motion.div
                        layoutId="active-tab-bg"
                        className="absolute inset-0 bg-surface shadow-sm rounded-md"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <LayoutDashboard className="h-4 w-4 hidden xl:block" />
                      Overview
                    </span>
                  </motion.button>
                </Link>
                <Link href={`/analytics${query}`}>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className={cn(
                      'relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 flex items-center gap-1.5',
                      pathname === '/analytics'
                        ? 'text-text-primary'
                        : 'text-text-secondary hover:text-text-primary'
                    )}
                  >
                    {pathname === '/analytics' && (
                      <motion.div
                        layoutId="active-tab-bg"
                        className="absolute inset-0 bg-surface shadow-sm rounded-md"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <BarChart3 className="h-4 w-4 hidden xl:block" />
                      Analytics
                    </span>
                  </motion.button>
                </Link>
                <Link href={`/contacts${query}`}>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className={cn(
                      'relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 flex items-center gap-1.5',
                      pathname === '/contacts'
                        ? 'text-text-primary'
                        : 'text-text-secondary hover:text-text-primary'
                    )}
                  >
                    {pathname === '/contacts' && (
                      <motion.div
                        layoutId="active-tab-bg"
                        className="absolute inset-0 bg-surface shadow-sm rounded-md"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <Users className="h-4 w-4 hidden xl:block" />
                      Contacts
                    </span>
                  </motion.button>
                </Link>
                <Link href={`/sequences${query}`}>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className={cn(
                      'relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 flex items-center gap-1.5',
                      pathname === '/sequences'
                        ? 'text-text-primary'
                        : 'text-text-secondary hover:text-text-primary'
                    )}
                  >
                    {pathname === '/sequences' && (
                      <motion.div
                        layoutId="active-tab-bg"
                        className="absolute inset-0 bg-surface shadow-sm rounded-md"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <Mail className="h-4 w-4 hidden xl:block" />
                      Sequences
                    </span>
                  </motion.button>
                </Link>
                <Link href={`/settings${query}`}>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className={cn(
                      'relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 flex items-center gap-1.5',
                      pathname === '/settings'
                        ? 'text-text-primary'
                        : 'text-text-secondary hover:text-text-primary'
                    )}
                  >
                    {pathname === '/settings' && (
                      <motion.div
                        layoutId="active-tab-bg"
                        className="absolute inset-0 bg-surface shadow-sm rounded-md"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <Settings className="h-4 w-4 hidden xl:block" />
                      Settings
                    </span>
                  </motion.button>
                </Link>
                {isSuperAdmin && (
                  <Link href={`/admin${query}`}>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      className={cn(
                        'relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 flex items-center gap-1.5',
                        pathname === '/admin'
                          ? 'text-text-primary'
                          : 'text-text-secondary hover:text-text-primary'
                      )}
                    >
                      {pathname === '/admin' && (
                        <motion.div
                          layoutId="active-tab-bg"
                          className="absolute inset-0 bg-surface shadow-sm rounded-md"
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        <Shield className="h-4 w-4 hidden xl:block" />
                        Admin
                      </span>
                    </motion.button>
                  </Link>
                )}
              </nav>
            </SignedIn>
          )}

          {/* RIGHT ZONE: Controls */}
          <div className="flex items-center gap-2 justify-end">
            {/* Dashboard controls - Only visible when signed in and NOT on /join page */}
            {pathname !== '/join' && (
              <SignedIn>
                {/* Search / Command - Compact icon button */}
                 <Button
                  variant="ghost"
                  size="icon"
                  onClick={onCommandOpen}
                  className="hidden sm:flex relative"
                  data-tour="search"
                  title="Search (⌘K)"
                >
                  <Search className="h-5 w-5 text-text-secondary hover:text-text-primary transition-colors" />
                </Button>

                {/* System Health Status - Only show on xl+ screens */}
                {workspaceId && (
                  <div className="hidden xl:block">
                    <SystemHealthBar workspaceId={workspaceId} />
                  </div>
                )}

                {/* Team/Share Button */}
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShareOpen(true)}
                  className="relative"
                  title="Invite Team Members"
                >
                  <UserPlus className="h-5 w-5 text-text-secondary hover:text-accent-primary transition-colors" />
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
              </SignedIn>
            )}

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
                    <div className="h-full w-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
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
                              <div className="h-full w-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
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
                          {/* Hide role badge on /join page since user hasn't selected workspace yet */}
                          {pathname !== '/join' && userRole && <RoleBadge role={userRole} size="sm" />}
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        {/* Appearance / Theme Toggle */}
                        <div className="px-3 py-2">
                          <p className="text-xs font-medium text-text-secondary mb-2 px-1">Appearance</p>
                          <div className="grid grid-cols-2 bg-surface-elevated rounded-lg p-1 gap-1 border border-border relative">
                            <motion.div
                              layoutId="theme-active-bg-profile"
                              className={cn(
                                "absolute inset-1 w-[calc(50%-4px)] bg-surface shadow-sm rounded-md",
                                theme === 'dark' ? "left-[calc(50%+2px)]" : "left-1"
                              )}
                              transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            />
                            <button
                              onClick={() => changeTheme('light')}
                              className={cn(
                                "relative z-10 flex items-center justify-center gap-2 py-1.5 rounded-md text-sm font-medium transition-colors",
                                theme === 'light' ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
                              )}
                            >
                              <Sun className="h-4 w-4" />
                              Light
                            </button>
                            <button
                              onClick={() => changeTheme('dark')}
                              className={cn(
                                "relative z-10 flex items-center justify-center gap-2 py-1.5 rounded-md text-sm font-medium transition-colors",
                                theme === 'dark' ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
                              )}
                            >
                              <Moon className="h-4 w-4" />
                              Dark
                            </button>
                          </div>
                        </div>

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
                        <div className="px-2">
                          <button
                            onClick={clearCache}
                            disabled={isClearing}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                              clearStatus === 'success' 
                                ? "bg-accent-success/10 text-accent-success"
                                : clearStatus === 'error'
                                ? "bg-accent-danger/10 text-accent-danger"
                                : "hover:bg-surface-elevated"
                            )}
                          >
                            {isClearing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : clearStatus === 'success' ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-text-secondary" />
                            )}
                            <span className="text-sm">
                              {isClearing ? 'Clearing...' : clearStatus === 'success' ? 'Cleared!' : 'Clear cache'}
                            </span>
                          </button>
                          <p className="px-1 py-1.5 text-[10px] text-text-secondary">
                            Clears cached data to fetch fresh data
                          </p>
                        </div>

                        {/* Divider */}
                        <div className="my-2 border-t border-border" />

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
                          onClick={handleSignOut}
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
    
    {/* Sign Out Transition Overlay */}
    <SignOutTransition isVisible={isSigningOut} />
    </>
  );
}
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
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
  LogOut,
  RefreshCw,
  Globe,
  Palette,
  Clock,
  Check,
  X,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Info,
  Database,
  Trash2,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

// Sample notifications
const sampleNotifications = [
  {
    id: '1',
    type: 'success' as const,
    title: 'Campaign completed',
    message: 'Ohio campaign has finished sending all emails',
    time: '5 min ago',
    read: false,
  },
  {
    id: '2',
    type: 'info' as const,
    title: 'New replies received',
    message: '3 new replies in the last hour',
    time: '1 hour ago',
    read: false,
  },
  {
    id: '3',
    type: 'warning' as const,
    title: 'High opt-out rate',
    message: 'Campaign XYZ has 2.5% opt-out rate',
    time: '2 hours ago',
    read: true,
  },
];

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

export function Header({ onCommandOpen }: HeaderProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');
  const { theme, toggleTheme, mounted } = useTheme();
  
  // Dropdown states
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState(sampleNotifications);

  // Cache states
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [clearStatus, setClearStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Refs for click outside
  const notificationsRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useClickOutside(notificationsRef, () => setShowNotifications(false));
  useClickOutside(settingsRef, () => setShowSettings(false));
  useClickOutside(profileRef, () => setShowProfile(false));

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
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
            {/* Logo */}
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

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 bg-surface-elevated rounded-lg p-1">
              <Link href="/">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={cn(
                    'px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
                    activeTab === 'overview'
                      ? 'bg-surface text-text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  Overview
                </button>
              </Link>
              <Link href="/analytics">
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={cn(
                    'px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2',
                    activeTab === 'analytics'
                      ? 'bg-surface text-text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </button>
              </Link>
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
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
                  setShowProfile(false);
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
                  setShowProfile(false);
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
                        Clears cached Google Sheets data to fetch fresh data
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => {
                  setShowProfile(!showProfile);
                  setShowNotifications(false);
                  setShowSettings(false);
                }}
                className="h-8 w-8 rounded-full bg-gradient-to-br from-accent-primary to-accent-purple flex items-center justify-center text-white text-sm font-semibold hover:ring-2 hover:ring-accent-primary/50 hover:ring-offset-2 hover:ring-offset-background transition-all"
              >
              S
              </button>

              <AnimatePresence>
                {showProfile && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-surface shadow-2xl overflow-hidden z-50"
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-border bg-surface-elevated">
                      <p className="text-sm font-semibold text-text-primary">Smartie Agents</p>
                      <p className="text-xs text-text-secondary mt-0.5">admin@smartieagents.com</p>
                    </div>
                    
                    <div className="p-2">
                      {/* Account */}
                      <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-elevated transition-colors">
                        <User className="h-4 w-4 text-text-secondary" />
                        <span className="text-sm text-text-primary">Account</span>
                      </button>

                      {/* Switch account */}
                      <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-elevated transition-colors">
                        <RefreshCw className="h-4 w-4 text-text-secondary" />
                        <span className="text-sm text-text-primary">Switch account</span>
                      </button>

                      <div className="my-2 border-t border-border" />

                      {/* Logout */}
                      <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent-danger/10 text-accent-danger transition-colors">
                        <LogOut className="h-4 w-4" />
                        <span className="text-sm">Log out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}


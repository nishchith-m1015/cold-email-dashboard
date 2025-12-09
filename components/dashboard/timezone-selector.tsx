'use client';

import { useState, useEffect } from 'react';
import { Globe, ChevronDown, MapPin } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
}

const TIMEZONES: TimezoneOption[] = [
  { value: 'America/Los_Angeles', label: 'Pacific Time', offset: 'PT' },
  { value: 'America/Denver', label: 'Mountain Time', offset: 'MT' },
  { value: 'America/Chicago', label: 'Central Time', offset: 'CT' },
  { value: 'America/New_York', label: 'Eastern Time', offset: 'ET' },
  { value: 'UTC', label: 'UTC', offset: 'UTC' },
  { value: 'Europe/London', label: 'London', offset: 'GMT' },
  { value: 'Europe/Paris', label: 'Paris', offset: 'CET' },
  { value: 'Asia/Tokyo', label: 'Tokyo', offset: 'JST' },
  { value: 'Australia/Sydney', label: 'Sydney', offset: 'AEST' },
];

interface TimezoneSelectorProps {
  selectedTimezone: string;
  onTimezoneChange: (timezone: string) => void;
  className?: string;
}

/**
 * Detect the user's system timezone
 */
function detectTimezone(): string {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Check if detected timezone is in our list
    const match = TIMEZONES.find(tz => tz.value === detected);
    return match ? detected : 'UTC'; // Fallback to UTC
  } catch {
    return 'UTC';
  }
}

export function TimezoneSelector({
  selectedTimezone,
  onTimezoneChange,
  className,
}: TimezoneSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [autoDetected, setAutoDetected] = useState(false);

  // Auto-detect timezone on mount if not already set
  useEffect(() => {
    if (!autoDetected) {
      const detected = detectTimezone();
      // Only auto-set if it's different from current and we're on default (UTC)
      if (detected !== selectedTimezone && selectedTimezone === 'UTC') {
        onTimezoneChange(detected);
      }
      setAutoDetected(true);
    }
  }, [autoDetected, selectedTimezone, onTimezoneChange]);

  const selected = TIMEZONES.find(tz => tz.value === selectedTimezone) || TIMEZONES[0];
  const detectedTz = detectTimezone();
  const isAutoDetected = detectedTz === selectedTimezone;

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <Button
          variant="outline"
          className={cn('justify-start gap-2 min-w-[140px]', className)}
        >
          {isAutoDetected ? (
            <MapPin className="h-4 w-4 text-accent-success" />
          ) : (
            <Globe className="h-4 w-4 text-text-secondary" />
          )}
          <span className="flex-1 text-left text-sm">{selected.offset}</span>
          <ChevronDown className={cn(
            'h-4 w-4 text-text-secondary transition-transform',
            isOpen && 'rotate-180'
          )} />
        </Button>
      </Popover.Trigger>
      
      <Popover.Portal>
        <Popover.Content
          className="z-50 animate-in fade-in-0 zoom-in-95"
          sideOffset={8}
          align="end"
        >
          <div className="rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-[#141416] p-2 min-w-[180px]">
            <div className="flex items-center justify-between px-2 py-1.5 mb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Timezone
              </p>
              {detectedTz !== selectedTimezone && (
                <button
                  onClick={() => {
                    onTimezoneChange(detectedTz);
                    setIsOpen(false);
                  }}
                  className="text-[10px] text-accent-primary hover:text-accent-primary/80 font-medium flex items-center gap-1"
                >
                  <MapPin className="h-3 w-3" />
                  Auto
                </button>
              )}
            </div>
            {TIMEZONES.map(tz => (
              <button
                key={tz.value}
                onClick={() => {
                  onTimezoneChange(tz.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full rounded-md px-2 py-1.5 text-left text-xs transition flex justify-between items-center',
                  tz.value === selectedTimezone
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                )}
              >
                <span className="flex items-center gap-1.5">
                  {tz.label}
                  {tz.value === detectedTz && (
                    <MapPin className="h-3 w-3 text-accent-success" />
                  )}
                </span>
                <span className="text-slate-400 dark:text-slate-500">{tz.offset}</span>
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// Helper function to format date in a specific timezone
export function formatInTimezone(date: Date | string, timezone: string, formatStr: string = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
  };

  switch (formatStr) {
    case 'short':
      return d.toLocaleDateString('en-US', { ...options, month: 'short', day: 'numeric' });
    case 'long':
      return d.toLocaleDateString('en-US', { ...options, month: 'long', day: 'numeric', year: 'numeric' });
    case 'datetime':
      return d.toLocaleString('en-US', { ...options, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    case 'time':
      return d.toLocaleTimeString('en-US', { ...options, hour: 'numeric', minute: '2-digit' });
    case 'iso':
      // Return YYYY-MM-DD in the specified timezone
      const formatter = new Intl.DateTimeFormat('en-CA', { ...options, year: 'numeric', month: '2-digit', day: '2-digit' });
      return formatter.format(d);
    default:
      return d.toLocaleDateString('en-US', { ...options, month: 'short', day: 'numeric' });
  }
}

// Get current date in a specific timezone as YYYY-MM-DD
export function getTodayInTimezone(timezone: string): string {
  return formatInTimezone(new Date(), timezone, 'iso');
}


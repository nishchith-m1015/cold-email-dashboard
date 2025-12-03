'use client';

import { useState, useEffect } from 'react';
import { 
  format, 
  isSameDay, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDay,
  addMonths,
  subMonths,
  isBefore,
  isAfter,
  isWithinInterval,
} from 'date-fns';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Parse date string as LOCAL date (not UTC) to avoid timezone shifting
function parseLocalDate(dateStr: string): Date {
  // Split "YYYY-MM-DD" and create date with local timezone
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
}

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
  className?: string;
}

const presets = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function DateRangePicker({
  startDate,
  endDate,
  onDateChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState<Date | null>(() => parseLocalDate(startDate));
  const [rangeEnd, setRangeEnd] = useState<Date | null>(() => parseLocalDate(endDate));
  const [currentMonth, setCurrentMonth] = useState(() => parseLocalDate(endDate));
  const [selectingStart, setSelectingStart] = useState(true);

  // Sync external state changes
  useEffect(() => {
    setRangeStart(parseLocalDate(startDate));
    setRangeEnd(parseLocalDate(endDate));
  }, [startDate, endDate]);

  const handlePreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days + 1);
    
    setRangeStart(start);
    setRangeEnd(end);
    setCurrentMonth(end);
    // Use format() instead of toISOString().slice() to avoid timezone issues
    onDateChange(
      format(start, 'yyyy-MM-dd'),
      format(end, 'yyyy-MM-dd')
    );
    setIsOpen(false);
  };

  const handleDayClick = (day: Date) => {
    if (selectingStart) {
      setRangeStart(day);
      setRangeEnd(null);
      setSelectingStart(false);
    } else {
      if (rangeStart && isBefore(day, rangeStart)) {
        // If clicked day is before start, swap
        setRangeEnd(rangeStart);
        setRangeStart(day);
      } else {
        setRangeEnd(day);
      }
      setSelectingStart(true);
      
      // Trigger callback
      const finalStart = rangeStart && isBefore(day, rangeStart) ? day : rangeStart;
      const finalEnd = rangeStart && isBefore(day, rangeStart) ? rangeStart : day;
      
      if (finalStart && finalEnd) {
        // Use format() instead of toISOString().slice() to avoid timezone issues
        onDateChange(
          format(finalStart, 'yyyy-MM-dd'),
          format(finalEnd, 'yyyy-MM-dd')
        );
      }
    }
  };

  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const displayValue = rangeStart && rangeEnd
    ? isSameDay(rangeStart, rangeEnd)
      ? format(rangeStart, 'MMM d, yyyy')
      : `${format(rangeStart, 'MMM d')} - ${format(rangeEnd, 'MMM d, yyyy')}`
    : 'Select date range';

  // Generate days for current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startOffset = getDay(monthStart); // 0 = Sunday

  const today = new Date();

  const isInRange = (day: Date) => {
    if (!rangeStart || !rangeEnd) return false;
    return isWithinInterval(day, { start: rangeStart, end: rangeEnd });
  };

  const isRangeStart = (day: Date) => rangeStart && isSameDay(day, rangeStart);
  const isRangeEnd = (day: Date) => rangeEnd && isSameDay(day, rangeEnd);
  const isDisabled = (day: Date) => isAfter(day, today);

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <Button
          variant="outline"
          className={cn('justify-start gap-2 min-w-[200px]', className)}
        >
          <Calendar className="h-4 w-4 text-text-secondary" />
          <span className="flex-1 text-left text-sm">{displayValue}</span>
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
          <div className="flex rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-[#141416]">
            {/* Presets Sidebar */}
            <div className="w-28 border-r border-slate-200 p-2 dark:border-slate-700">
              <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Quick Select
              </p>
              {presets.map(preset => (
                <button
                  key={preset.days}
                  onClick={() => handlePreset(preset.days)}
                  className="w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            
            {/* Calendar */}
            <div className="w-64 p-3">
              {/* Month Header */}
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goToPrevMonth}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {format(currentMonth, 'MMMM yyyy')}
                </span>
                <button
                  type="button"
                  onClick={goToNextMonth}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Weekday Headers */}
              <div className="mb-1 grid grid-cols-7 text-center">
                {WEEKDAYS.map(day => (
                  <span 
                    key={day} 
                    className="py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400"
                  >
                    {day}
                  </span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7">
                {/* Empty cells for offset */}
                {Array.from({ length: startOffset }).map((_, i) => (
                  <span key={`empty-${i}`} className="h-8 w-8" />
                ))}

                {/* Day buttons */}
                {days.map((day) => {
                  const disabled = isDisabled(day);
                  const inRange = isInRange(day);
                  const isStart = isRangeStart(day);
                  const isEnd = isRangeEnd(day);
                  const isToday = isSameDay(day, today);

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        'relative flex h-8 w-8 items-center justify-center text-sm font-medium transition',
                        // Base styles - darker text for better contrast
                        'text-slate-900 dark:text-slate-200',
                        // Hover (when not selected)
                        !isStart && !isEnd && !inRange && 'hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full',
                        // In range (middle)
                        inRange && !isStart && !isEnd && 'bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-slate-200',
                        // Range start
                        isStart && 'bg-blue-600 text-white rounded-l-full',
                        isStart && !isEnd && 'rounded-r-none',
                        isStart && isEnd && 'rounded-full',
                        // Range end
                        isEnd && !isStart && 'bg-blue-600 text-white rounded-r-full rounded-l-none',
                        // Today indicator
                        isToday && !isStart && !isEnd && 'font-bold text-blue-700 dark:text-blue-400',
                        // Disabled
                        disabled && 'text-slate-400 dark:text-slate-600 cursor-not-allowed hover:bg-transparent'
                      )}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>

              {/* Selected Range Footer */}
              {rangeStart && rangeEnd && (
                <div className="mt-3 border-t border-slate-200 pt-2 text-center dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isSameDay(rangeStart, rangeEnd)
                      ? format(rangeStart, 'EEEE, MMM d, yyyy')
                      : `${format(rangeStart, 'MMM d')} → ${format(rangeEnd, 'MMM d, yyyy')}`
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

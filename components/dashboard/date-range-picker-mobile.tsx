/**
 * DateRangePickerMobile - Full-screen calendar sheet for mobile
 * 
 * Phase 38: Mobile Sovereignty - Pillar 3: Popover Transformation
 * 
 * Replaces the tiny popover calendar with a full-width bottom sheet.
 * 
 * Features:
 * - Full-screen bottom sheet presentation
 * - Larger touch targets (48x48px days minimum)
 * - Horizontal scrolling preset chips
 * - Swipe-to-close
 */

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
import { Calendar, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/mobile';
import { cn } from '@/lib/utils';

// Parse date string as LOCAL date
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

interface DateRangePickerMobileProps {
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
  className?: string;
}

const presets = [
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function DateRangePickerMobile({
  startDate,
  endDate,
  onDateChange,
  className,
}: DateRangePickerMobileProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState<Date | null>(() => parseLocalDate(startDate));
  const [rangeEnd, setRangeEnd] = useState<Date | null>(() => parseLocalDate(endDate));
  const [currentMonth, setCurrentMonth] = useState(() => parseLocalDate(endDate));
  const [selectingStart, setSelectingStart] = useState(true);

  // Sync external state
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
    onDateChange(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const handleDayClick = (day: Date) => {
    if (selectingStart) {
      setRangeStart(day);
      setRangeEnd(null);
      setSelectingStart(false);
    } else {
      if (rangeStart && isBefore(day, rangeStart)) {
        setRangeEnd(rangeStart);
        setRangeStart(day);
      } else {
        setRangeEnd(day);
      }
      setSelectingStart(true);

      const finalStart = rangeStart && isBefore(day, rangeStart) ? day : rangeStart;
      const finalEnd = rangeStart && isBefore(day, rangeStart) ? rangeStart : day;

      if (finalStart && finalEnd) {
        onDateChange(format(finalStart, 'yyyy-MM-dd'), format(finalEnd, 'yyyy-MM-dd'));
        // Don't close immediately on mobile - let user see selection
      }
    }
  };

  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const displayValue =
    rangeStart && rangeEnd
      ? isSameDay(rangeStart, rangeEnd)
        ? format(rangeStart, 'MMM d')
        : `${format(rangeStart, 'MMM d')} - ${format(rangeEnd, 'MMM d')}`
      : 'Select dates';

  // Generate days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startOffset = getDay(monthStart);

  const today = new Date();

  const isInRange = (day: Date) => {
    if (!rangeStart || !rangeEnd) return false;
    return isWithinInterval(day, { start: rangeStart, end: rangeEnd });
  };

  const isRangeStart = (day: Date) => rangeStart && isSameDay(day, rangeStart);
  const isRangeEnd = (day: Date) => rangeEnd && isSameDay(day, rangeEnd);
  const isDisabled = (day: Date) => isAfter(day, today);

  const handleApply = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className={cn(
          'justify-start gap-1.5 h-10 px-3 text-sm min-h-touch',
          className
        )}
      >
        <Calendar className="h-4 w-4 text-text-secondary" />
        <span className="flex-1 text-left">{displayValue}</span>
      </Button>

      {/* Bottom Sheet Calendar */}
      <BottomSheet
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Select Date Range"
      >
        <div className="px-4 pb-6 space-y-5">
          {/* Preset Chips - Horizontal scroll */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
            {presets.map((preset) => (
              <button
                key={preset.days}
                onClick={() => handlePreset(preset.days)}
                className={cn(
                  'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  'border border-border bg-surface-elevated text-text-primary',
                  'active:scale-95'
                )}
              >
                Last {preset.label}
              </button>
            ))}
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={goToPrevMonth}
              className="h-12 w-12 flex items-center justify-center rounded-full hover:bg-surface-elevated active:scale-95 transition"
            >
              <ChevronLeft className="h-5 w-5 text-text-secondary" />
            </button>
            <span className="text-lg font-semibold text-text-primary">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              className="h-12 w-12 flex items-center justify-center rounded-full hover:bg-surface-elevated active:scale-95 transition"
            >
              <ChevronRight className="h-5 w-5 text-text-secondary" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 text-center">
            {WEEKDAYS.map((day, i) => (
              <span
                key={`${day}-${i}`}
                className="py-2 text-xs font-semibold text-text-secondary uppercase"
              >
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid - Touch-friendly 48px cells */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for offset */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <span key={`empty-${i}`} className="h-12 w-full" />
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
                    'relative flex h-12 w-full items-center justify-center text-base font-medium transition-all',
                    // Base
                    'text-text-primary',
                    // Hover/Active
                    !isStart && !isEnd && !inRange && 'active:bg-surface-elevated rounded-lg',
                    // In range (middle)
                    inRange && !isStart && !isEnd && 'bg-accent-primary/10 text-accent-primary',
                    // Range start
                    isStart && 'bg-accent-primary text-white rounded-l-lg',
                    isStart && !isEnd && 'rounded-r-none',
                    isStart && isEnd && 'rounded-lg',
                    // Range end
                    isEnd && !isStart && 'bg-accent-primary text-white rounded-r-lg rounded-l-none',
                    // Today indicator
                    isToday && !isStart && !isEnd && 'font-bold ring-2 ring-accent-primary/30 rounded-lg',
                    // Disabled
                    disabled && 'text-text-secondary/50 cursor-not-allowed'
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          {/* Selected Range Display */}
          {rangeStart && rangeEnd && (
            <div className="text-center py-2 border-t border-border mt-2">
              <p className="text-sm text-text-secondary">
                {isSameDay(rangeStart, rangeEnd)
                  ? format(rangeStart, 'EEEE, MMM d, yyyy')
                  : `${format(rangeStart, 'MMM d')} → ${format(rangeEnd, 'MMM d, yyyy')}`}
              </p>
            </div>
          )}

          {/* Apply Button */}
          {rangeStart && rangeEnd && (
            <Button
              onClick={handleApply}
              className="w-full h-12 text-base font-semibold"
            >
              <Check className="h-5 w-5 mr-2" />
              Apply
            </Button>
          )}
        </div>
      </BottomSheet>
    </>
  );
}

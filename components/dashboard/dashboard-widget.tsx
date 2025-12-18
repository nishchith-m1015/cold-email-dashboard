'use client';

/**
 * Dashboard Widget Wrapper
 * 
 * Draggable wrapper for dashboard widgets with drag handle
 */

import { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardWidgetProps {
  id: string;
  children: ReactNode;
  className?: string;
}

export function DashboardWidget({ id, children, className }: DashboardWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group',
        isDragging && 'opacity-50 z-50',
        className
      )}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className={cn(
          'absolute -left-3 top-1/2 -translate-y-1/2 z-10',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'cursor-grab active:cursor-grabbing',
          'p-1 rounded bg-[var(--surface-elevated)] border border-[var(--border)]',
          'hover:bg-[var(--surface)] shadow-md',
          'focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]'
        )}
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-[var(--text-secondary)]" />
      </button>

      {/* Widget Content */}
      <div className={cn(
        'transition-shadow',
        isDragging && 'shadow-2xl'
      )}>
        {children}
      </div>
    </div>
  );
}

/**
 * BottomSheet - Mobile-native slide-up modal component
 * 
 * Phase 38: Mobile Sovereignty - Core UI Primitive
 * 
 * Features:
 * - Spring animation from bottom
 * - Drag-to-dismiss gesture
 * - Backdrop with opacity tied to sheet position
 * - Safe area handling for notched devices
 */

'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo, useAnimation } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  showHandle?: boolean;
  showClose?: boolean;
  className?: string;
}

export function BottomSheet({
  open,
  onClose,
  children,
  title,
  showHandle = true,
  showClose = true,
  className,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  // Drag gesture handler
  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const shouldClose = info.velocity.y > 500 || info.offset.y > 150;
    
    if (shouldClose) {
      onClose();
    } else {
      controls.start({ y: 0 });
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
            }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className={cn(
              'fixed inset-x-0 bottom-0 z-50',
              'bg-surface border-t border-border',
              'rounded-t-2xl shadow-2xl',
              'max-h-[90vh] overflow-hidden',
              'flex flex-col',
              className
            )}
            style={{
              paddingBottom: 'var(--safe-area-bottom, 0px)',
            }}
          >
            {/* Handle */}
            {showHandle && (
              <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
                <div className="w-10 h-1 bg-border rounded-full" />
              </div>
            )}

            {/* Header */}
            {(title || showClose) && (
              <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
                {title ? (
                  <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
                ) : (
                  <div />
                )}
                {showClose && (
                  <button
                    onClick={onClose}
                    className="p-2 -mr-2 rounded-lg hover:bg-surface-elevated transition-colors"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5 text-text-secondary" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * PHASE 35 - Onboarding Tour Component
 * 
 * Animated guided tour for first-time users.
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOnboardingTour, TourStep } from '@/lib/hooks/use-onboarding-tour';
import { usePathname } from 'next/navigation';
import { useWorkspace } from '@/lib/workspace-context';

interface TooltipPosition {
  top: number;
  left: number;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export function OnboardingTour() {
  const {
    isOpen,
    currentStep,
    totalSteps,
    step,
    nextStep,
    prevStep,
    skipTour,
  } = useOnboardingTour();

  const pathname = usePathname();
  const { needsOnboarding } = useWorkspace();

  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Auto-scroll to target when step changes
  useEffect(() => {
    if (!isOpen || !step || pathname === '/join' || needsOnboarding) return;
    
    // Don't scroll for center/welcome step explicitly, or maybe scroll to top?
    if (step.position === 'center') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const target = document.querySelector(step.target);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isOpen, step, currentStep, pathname, needsOnboarding]);

  // Calculate position based on target element
  useEffect(() => {
    // Logic handles blocking render below, but effect might run
    if (!isOpen || !step || pathname === '/join' || needsOnboarding) return;

    const findAndPosition = () => {
      // 1. Handle Center Position (Welcome Step)
      if (step.position === 'center') {
        const tooltipWidth = 360;
        const tooltipHeight = 200; // Approx max height
        
        setPosition({
          top: Math.max(20, window.innerHeight / 2 - tooltipHeight / 2),
          left: Math.max(20, window.innerWidth / 2 - tooltipWidth / 2),
          arrowPosition: 'top', // Not really used in center mode
        });
        setTargetRect(null); // No spotlight for center step
        return;
      }

      // 2. Find Target
      const target = document.querySelector(step.target);
      if (!target) {
        // Fallback to center if target not found
        const tooltipWidth = 360;
        setPosition({
          top: window.innerHeight / 3,
          left: window.innerWidth / 2 - tooltipWidth / 2,
          arrowPosition: 'top',
        });
        setTargetRect(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      setTargetRect(rect);

      const tooltipWidth = 360; // Matches w-[360px]
      const tooltipHeight = 220; // Estimated max height with footer
      const padding = 16;
      const viewportPadding = 12;

      // Helper to calculate coords for a given side
      const getCoords = (side: string) => {
        let top = 0;
        let left = 0;
        
        switch (side) {
          case 'bottom':
            top = rect.bottom + padding;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            break;
          case 'top':
            top = rect.top - tooltipHeight - padding;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            break;
          case 'left':
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            left = rect.left - tooltipWidth - padding;
            break;
          case 'right':
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            left = rect.right + padding;
            break;
        }
        return { top, left };
      };

      // 3. Try preferred position
      let { top, left } = getCoords(step.position);
      let arrowPosition = step.position as any;

      // 4. Collision Detection & Flip
      const isOffScreenBottom = top + tooltipHeight > window.innerHeight - viewportPadding;
      const isOffScreenTop = top < viewportPadding;
      const isOffScreenRight = left + tooltipWidth > window.innerWidth - viewportPadding;
      const isOffScreenLeft = left < viewportPadding;

      if (step.position === 'bottom' && isOffScreenBottom) {
        // Flip to top
        const flipped = getCoords('top');
        if (flipped.top > viewportPadding) {
          top = flipped.top;
          left = flipped.left;
          arrowPosition = 'top';
        }
      } else if (step.position === 'top' && isOffScreenTop) {
        // Flip to bottom
        const flipped = getCoords('bottom');
        if (flipped.top + tooltipHeight < window.innerHeight - viewportPadding) {
          top = flipped.top;
          left = flipped.left;
          arrowPosition = 'bottom';
        }
      } else if (step.position === 'right' && isOffScreenRight) {
        // Flip to left
        const flipped = getCoords('left');
        if (flipped.left > viewportPadding) {
          top = flipped.top;
          left = flipped.left;
          arrowPosition = 'left';
        }
      } else if (step.position === 'left' && isOffScreenLeft) {
        // Flip to right
        const flipped = getCoords('right');
        if (flipped.left + tooltipWidth < window.innerWidth - viewportPadding) {
          top = flipped.top;
          left = flipped.left;
          arrowPosition = 'right';
        }
      }

      // 5. Final Clamp (prevent hard cutoff)
      // Horizontal Clamp
      if (left < viewportPadding) left = viewportPadding;
      if (left + tooltipWidth > window.innerWidth - viewportPadding) {
        left = window.innerWidth - tooltipWidth - viewportPadding;
      }

      // Vertical Clamp
      if (top < viewportPadding) top = viewportPadding;
      if (top + tooltipHeight > window.innerHeight - viewportPadding) {
        top = window.innerHeight - tooltipHeight - viewportPadding;
      }

      setPosition({ top, left, arrowPosition });
    };

    findAndPosition();
    window.addEventListener('resize', findAndPosition);
    window.addEventListener('scroll', findAndPosition, true); // Create a reliable scroll listener capture
    
    return () => {
      window.removeEventListener('resize', findAndPosition);
      window.removeEventListener('scroll', findAndPosition, true);
    };
  }, [isOpen, step, currentStep, pathname, needsOnboarding]);

  if (!isOpen || !step || !position || pathname === '/join' || needsOnboarding) return null;

  return (
    <AnimatePresence>
      {/* Dimmed Overlay - cleaner and consistent */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[1px]"
        onClick={skipTour}
      />

      {/* Target Highlight (Spotlight) */}
      {targetRect && (
        <motion.div
          layoutId="tour-highlight"
          initial={false}
          animate={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            borderRadius: 8,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed z-[101] pointer-events-none ring-2 ring-[var(--accent-primary)] shadow-[0_0_0_4px_rgba(59,130,246,0.1)]"
        />
      )}

      {/* Tooltip Card */}
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95, y: 5 }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          y: 0,
          top: position.top, 
          left: position.left 
        }}
        exit={{ opacity: 0, scale: 0.95, y: 5 }}
        transition={{ 
          type: "spring", 
          stiffness: 350, 
          damping: 25,
          layout: { duration: 0.3 }
        }}
        className="fixed z-[102] w-[360px] pointer-events-auto"
      >
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
          
          {/* Header */}
          <div className="px-5 pt-5 pb-2 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center justify-center h-5 px-2 rounded-full text-[10px] font-bold tracking-wide bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 uppercase">
                  Step {currentStep + 1} / {totalSteps}
                </span>
                {step.title.includes('Welcome') && (
                  <Sparkles className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                )}
              </div>
              <h3 className="text-[17px] font-semibold text-[var(--text-primary)] tracking-tight">
                {step.title}
              </h3>
            </div>
            
            <button
              onClick={skipTour}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1.5 hover:bg-[var(--surface-elevated)] rounded-md -mr-1 -mt-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-5 py-2">
            <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Footer */}
          <div className="p-5 pt-5 flex items-center justify-between mt-1">
            {/* Sleek Progress Indicator */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    backgroundColor: i === currentStep ? 'var(--accent-primary)' : 'var(--border)',
                    scale: i === currentStep ? 1 : 0.8
                  }}
                  className="h-1.5 w-1.5 rounded-full"
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {currentStep > 0 && (
                <button 
                  onClick={prevStep}
                  className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-2"
                >
                  Back
                </button>
              )}
              <Button
                size="sm"
                onClick={nextStep}
                className="bg-[var(--text-primary)] text-[var(--surface)] hover:opacity-90 transition-opacity shadow-md px-5 h-8 rounded-lg text-sm font-semibold"
              >
                {currentStep === totalSteps - 1 ? 'Finish' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

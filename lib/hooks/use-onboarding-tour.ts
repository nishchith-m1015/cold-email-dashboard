/**
 * PHASE 35 - Onboarding Tour Hook
 * 
 * Manages onboarding tour state and persistence.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'onboarding_tour_completed';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector for the element to highlight
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Cold Email Analytics! 👋',
    description: 'Let me show you around the dashboard. This quick tour will help you get started.',
    target: '[data-tour="welcome"]',
    position: 'center',
  },
  {
    id: 'workspace',
    title: 'Workspace Switcher',
    description: 'Switch between different workspaces here. Each workspace has its own campaigns and team members.',
    target: '[data-tour="workspace"]',
    position: 'bottom',
  },
  {
    id: 'metrics',
    title: 'Key Metrics',
    description: 'Track your email performance at a glance - sends, opens, replies, and more.',
    target: '[data-tour="metrics"]',
    position: 'bottom',
  },
  {
    id: 'campaigns',
    title: 'Campaign Table',
    description: 'Manage all your campaigns here. Pause, resume, or view detailed analytics for each one.',
    target: '[data-tour="campaigns"]',
    position: 'top',
  },
  {
    id: 'new-campaign',
    title: 'Create Campaigns',
    description: 'Start a new campaign with our wizard. Choose a template and get started in minutes.',
    target: '[data-tour="new-campaign"]',
    position: 'bottom',
  },
  {
    id: 'search',
    title: 'Quick Search',
    description: 'Press ⌘+K (or Ctrl+K) anytime to quickly search campaigns, contacts, and navigate.',
    target: '[data-tour="search"]',
    position: 'bottom',
  },
];

export function useOnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(true); // Default true to prevent flash

  // Check if tour was completed
  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (completed === 'true') {
      setHasCompleted(true);
    } else {
      setHasCompleted(false);
      // Auto-start tour for first-time users (after a delay)
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const skipTour = useCallback(() => {
    completeTour();
  }, []);

  const completeTour = useCallback(() => {
    setIsOpen(false);
    setHasCompleted(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  const restartTour = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHasCompleted(false);
    setCurrentStep(0);
    setIsOpen(true);
  }, []);

  return {
    isOpen,
    setIsOpen,
    currentStep,
    totalSteps: TOUR_STEPS.length,
    step: TOUR_STEPS[currentStep],
    hasCompleted,
    nextStep,
    prevStep,
    skipTour,
    restartTour,
  };
}

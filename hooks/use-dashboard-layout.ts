'use client';

/**
 * Dashboard Layout Hook
 * 
 * Manages dashboard widget customization with localStorage persistence
 */

import { useState, useEffect, useCallback } from 'react';

export interface DashboardWidget {
  id: string;
  type: 'metrics' | 'chart-row' | 'table' | 'ai';
  label: string;
  visible: boolean;
  order: number;
  canHide: boolean;
}

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'metrics', type: 'metrics', label: 'Key Metrics', visible: true, order: 0, canHide: false },
  { id: 'step-breakdown', type: 'chart-row', label: 'Step Breakdown & Daily Sends', visible: true, order: 1, canHide: true },
  { id: 'sends-optout', type: 'chart-row', label: 'Sends & Opt-Out Charts', visible: true, order: 2, canHide: true },
  { id: 'click-reply', type: 'chart-row', label: 'Click & Reply Charts', visible: true, order: 3, canHide: true },
  { id: 'campaign-stats', type: 'table', label: 'Campaign Statistics', visible: true, order: 4, canHide: true },
  { id: 'campaign-management', type: 'table', label: 'Campaign Management', visible: true, order: 5, canHide: false },
  { id: 'ask-ai', type: 'ai', label: 'AI Assistant', visible: true, order: 6, canHide: true },
];

const STORAGE_KEY = 'dashboard_layout_v1';

interface StoredLayout {
  widgets: Array<{ id: string; visible: boolean; order: number }>;
  version: number;
}

export function useDashboardLayout() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_WIDGETS);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const layout: StoredLayout = JSON.parse(stored);
        
        // Merge stored preferences with default widgets
        const mergedWidgets = DEFAULT_WIDGETS.map(defaultWidget => {
          const storedWidget = layout.widgets.find(w => w.id === defaultWidget.id);
          if (storedWidget) {
            return {
              ...defaultWidget,
              visible: storedWidget.visible,
              order: storedWidget.order,
            };
          }
          return defaultWidget;
        });

        // Sort by order
        mergedWidgets.sort((a, b) => a.order - b.order);
        setWidgets(mergedWidgets);
      }
    } catch (error) {
      console.error('Failed to load dashboard layout:', error);
    }
  }, []);

  // Save to localStorage whenever widgets change
  const saveLayout = useCallback((updatedWidgets: DashboardWidget[]) => {
    try {
      const layout: StoredLayout = {
        widgets: updatedWidgets.map(w => ({
          id: w.id,
          visible: w.visible,
          order: w.order,
        })),
        version: 1,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch (error) {
      console.error('Failed to save dashboard layout:', error);
    }
  }, []);

  // Reorder widgets after drag-and-drop
  const reorderWidgets = useCallback((oldIndex: number, newIndex: number) => {
    setWidgets(prev => {
      const newWidgets = [...prev];
      const [movedWidget] = newWidgets.splice(oldIndex, 1);
      newWidgets.splice(newIndex, 0, movedWidget);

      // Update order values
      const reorderedWidgets = newWidgets.map((widget, index) => ({
        ...widget,
        order: index,
      }));

      saveLayout(reorderedWidgets);
      return reorderedWidgets;
    });
  }, [saveLayout]);

  // Toggle widget visibility
  const toggleWidget = useCallback((widgetId: string) => {
    setWidgets(prev => {
      const newWidgets = prev.map(widget =>
        widget.id === widgetId && widget.canHide
          ? { ...widget, visible: !widget.visible }
          : widget
      );
      saveLayout(newWidgets);
      return newWidgets;
    });
  }, [saveLayout]);

  // Reset to default layout
  const resetLayout = useCallback(() => {
    setWidgets(DEFAULT_WIDGETS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Get only visible widgets
  const visibleWidgets = widgets.filter(w => w.visible);

  return {
    widgets,
    visibleWidgets,
    reorderWidgets,
    toggleWidget,
    resetLayout,
  };
}

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { DEFAULT_WORKSPACE_ID } from './supabase';

// ============================================
// WORKSPACE TYPES
// ============================================

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan?: 'free' | 'starter' | 'pro' | 'enterprise';
  settings?: Record<string, unknown>;
}

export interface WorkspaceContextValue {
  // Current workspace
  workspace: Workspace;
  workspaceId: string;
  
  // Available workspaces (for multi-workspace users)
  workspaces: Workspace[];
  
  // Actions
  setWorkspace: (workspace: Workspace) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  
  // Loading state
  isLoading: boolean;
  
  // Convenience
  isDefaultWorkspace: boolean;
}

// ============================================
// DEFAULT WORKSPACE
// ============================================

const defaultWorkspace: Workspace = {
  id: DEFAULT_WORKSPACE_ID,
  name: 'Default Workspace',
  slug: 'default',
  plan: 'free',
};

// ============================================
// CONTEXT
// ============================================

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface WorkspaceProviderProps {
  children: React.ReactNode;
  initialWorkspace?: Workspace;
}

export function WorkspaceProvider({ 
  children, 
  initialWorkspace = defaultWorkspace 
}: WorkspaceProviderProps) {
  const [workspace, setWorkspaceState] = useState<Workspace>(initialWorkspace);
  const [workspaces, setWorkspacesState] = useState<Workspace[]>([initialWorkspace]);
  const [isLoading, setIsLoading] = useState(false);

  // Load workspace from localStorage on mount
  useEffect(() => {
    const savedWorkspaceId = localStorage.getItem('current_workspace_id');
    const savedWorkspaces = localStorage.getItem('user_workspaces');
    
    if (savedWorkspaces) {
      try {
        const parsed = JSON.parse(savedWorkspaces) as Workspace[];
        setWorkspacesState(parsed);
        
        // Find and set the saved workspace
        if (savedWorkspaceId) {
          const found = parsed.find(w => w.id === savedWorkspaceId);
          if (found) {
            setWorkspaceState(found);
          }
        }
      } catch (e) {
        console.error('Failed to parse saved workspaces:', e);
      }
    }
  }, []);

  // Set current workspace
  const setWorkspace = useCallback((ws: Workspace) => {
    setWorkspaceState(ws);
    localStorage.setItem('current_workspace_id', ws.id);
  }, []);

  // Set available workspaces (called after auth)
  const setWorkspaces = useCallback((wsList: Workspace[]) => {
    setWorkspacesState(wsList);
    localStorage.setItem('user_workspaces', JSON.stringify(wsList));
    
    // If current workspace is not in the list, switch to first one
    if (wsList.length > 0 && !wsList.find(w => w.id === workspace.id)) {
      setWorkspace(wsList[0]);
    }
  }, [workspace.id, setWorkspace]);

  // Memoized context value
  const value = useMemo<WorkspaceContextValue>(() => ({
    workspace,
    workspaceId: workspace.id,
    workspaces,
    setWorkspace,
    setWorkspaces,
    isLoading,
    isDefaultWorkspace: workspace.id === DEFAULT_WORKSPACE_ID,
  }), [workspace, workspaces, setWorkspace, setWorkspaces, isLoading]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  
  return context;
}

// ============================================
// OPTIONAL HOOK (doesn't throw if outside provider)
// ============================================

export function useOptionalWorkspace(): WorkspaceContextValue | undefined {
  return useContext(WorkspaceContext);
}

// Export default workspace for use in server components
export { defaultWorkspace, DEFAULT_WORKSPACE_ID };


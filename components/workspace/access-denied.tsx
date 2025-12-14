'use client';

import { AlertTriangle } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { useRouter } from 'next/navigation';

interface AccessDeniedProps {
  workspaceId?: string;
  message?: string;
}

export function AccessDenied({ workspaceId, message }: AccessDeniedProps) {
  const { workspaces, switchWorkspace } = useWorkspace();
  const router = useRouter();

  const handleSwitchWorkspace = (wsId: string) => {
    switchWorkspace(wsId);
    router.push('/');
  };

  const handleGoToJoin = () => {
    router.push('/join');
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>

          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {message || `You do not have permission to access ${workspaceId ? `workspace "${workspaceId}"` : 'this workspace'}.`}
          </p>

          <div className="space-y-3">
            {workspaces.length > 0 ? (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Switch to one of your workspaces:
                </p>
                <div className="space-y-2">
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => handleSwitchWorkspace(ws.id)}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {ws.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {ws.role || 'member'}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  You do not belong to any workspaces yet.
                </p>
                <button
                  onClick={handleGoToJoin}
                  className="w-full px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary-hover transition-colors"
                >
                  Join or Create a Workspace
                </button>
              </>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Need help? Contact your workspace administrator or{' '}
              <a href="mailto:support@smartieagents.online" className="text-accent-primary hover:underline">
                support
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


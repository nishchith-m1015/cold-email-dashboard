'use client';

/**
 * Security Settings Tab
 * 
 * API keys, webhooks, and security configuration
 */

import { useState } from 'react';
import { usePermission } from '@/components/ui/permission-gate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Plus, Copy, Trash2, Key, Webhook, Shield, Check } from 'lucide-react';

export function SecuritySettingsTab() {
  const canManage = usePermission('manage');
  const [copied, setCopied] = useState<string | null>(null);

  // Mock API keys data (in real implementation, this would come from API)
  const [apiKeys] = useState([
    {
      id: '1',
      name: 'Production API Key',
      masked: 'sk_live_••••••••••••1234',
      full: 'sk_live_example_key_not_real_placeholder_1234567890',
      created_at: '2024-01-15',
    },
  ]);

  const handleCopy = (value: string, id: string) => {
    navigator.clipboard.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* API Keys Card */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Manage API keys for programmatic access to your workspace
            </p>
          </div>
          {canManage && (
            <Button variant="default" size="sm" className="gap-2" disabled>
              <Plus className="h-4 w-4" />
              Generate New Key
            </Button>
          )}
        </div>

        {apiKeys.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-secondary)]">
            <Key className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No API keys generated yet</p>
            <p className="text-xs mt-1">Generate a key to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">
                    API Key
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">
                    Created
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-secondary)] uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {apiKeys.map((key) => (
                  <tr key={key.id} className="hover:bg-[var(--surface-elevated)]">
                    <td className="px-4 py-3 text-sm text-[var(--text-primary)] font-medium">
                      {key.name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-[var(--text-secondary)] bg-[var(--surface-elevated)] px-2 py-1 rounded">
                          {key.masked}
                        </code>
                        <button
                          onClick={() => handleCopy(key.full, key.id)}
                          className="p-1 hover:bg-[var(--surface-elevated)] rounded transition-colors"
                          title="Copy full key"
                        >
                          {copied === key.id ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4 text-[var(--text-secondary)]" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {key.created_at}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-xs text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)]">Note:</strong> API key generation and
            management is currently in development. This is a preview of the UI.
          </p>
        </div>
      </div>

      {/* Webhooks Card */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhooks
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Configure webhooks to receive real-time event notifications
          </p>
        </div>

        <div className="space-y-4">
          <FormField
            label="Webhook URL"
            description="HTTPS endpoint to receive webhook events"
          >
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/webhook"
                disabled={!canManage}
              />
              <Button variant="ghost" disabled>
                Test
              </Button>
            </div>
          </FormField>

          <FormField
            label="Event Types"
            description="Select which events trigger webhooks"
          >
            <div className="space-y-2">
              {['Campaign Created', 'Email Sent', 'Reply Received', 'Opt-Out'].map((event) => (
                <label key={event} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    disabled={!canManage}
                    className="rounded border-[var(--border)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] disabled:opacity-50"
                  />
                  <span className="text-[var(--text-primary)]">{event}</span>
                </label>
              ))}
            </div>
          </FormField>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)]">Coming Soon:</strong> Webhook
            functionality will be available in a future update.
          </p>
        </div>
      </div>

      {/* Security Options Card */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Options
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Additional security features and session management
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--surface-elevated)]">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Two-Factor Authentication
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Add an extra layer of security to your account
              </p>
            </div>
            <Button variant="ghost" size="sm" disabled>
              Enable
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--surface-elevated)]">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Active Sessions
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                View and manage active login sessions
              </p>
            </div>
            <Button variant="ghost" size="sm" disabled>
              Manage
            </Button>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <p className="text-xs text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)]">Roadmap:</strong> Advanced security
            features are planned for future releases.
          </p>
        </div>
      </div>

      {/* Permission Message */}
      {!canManage && (
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            You don&apos;t have permission to manage security settings. Only workspace owners and
            admins can access these features.
          </p>
        </div>
      )}
    </div>
  );
}

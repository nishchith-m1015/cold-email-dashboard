'use client';

/**
 * General Settings Tab
 * 
 * Workspace configuration settings
 */

import { useState, useEffect } from 'react';
import { useWorkspaceSettings } from '@/hooks/use-workspace-settings';
import { useWorkspace } from '@/lib/workspace-context';
import { usePermission } from '@/components/ui/permission-gate';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TimezoneSelector } from '@/components/dashboard/timezone-selector';
import { Save, Loader2 } from 'lucide-react';

export function GeneralSettingsTab() {
  const { workspace } = useWorkspace();
  const { settings, isLoading, updateSettings } = useWorkspaceSettings();
  const canWrite = usePermission('write');

  const [workspaceName, setWorkspaceName] = useState('');
  const [timezone, setTimezone] = useState('America/Los_Angeles');
  const [autoRefresh, setAutoRefresh] = useState<number>(30);
  const [dateFormat, setDateFormat] = useState<'US' | 'EU'>('US');
  const [currency, setCurrency] = useState('USD');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load settings into form
  useEffect(() => {
    if (settings) {
      setWorkspaceName(settings.workspace_name || workspace?.name || '');
      setTimezone(settings.timezone || 'America/Los_Angeles');
      setAutoRefresh(settings.auto_refresh_seconds ?? 30);
      setDateFormat(settings.date_format || 'US');
      setCurrency(settings.currency || 'USD');
    }
  }, [settings, workspace]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    const result = await updateSettings({
      workspace_name: workspaceName,
      timezone,
      auto_refresh_seconds: autoRefresh,
      date_format: dateFormat,
      currency,
    });

    setIsSaving(false);

    if (result.success) {
      setSaveMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } else {
      setSaveMessage({ type: 'error', text: result.error || 'Failed to save settings' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-secondary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workspace Information Card */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Workspace Information
        </h3>
        
        <div className="space-y-4">
          <FormField
            label="Workspace Name"
            description="The display name for your workspace"
          >
            <Input
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="My Workspace"
              disabled={!canWrite}
            />
          </FormField>

          <FormField
            label="Workspace Slug"
            description="URL-friendly identifier (read-only)"
          >
            <Input
              value={workspace?.slug || 'N/A'}
              disabled
              className="bg-[var(--surface-elevated)] cursor-not-allowed"
            />
          </FormField>
        </div>
      </div>

      {/* Dashboard Preferences Card */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Dashboard Preferences
        </h3>
        
        <div className="space-y-4">
          <FormField
            label="Default Timezone"
            description="Timezone used for displaying dates and times"
          >
            <TimezoneSelector
              selectedTimezone={timezone}
              onTimezoneChange={setTimezone}
              disabled={!canWrite}
            />
          </FormField>

          <FormField
            label="Auto-Refresh Interval"
            description="How often the dashboard refreshes automatically"
          >
            <select
              value={autoRefresh}
              onChange={(e) => setAutoRefresh(Number(e.target.value))}
              disabled={!canWrite}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value={0}>Disabled</option>
              <option value={30}>Every 30 seconds</option>
              <option value={60}>Every 60 seconds</option>
            </select>
          </FormField>

          <FormField
            label="Date Format"
            description="Preferred date display format"
          >
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value as 'US' | 'EU')}
              disabled={!canWrite}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="US">US Format (MM/DD/YYYY)</option>
              <option value="EU">EU Format (DD/MM/YYYY)</option>
            </select>
          </FormField>

          <FormField
            label="Currency"
            description="Default currency for cost displays"
          >
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={!canWrite}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
          </FormField>
        </div>
      </div>

      {/* Save Button & Messages */}
      {canWrite && (
        <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          {saveMessage && (
            <div className={`text-sm font-medium ${
              saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
            }`}>
              {saveMessage.text}
            </div>
          )}
          <div className={saveMessage ? '' : 'ml-auto'}>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {!canWrite && (
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            You don&apos;t have permission to edit workspace settings. Contact an admin or owner.
          </p>
        </div>
      )}
    </div>
  );
}

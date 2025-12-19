/**
 * PHASE 36.1 - Configuration Vault Tab
 * 
 * Allows workspace owners to tune campaign parameters.
 * Read-only for non-owners.
 */

'use client';

import { useState } from 'react';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Settings2, Clock, Mail, Calendar, Lock } from 'lucide-react';

export function ConfigVaultTab() {
  const { configs, isLoading, updateConfigs, getValue } = useWorkspaceConfig();
  const { canManage } = usePermissions();
  const canEdit = canManage;
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Local state for form values
  const [localValues, setLocalValues] = useState<Record<string, string | number | boolean>>({});

  // Initialize local values from config
  const getLocalValue = <T extends string | number | boolean>(key: string, defaultValue: T): T => {
    if (key in localValues) {
      return localValues[key] as T;
    }
    const configValue = getValue<T>(key);
    return configValue !== undefined ? configValue : defaultValue;
  };

  const handleChange = (key: string, value: string | number | boolean) => {
    setLocalValues(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!canEdit || !isDirty) return;

    setIsSaving(true);
    
    const updates = Object.entries(localValues).map(([key, value]) => ({
      key,
      value,
    }));

    const success = await updateConfigs(updates);
    
    if (success) {
      setLocalValues({});
      setIsDirty(false);
    }
    
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Configuration Vault
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Tune your campaign parameters. Changes affect all workflows.
          </p>
        </div>
        {!canEdit && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Read Only
          </Badge>
        )}
      </div>

      {/* Email Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-4 w-4" />
            Email Settings
          </CardTitle>
          <CardDescription>
            Control daily email volume and response timing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Max Emails Per Day */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="max-emails">Maximum Emails Per Day</Label>
              <span className="text-sm font-medium tabular-nums">
                {getLocalValue('MAX_EMAILS_PER_DAY', 100)}
              </span>
            </div>
            <Slider
              id="max-emails"
              value={[getLocalValue('MAX_EMAILS_PER_DAY', 100)]}
              onValueChange={([value]) => handleChange('MAX_EMAILS_PER_DAY', value)}
              min={10}
              max={500}
              step={10}
              disabled={!canEdit}
              className="w-full [&_.bg-primary]:bg-accent-primary [&_.bg-secondary]:bg-accent-primary/20 dark:[&_.bg-secondary]:bg-muted/50"
            />
            <p className="text-xs text-muted-foreground">
              Limits the total emails sent per day across all campaigns
            </p>
          </div>

          {/* Reply Delay */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="reply-delay">Reply Delay (minutes)</Label>
              <span className="text-sm font-medium tabular-nums">
                {getLocalValue('REPLY_DELAY_MINUTES', 30)} min
              </span>
            </div>
            <Slider
              id="reply-delay"
              value={[getLocalValue('REPLY_DELAY_MINUTES', 30)]}
              onValueChange={([value]) => handleChange('REPLY_DELAY_MINUTES', value)}
              min={5}
              max={120}
              step={5}
              disabled={!canEdit}
              className="w-full [&_.bg-primary]:bg-accent-primary [&_.bg-secondary]:bg-accent-primary/20 dark:[&_.bg-secondary]:bg-muted/50"
            />
            <p className="text-xs text-muted-foreground">
              Minimum wait time before sending auto-reply sequences
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-4 w-4" />
            Schedule Settings
          </CardTitle>
          <CardDescription>
            Define when emails can be sent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {/* Office Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="office-start">Office Hours Start</Label>
              <div className="relative">
                <Input
                  id="office-start"
                  type="time"
                  value={getLocalValue('OFFICE_HOURS_START', '09:00')}
                  onChange={(e) => handleChange('OFFICE_HOURS_START', e.target.value)}
                  disabled={!canEdit}
                  className="w-full [color-scheme:light] dark:[color-scheme:dark]" 
                />
                <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="office-end">Office Hours End</Label>
              <div className="relative">
                <Input
                  id="office-end"
                  type="time"
                  value={getLocalValue('OFFICE_HOURS_END', '17:00')}
                  onChange={(e) => handleChange('OFFICE_HOURS_END', e.target.value)}
                  disabled={!canEdit}
                  className="w-full [color-scheme:light] dark:[color-scheme:dark]"
                />
                <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Emails will only be queued during these hours (recipient&apos;s timezone if known)
          </p>

          {/* Weekend Sends */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="weekend-sends" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Enable Weekend Sends
              </Label>
              <p className="text-xs text-muted-foreground">
                Allow emails to be sent on Saturdays and Sundays
              </p>
            </div>
            <Switch
              id="weekend-sends"
              checked={getLocalValue('ENABLE_WEEKEND_SENDS', false)}
              onCheckedChange={(checked) => handleChange('ENABLE_WEEKEND_SENDS', checked)}
              disabled={!canEdit}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {canEdit && (
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="min-w-[120px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}

      {/* Unsaved Changes Indicator */}
      {isDirty && canEdit && (
        <p className="text-sm text-amber-500 text-center">
          You have unsaved changes
        </p>
      )}
    </div>
  );
}

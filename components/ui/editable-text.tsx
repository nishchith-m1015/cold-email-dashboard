'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Pencil, Check, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface EditableTextProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  className?: string;
  inputClassName?: string;
  label?: string; // For accessibility
  disabled?: boolean;
}

export function EditableText({
  value: initialValue,
  onSave,
  className,
  inputClassName,
  label = 'Edit text',
  disabled = false,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset value when initialValue changes externally
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (trimmed === initialValue) {
      setIsEditing(false);
      return;
    }
    
    if (!trimmed) {
      // Don't allow empty values, revert
      setValue(initialValue);
      setIsEditing(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(false);
      await onSave(trimmed);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save:', err);
      setError(true);
      // Optional: keep editing state open on error so they can retry
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setValue(initialValue);
    setIsEditing(false);
    setError(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave} // Optional: save on blur? often user-friendly
          disabled={isLoading}
          className={cn("h-8 py-1 px-2 text-sm", inputClassName, error && "border-red-500")}
          aria-label={label}
        />
        {/* We can hide these buttons if we save on blur, but good to have for explicit action or mobile */}
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-accent-primary" />
        )}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "group flex items-center gap-2 rounded px-1 -ml-1 transition-colors hover:bg-surface-elevated/50 cursor-pointer",
        disabled && "pointer-events-none opacity-70",
        className
      )}
      onClick={() => !disabled && setIsEditing(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !disabled) setIsEditing(true);
      }}
      aria-label={`${label}: ${value}. Click to edit.`}
    >
      <span className="truncate">{value}</span>
      {!disabled && (
        <Pencil className="h-3 w-3 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
}

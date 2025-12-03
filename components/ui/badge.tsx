import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-accent-primary/10 text-accent-primary',
        success:
          'bg-accent-success/10 text-accent-success',
        warning:
          'bg-accent-warning/10 text-accent-warning',
        danger:
          'bg-accent-danger/10 text-accent-danger',
        secondary:
          'bg-surface-elevated text-text-secondary',
        purple:
          'bg-accent-purple/10 text-accent-purple',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };


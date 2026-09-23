import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'info' | 'warning' | 'danger' | 'neutral' | 'sport';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'neutral',
  size = 'sm',
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    sport: "bg-sport-50 text-sport-700 border-sport-200 dark:bg-sport-950/40 dark:text-sport-400 dark:border-sport-900/50",
    success: "bg-[#EDF3EC] text-[#346538] border-[#D7E8D5] dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40",
    info: "bg-[#E1F3FE] text-[#1F6C9F] border-[#CDE7FB] dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/40",
    warning: "bg-[#FBF3DB] text-[#956400] border-[#F5E6BD] dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40",
    danger: "bg-[#FDEBEC] text-[#9F2F2D] border-[#F8D2D5] dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/40",
    neutral: "bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700",
  };

  const sizeStyles = {
    sm: "text-[11px] px-2.5 py-0.5 font-medium tracking-wide",
    md: "text-xs px-3 py-1 font-medium tracking-wide",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border transition-colors",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

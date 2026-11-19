import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

function Stagger({ index, className, children }: { index: number; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('animate-fade-in-up', className)} style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}>
      {children}
    </div>
  );
}

export function DashboardRouteSkeleton() {
  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto" role="status" aria-label="Đang tải trang">
      {/* Header mimic */}
      <div className="flex flex-wrap items-center justify-between gap-3 min-h-16">
        <div className="space-y-2">
          <Skeleton className="h-5 w-52" />
          <Skeleton className="h-3 w-72" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Stagger key={i} index={i} className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-28" />
          </Stagger>
        ))}
      </div>
      {/* List rows */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Stagger key={i} index={i + 4} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </Stagger>
        ))}
      </div>
      <span className="sr-only">Đang tải dữ liệu…</span>
    </div>
  );
}

export function GridRouteSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" role="status" aria-label="Đang tải trang">
      {/* Toolbar mimic */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 flex-1 min-w-48 rounded-xl" />
        <Skeleton className="h-10 w-40 rounded-xl" />
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>
      {/* Card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Stagger key={i} index={i} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <div className="p-5 space-y-3">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
              <div className="flex gap-1.5 pt-1">
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-4 w-14 rounded-md" />
              </div>
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            </div>
          </Stagger>
        ))}
      </div>
      <span className="sr-only">Đang tải dữ liệu…</span>
    </div>
  );
}

export function DetailRouteSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" role="status" aria-label="Đang tải trang">
      <Skeleton className="h-4 w-64" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Stagger index={0} className="lg:col-span-3 space-y-4">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        </Stagger>
        <Stagger index={1} className="lg:col-span-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-4">
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-4 w-2/5" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </Stagger>
      </div>
      <span className="sr-only">Đang tải dữ liệu…</span>
    </div>
  );
}

export function DefaultRouteSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10" role="status" aria-label="Đang tải trang">
      <div className="space-y-4 max-w-2xl mx-auto text-center">
        <Skeleton className="h-10 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-2/3 mx-auto" />
        <Skeleton className="h-12 w-full max-w-xl mx-auto rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Stagger key={i} index={i}>
            <Skeleton className="h-64 w-full rounded-2xl" />
          </Stagger>
        ))}
      </div>
      <span className="sr-only">Đang tải dữ liệu…</span>
    </div>
  );
}

export function SkeletonStats({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Stagger key={i} index={i} className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-28" />
        </Stagger>
      ))}
    </div>
  );
}

export function SkeletonTableRows({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="animate-fade-in-up" style={{ animationDelay: `${r * 40}ms` }}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3">
              <Skeleton className={cn('h-4', c === 0 ? 'w-3/5' : 'w-4/5')} />
            </td>
          ))}
        </tr>
      ))}
      <tr aria-hidden="true"><td colSpan={cols} className="sr-only">Đang tải dữ liệu…</td></tr>
    </>
  );
}

export function SkeletonCards({
  count = 6,
  className,
  variant = 'venue',
}: {
  count?: number;
  className?: string;
  variant?: 'venue' | 'compact';
}) {
  return (
    <div className={cn('grid gap-6', variant === 'venue' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Stagger key={i} index={i} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
          {variant === 'venue' ? (
            <>
              <Skeleton className="h-44 w-full" />
              <div className="p-5 space-y-3">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-2/5" />
                <div className="flex items-center justify-between pt-1">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-8 w-24 rounded-lg" />
                </div>
              </div>
            </>
          ) : (
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-3/5" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          )}
        </Stagger>
      ))}
      <span className="sr-only" role="status">Đang tải dữ liệu…</span>
    </div>
  );
}

export function SkeletonPanel({ height = 'min-h-64', className }: { height?: string; className?: string }) {
  return (
    <div role="status" aria-label="Đang tải dữ liệu" className={cn('space-y-4', height, className)}>
      <span className="sr-only">Đang tải dữ liệu…</span>
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" style={{ animationDelay: `${i * 40}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

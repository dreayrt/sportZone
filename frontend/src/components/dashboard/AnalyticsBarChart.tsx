'use client';

interface AnalyticsBarChartProps {
  points: Array<{
    key: string;
    label: string;
    value: number;
  }>;
  valueFormatter: (value: number) => string;
  emptyMessage: string;
  colorClassName?: string;
}

export function AnalyticsBarChart({
  points,
  valueFormatter,
  emptyMessage,
  colorClassName = 'bg-sport-500',
}: AnalyticsBarChartProps) {
  const maxValue = Math.max(...points.map((point) => point.value), 0);

  if (points.length === 0 || maxValue === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-neutral-200 text-sm text-neutral-400 dark:border-neutral-800">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="h-64">
      <div className="flex h-56 items-end gap-2 sm:gap-3">
        {points.map((point) => (
          <div key={point.key} className="group flex h-full min-w-0 flex-1 flex-col justify-end">
            <div className="mb-2 hidden truncate text-center text-[10px] font-medium text-neutral-500 group-hover:block sm:text-xs">
              {valueFormatter(point.value)}
            </div>
            <div className="flex h-44 items-end rounded-t-lg bg-neutral-100 dark:bg-neutral-800/70">
              <div
                className={`w-full rounded-t-lg transition-all duration-300 ${colorClassName}`}
                style={{ height: point.value === 0 ? '2px' : `${Math.max(6, (point.value / maxValue) * 100)}%` }}
                title={`${point.label}: ${valueFormatter(point.value)}`}
              />
            </div>
            <span className="mt-2 truncate text-center text-[10px] text-neutral-500 sm:text-xs">
              {point.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

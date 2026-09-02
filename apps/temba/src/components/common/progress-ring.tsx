import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

const VIEWBOX_SIZE = 100;
const CENTER = VIEWBOX_SIZE / 2;
const RADIUS = 40;
const STROKE_WIDTH = 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ProgressRing({
  value,
  max = 100,
  label,
  emoji,
  ariaLabel,
  strokeClassName,
  trackClassName,
  className,
  children,
}: {
  /** Progress amount; clamped to [0, max]. */
  value: number;
  max?: number;
  /** Visible label under the ring. */
  label: string;
  /** Decorative emoji shown next to the label. */
  emoji?: string;
  /** Screen-reader description for the metric. */
  ariaLabel: string;
  /** Tailwind stroke color for the progress arc (e.g. `stroke-warning`). */
  strokeClassName: string;
  trackClassName?: string;
  className?: string;
  /** Center content (count or percentage). */
  children: ReactNode;
}) {
  const safeMax = max <= 0 ? 100 : max;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const progress = clamped / safeMax;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center gap-2 px-2 py-1",
        className,
      )}
    >
      <div
        className="relative size-[4.5rem] sm:size-20"
        role="img"
        aria-label={ariaLabel}
      >
        <svg
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          className="size-full -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE_WIDTH}
            className={cn("stroke-border", trackClassName)}
          />
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className={cn(
              "motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700 motion-safe:ease-out",
              strokeClassName,
            )}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-title text-foreground font-bold tabular-nums tracking-tight">
            {children}
          </span>
        </div>
      </div>
      <p className="text-meta text-muted-foreground flex min-w-0 items-center justify-center gap-1 text-center font-medium">
        {emoji ? (
          <span aria-hidden="true" className="text-[0.875em] leading-none">
            {emoji}
          </span>
        ) : null}
        <span className="min-w-0 truncate">{label}</span>
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState, type ReactNode } from "react";

import { useMessages, useTextDirection } from "~/components/locale-provider";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

import {
  CURVE_HEIGHT,
  CURVE_WIDTH,
  ratingCurve,
  type HeroStat,
  type HeroView,
} from "./you-hero-model";

const RING_RADIUS = 52;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

export function HeroCard({ children }: { children: ReactNode }) {
  return (
    <section className="surface-focus rounded-card flex flex-col gap-5 overflow-hidden p-5">
      {children}
    </section>
  );
}

export function HeroTopLine({
  label,
  status,
}: {
  label: string;
  status: string | null;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-dim truncate font-mono text-[10px] font-normal uppercase tracking-[0.04em]">
        {label}
      </h2>
      {status ? (
        <p className="text-dim text-eyebrow shrink-0">{status}</p>
      ) : null}
    </div>
  );
}

/** The progress ring; it draws in once on mount unless motion is reduced. */
export function HeroRing({
  percent,
  children,
}: {
  percent: number;
  children: ReactNode;
}) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    setDrawn(true);
  }, []);
  const filled = (Math.min(100, Math.max(0, percent)) / 100) * RING_LENGTH;

  return (
    <div className="relative size-[116px] shrink-0">
      <svg
        viewBox="0 0 120 120"
        aria-hidden="true"
        className="block size-full -rotate-90 rtl:-scale-x-100"
      >
        <circle
          cx="60"
          cy="60"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="8"
          className="stroke-dimrule"
        />
        <circle
          cx="60"
          cy="60"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className="stroke-on-focus motion-reduce:transition-none"
          strokeDasharray={`${drawn ? filled : 0} ${RING_LENGTH}`}
          style={{
            transition: "stroke-dasharray 900ms cubic-bezier(0.2, 0.7, 0.2, 1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
        {children}
      </div>
    </div>
  );
}

export function HeroStatsRow({ stats }: { stats: readonly HeroStat[] }) {
  return (
    <dl className="border-dimrule grid grid-cols-3 gap-3 border-t pt-4">
      {stats.map((stat) => (
        <div key={stat.label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="sr-only">{stat.label}</dt>
          <dd className="font-expanded text-title tabular-nums leading-none">
            {stat.value}
          </dd>
          <dd aria-hidden="true" className="text-dim text-eyebrow truncate">
            {stat.label}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function RatingCurveChart({
  levels,
  title,
  span,
}: {
  levels: readonly number[];
  title: string;
  span: string | null;
}) {
  const { rtl } = useTextDirection();
  const curve = ratingCurve(levels, { rtl });
  if (!curve || levels.length < 2) {
    return null;
  }

  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      <div className="text-dim flex items-baseline justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.04em]">
        <span className="truncate">{title}</span>
        {span ? <span className="shrink-0">{span}</span> : null}
      </div>
      <div className="relative h-[112px] pe-7">
        <div className="relative size-full">
          {curve.gridlines.map((line) => (
            <span
              key={line.label + line.y}
              className="border-dimrule absolute inset-x-0 border-t border-dashed"
              style={{ top: `${(line.y / CURVE_HEIGHT) * 100}%` }}
            />
          ))}
          <svg
            viewBox={`0 0 ${CURVE_WIDTH} ${CURVE_HEIGHT}`}
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            <polyline
              points={curve.points}
              fill="none"
              strokeWidth="1.75"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className="stroke-on-focus"
            />
          </svg>
          <span
            className="bg-on-focus absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${(curve.dot.x / CURVE_WIDTH) * 100}%`,
              top: `${(curve.dot.y / CURVE_HEIGHT) * 100}%`,
            }}
          />
        </div>
        {curve.gridlines.map((line) => (
          <span
            key={`label-${line.label}-${line.y}`}
            className="text-dim absolute end-0 -translate-y-1/2 font-mono text-[10px]"
            style={{ top: `${(line.y / CURVE_HEIGHT) * 100}%` }}
          >
            <span dir="ltr">{line.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function LevelHero({
  view,
  stats,
  curve,
}: {
  view: HeroView;
  stats: readonly HeroStat[];
  curve: { levels: readonly number[]; title: string; span: string | null };
}) {
  const m = useMessages();
  return (
    <HeroCard>
      <HeroTopLine label={view.label} status={view.status} />
      <p className="sr-only">{view.spoken}</p>
      <div className="flex items-center gap-5">
        <HeroRing percent={view.ring.percent}>
          <span
            aria-hidden="true"
            dir="ltr"
            className="font-expanded text-[34px] leading-none"
          >
            {view.band}
          </span>
          <span className="text-dim mt-1 text-[10px] leading-tight">
            {view.ring.label}
          </span>
        </HeroRing>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p aria-hidden="true" className="flex items-baseline gap-1.5">
            <span className="font-expanded text-[34px] tabular-nums leading-none">
              {view.rating}
            </span>
            <span className="text-dim text-eyebrow">{m.you.hero.rating}</span>
          </p>
          {view.move ? (
            <p className="text-meta font-semibold">{view.move}</p>
          ) : null}
          <p className="text-dim text-eyebrow leading-[1.5]">{view.outlook}</p>
        </div>
      </div>
      <RatingCurveChart {...curve} />
      <HeroStatsRow stats={stats} />
    </HeroCard>
  );
}

export function LevelHeroSkeleton() {
  return (
    <div
      aria-busy="true"
      className={cn("surface-focus rounded-card flex flex-col gap-5 p-5")}
    >
      <Skeleton className="bg-raised h-3 w-28" />
      <div className="flex items-center gap-5">
        <Skeleton className="bg-raised size-[116px] shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="bg-raised h-8 w-24" />
          <Skeleton className="bg-raised h-3 w-full" />
        </div>
      </div>
      <Skeleton className="bg-raised h-[112px] w-full" />
    </div>
  );
}

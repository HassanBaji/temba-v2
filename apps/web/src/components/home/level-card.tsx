"use client";

import { Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useId } from "react";

import { useLocale, useMessages } from "~/components/locale-provider";
import { Hatch } from "~/components/ui/hatch";
import { youRatingsHref } from "~/lib/dashboard-paths";
import { cn } from "~/lib/utils";
import { hatch } from "@repo/design-tokens";
import { homeLevelView, type HomeLevelView } from "@repo/domain/home-level";
import { gaugeArc, sparklinePoints } from "@repo/domain/home-level-chart";
import type { Sport } from "@repo/domain/sport";

import { noLevelCopy, type HomeLevel } from "./home-model";
import { SectionTitle } from "./section-title";

const VIEWBOX = 120;
const RADIUS = 50;
const STROKE = 10;
const SPARK_WIDTH = 60;
const SPARK_HEIGHT = 18;

function Gauge({ percent, band }: { percent: number; band: string }) {
  const patternId = `gauge-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const arc = gaugeArc(percent, RADIUS);
  const center = VIEWBOX / 2;
  return (
    <span className="relative flex size-[104px] shrink-0 items-center justify-center">
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        className="absolute inset-0 size-full"
      >
        <defs>
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={hatch.period}
            height={hatch.period}
            patternTransform={`rotate(${hatch.angle})`}
          >
            <rect
              width={hatch.stroke * 1.5}
              height={hatch.period}
              style={{ fill: "var(--hatch-stroke-paper)" }}
            />
          </pattern>
        </defs>
        <circle
          cx={center}
          cy={center}
          r={RADIUS}
          fill="none"
          stroke={`url(#${patternId})`}
          strokeWidth={STROKE}
        />
        {arc > 0 ? (
          <circle
            cx={center}
            cy={center}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${2 * Math.PI * RADIUS}`}
            transform={`rotate(-90 ${center} ${center})`}
            className="stroke-ink"
          />
        ) : null}
      </svg>
      <span
        dir="ltr"
        className="font-expanded relative text-[36px] leading-none"
      >
        {band}
      </span>
    </span>
  );
}

/** A Level's recent run, newest last along the reading direction. */
export function Sparkline({
  values,
  className,
}: {
  values: readonly number[];
  className?: string;
}) {
  const points = sparklinePoints(values, SPARK_WIDTH - 4, SPARK_HEIGHT - 4);
  if (!points) {
    return null;
  }
  const [x = 0, y = 0] = points.split(" ").at(-1)?.split(",").map(Number) ?? [];
  return (
    <svg
      aria-hidden="true"
      width={SPARK_WIDTH}
      height={SPARK_HEIGHT}
      className={cn("text-ink shrink-0 rtl:-scale-x-100", className)}
    >
      <g transform="translate(2 2)">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <circle cx={x} cy={y} r={2.5} fill="currentColor" />
      </g>
    </svg>
  );
}

function Status({
  provisional,
  label,
}: {
  provisional: boolean;
  label: string;
}) {
  return (
    <p className="text-meta flex shrink-0 items-center gap-1.5">
      {provisional ? (
        <Hatch className="size-3 rounded-[2px]" />
      ) : (
        <Check aria-hidden="true" className="size-3.5" />
      )}
      <span className={provisional ? "text-muted-foreground" : undefined}>
        {label}
      </span>
    </p>
  );
}

const CARD_LINK =
  "border-rule bg-paper hover:bg-wash focus-visible:ring-ring/50 rounded-card block border outline-none transition-colors focus-visible:ring-[3px]";

export function LevelCard({
  level,
  sport,
}: {
  level: HomeLevel;
  sport: Sport;
}) {
  const m = useMessages();
  const locale = useLocale();
  const view =
    level.kind === "rated" ? homeLevelView(level.input, locale) : null;
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle
        title={m.home.levelSection.title[sport]}
        status={
          view ? (
            <Status provisional={view.provisional} label={view.status} />
          ) : undefined
        }
      />
      {view ? (
        <Link
          href={youRatingsHref(sport)}
          aria-label={view.spoken}
          title={m.home.levelSection.opensRatings}
          className={cn(CARD_LINK, "divide-rule divide-y overflow-hidden")}
        >
          <RatedLevel view={view} />
        </Link>
      ) : (
        <Link
          href={youRatingsHref(sport)}
          title={m.home.levelSection.opensRatings}
          className={cn(CARD_LINK, "flex items-center gap-5 p-[22px]")}
        >
          <Hatch className="size-[74px] shrink-0 rounded-full" />
          <span className="flex min-w-0 flex-col gap-1.5">
            <span className="text-lead font-semibold">
              {m.profile.levelCard.noLevelYet}
            </span>
            <span className="text-meta text-muted-foreground">
              {noLevelCopy(sport, locale)}
            </span>
          </span>
        </Link>
      )}
    </section>
  );
}

function RatedLevel({ view }: { view: HomeLevelView }) {
  return (
    <>
      <span className="flex items-center gap-5 p-[22px]">
        <Gauge percent={view.percent} band={view.displayBand} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-eyebrow text-muted-foreground">
            {view.numberLabel}
          </span>
          <span className="font-expanded text-hero tabular-nums leading-none">
            {view.level}
          </span>
          {view.change ? (
            <span className="mt-1 flex items-baseline gap-2">
              <span className="font-expanded tabular-nums">
                {view.change.signedAmount}
              </span>
              <span className="text-eyebrow text-muted-foreground truncate">
                {view.change.caption}
              </span>
            </span>
          ) : null}
        </span>
      </span>
      <span className="text-meta text-muted-foreground flex items-center gap-3 px-[22px] py-3.5">
        <span className="shrink-0">{view.footer.label}</span>
        <span className="min-w-0 flex-1 truncate text-end">
          {view.footer.value ? (
            <>
              <span dir="ltr" className="font-expanded text-ink">
                {view.footer.value}
              </span>
              {view.footer.detail}
            </>
          ) : null}
        </span>
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 rtl:-scale-x-100"
        />
      </span>
    </>
  );
}

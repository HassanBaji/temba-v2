"use client";

import { Check } from "lucide-react";
import { useId } from "react";

import { useLocale, useMessages } from "~/components/locale-provider";
import { Hatch } from "~/components/ui/hatch";
import { hatch } from "@repo/design-tokens";
import { homeLevelView, type HomeLevelInput } from "@repo/domain/home-level";
import { gaugeArc } from "@repo/domain/home-level-chart";
import { nextDistinctDisplayRung } from "@repo/domain/level-bands";
import type { Sport } from "@repo/domain/sport";

import { noLevelCopy, type HomeLevel } from "./home-model";
import { SectionTitle } from "./section-title";

const VIEWBOX = 120;
const RADIUS = 50;
const STROKE = 10;

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

function Status({ provisional }: { provisional: boolean }) {
  const m = useMessages();
  return (
    <p className="text-meta flex shrink-0 items-center gap-1.5">
      {provisional ? (
        <Hatch className="size-3 rounded-[2px]" />
      ) : (
        <Check aria-hidden="true" className="size-3.5" />
      )}
      <span className={provisional ? "text-muted-foreground" : undefined}>
        {provisional
          ? m.home.levelSection.provisional
          : m.home.levelSection.confirmed}
      </span>
    </p>
  );
}

export function LevelCard({
  level,
  sport,
}: {
  level: HomeLevel;
  sport: Sport;
}) {
  const m = useMessages();
  const locale = useLocale();
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle
        title={m.home.levelSection.title[sport]}
        status={
          level.kind === "rated" ? (
            <Status provisional={level.input.provisional} />
          ) : undefined
        }
      />
      {level.kind === "rated" ? (
        <RatedLevel input={level.input} />
      ) : (
        <div className="border-rule bg-paper flex items-center gap-5 rounded-xl border p-[22px]">
          <Hatch className="size-[74px] shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="text-lead font-semibold">
              {m.profile.levelCard.noLevelYet}
            </p>
            <p className="text-meta text-muted-foreground">
              {noLevelCopy(sport, locale)}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function RatedLevel({ input }: { input: HomeLevelInput }) {
  const m = useMessages();
  const locale = useLocale();
  const view = homeLevelView(input, locale);
  const next = nextDistinctDisplayRung(input.band);
  const percent = view.progress?.percent ?? 100;
  const copy = m.home.levelSection;

  return (
    <div className="border-rule bg-paper divide-rule rounded-card divide-y overflow-hidden border">
      <div className="flex items-center gap-5 p-[22px]">
        <span
          role="img"
          aria-label={
            next
              ? copy.gaugeSpoken(view.displayBand, percent, next)
              : view.displayBand
          }
        >
          <Gauge percent={percent} band={view.displayBand} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-eyebrow text-muted-foreground">{copy.level}</p>
          <p className="font-expanded text-hero tabular-nums leading-none">
            {view.level}
          </p>
          {view.change ? (
            <p className="mt-1 flex items-baseline gap-2">
              <span className="font-expanded tabular-nums">
                {view.change.signedAmount}
              </span>
              <span className="text-eyebrow text-muted-foreground truncate">
                {copy.lastN(input.historyMatchCount)}
              </span>
            </p>
          ) : null}
        </div>
      </div>
      <p className="text-meta text-muted-foreground flex items-baseline justify-between gap-3 px-[22px] py-3.5">
        <span>{next ? copy.nextBand : copy.topBand}</span>
        {next ? (
          <span className="truncate">
            <span dir="ltr" className="font-expanded text-ink">
              {next}
            </span>
            {copy.nextBandValue(percent)}
          </span>
        ) : null}
      </p>
      {view.provisional ? (
        <p className="text-meta text-muted-foreground px-[22px] py-3.5">
          {copy.confirmsIn(Math.max(1, input.ratedMatchesRemaining))}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";

import { SurfaceLabel } from "~/components/common/surface-label";
import { Hatch } from "~/components/ui/hatch";
import { homeLevelView, type HomeLevelInput } from "@repo/domain/home-level";
import { SPORT_LABELS, type Sport } from "@repo/domain/sport";
import { cn } from "~/lib/utils";

import { noLevelCopy, type HomeLevel } from "./home-model";

const CHANGE_ICONS = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  none: ArrowRight,
} as const;

function SportMeta({ sport }: { sport: Sport }) {
  return (
    <span className="text-eyebrow font-mono uppercase">
      {SPORT_LABELS[sport]}
    </span>
  );
}

export function LevelCard({
  level,
  sport,
}: {
  level: HomeLevel;
  sport: Sport;
}) {
  return (
    <section className="border-rule bg-paper overflow-hidden rounded-xl border">
      <SurfaceLabel meta={<SportMeta sport={sport} />}>Level</SurfaceLabel>
      {level.kind === "rated" ? (
        <RatedLevel input={level.input} />
      ) : (
        <div className="flex items-center gap-5 px-[22px] pb-[22px]">
          <Hatch radius="lg" className="size-[74px] shrink-0" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="text-lead font-semibold">No Level yet</p>
            <p className="text-meta text-muted-foreground">
              {noLevelCopy(sport)}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function RatedLevel({ input }: { input: HomeLevelInput }) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    setDrawn(true);
  }, []);

  const view = homeLevelView(input);
  const ChangeIcon = view.change ? CHANGE_ICONS[view.change.direction] : null;

  return (
    <>
      <div className="flex items-stretch gap-4 px-[22px] pb-[22px]">
        <p className="font-expanded text-[88px] leading-none">
          <span className="sr-only">Level band </span>
          {view.displayBand}
        </p>
        <div className="bg-rule w-px self-stretch" />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <p className="flex items-baseline gap-2">
            <span className="font-expanded text-h2 tabular-nums">
              {view.level}
            </span>
            <span className="text-meta text-muted-foreground">Level</span>
          </p>
          {view.change && ChangeIcon ? (
            <p className="flex items-center gap-1">
              <ChangeIcon aria-hidden="true" className="size-5 shrink-0" />
              <span className="sr-only">{view.change.spoken} </span>
              <span className="font-expanded text-h2 tabular-nums">
                {view.change.amount}
              </span>
              <span className="text-meta text-muted-foreground truncate">
                {view.change.windowLabel}
              </span>
            </p>
          ) : null}
        </div>
      </div>

      {view.progress ? (
        <div className="border-rule space-y-2 border-t px-[22px] pb-4 pt-3.5">
          <p className="text-meta text-muted-foreground">
            {view.progress.label}
          </p>
          <div
            aria-hidden="true"
            className={cn(
              "h-2 w-full overflow-hidden rounded-full",
              view.provisional ? "hatch" : "bg-wash",
            )}
          >
            <div
              className="bg-ink h-full"
              style={{
                width: drawn ? `${view.progress.percent}%` : "0%",
                transition: "width 700ms ease-out",
              }}
            />
          </div>
        </div>
      ) : (
        <p className="border-rule text-meta border-t px-[22px] py-3">
          Top Level band
        </p>
      )}

      <div className="border-rule text-meta flex items-start gap-2 border-t px-[22px] py-3">
        <span
          aria-hidden="true"
          className={cn(
            "mt-[3px] size-3 shrink-0",
            view.provisional ? "hatch" : "bg-ink",
          )}
        />
        <p>
          <span className="font-semibold">{view.legend.lead}</span>
          {view.legend.rest}
        </p>
      </div>
    </>
  );
}

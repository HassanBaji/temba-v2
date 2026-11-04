"use client";

import { useEffect, useState } from "react";

import { SurfaceLabel } from "~/components/common/surface-label";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Hatch } from "~/components/ui/hatch";
import { homeLevelView, type HomeLevelInput } from "@repo/domain/home-level";
import type { Sport } from "@repo/domain/sport";
import { cn } from "~/lib/utils";

import { noLevelCopy, type HomeLevel } from "./home-model";

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
    <section className="border-rule bg-paper overflow-hidden rounded-xl border">
      <SurfaceLabel>{m.home.level.heading[sport]}</SurfaceLabel>
      {level.kind === "rated" ? (
        <RatedLevel input={level.input} />
      ) : (
        <div className="flex items-center gap-5 px-[22px] pb-[22px]">
          <Hatch radius="lg" className="size-[74px] shrink-0" />
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
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    setDrawn(true);
  }, []);

  const view = homeLevelView(input, locale);

  return (
    <>
      <div className="flex items-stretch gap-4 px-[22px] pb-[22px]">
        <p className="font-expanded text-[88px] leading-none">
          <span className="sr-only">{`${m.webAuth.home.levelBandSpoken} `}</span>
          <span dir="ltr">{view.displayBand}</span>
        </p>
        <div className="bg-rule w-px self-stretch" />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <p className="flex items-baseline gap-2">
            <span className="font-expanded text-h2 tabular-nums">
              {view.level}
            </span>
            <span className="text-meta text-muted-foreground">
              {m.home.level.numberLabel}
            </span>
          </p>
          {view.change ? (
            <p className="flex items-baseline gap-1.5">
              <span className="font-expanded text-h2 tabular-nums">
                {view.change.signedAmount}
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
          {m.profile.level.topBand}
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

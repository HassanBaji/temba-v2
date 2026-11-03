"use client";

import { Surface } from "~/components/ui/surface";
import { useEffect, useState } from "react";

import { HeroTopLine } from "~/components/games/hero-top-line";

import { DividedFigurePair } from "~/components/home/home-all-time";
import { WinLossMark } from "~/components/home/home-recent-form-row";
import {
  friendlyGameHeroModel,
  type FriendlyGameHeroInput,
  type FriendlyGameHeroModel,
} from "@repo/domain/friendly-game-hero";
import type { SurfaceTone } from "@repo/domain/surface-tone";

/** Rendered once the hero knows its tone, so a menu can take paper ink on ink. */
export type HeroActions = (tone: SurfaceTone) => React.ReactNode;

function ScheduleSubline({ line }: { line: string | null }) {
  if (!line) {
    return null;
  }
  return <p className="text-dim text-meta mt-2">{line}</p>;
}

function FinalHero({
  model,
  actions,
}: {
  model: Extract<FriendlyGameHeroModel, { kind: "final" }>;
  actions?: HeroActions;
}) {
  return (
    <article className="border-rule bg-paper text-ink rounded-xl border p-[22px]">
      <HeroTopLine
        tone="paper"
        left={model.dateLabel}
        right={<p className="shrink-0">{model.tag}</p>}
        actions={actions?.("paper")}
      />

      {model.verdict && model.verdictWord ? (
        <div className="mt-3 flex items-center gap-3">
          <WinLossMark outcome={model.verdict} />
          <span className="font-expanded text-[40px] leading-none">
            {model.verdictWord}
          </span>
        </div>
      ) : null}

      {model.setLine ? (
        <p className="text-muted-foreground text-meta mt-2 tabular-nums">
          {model.setLine}
        </p>
      ) : null}

      <div className="mt-4">
        {model.venueName ? (
          <p className="text-lead font-semibold">{model.venueName}</p>
        ) : null}
        <p className="text-muted-foreground text-meta mt-1">
          {model.courtClockLine}
        </p>
        {model.venueCity ? (
          <p className="text-muted-foreground text-meta">{model.venueCity}</p>
        ) : null}
      </div>

      <div className="mt-4">
        <DividedFigurePair surface="light" figures={model.figures} />
      </div>
    </article>
  );
}

export function FriendlyGameDetailsHero({
  actions,
  ...props
}: FriendlyGameHeroInput & { actions?: HeroActions }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const model = friendlyGameHeroModel(props, now);

  if (!model) {
    return actions ? (
      <div className="text-ink flex justify-end empty:hidden">
        {actions("paper")}
      </div>
    ) : null;
  }

  if (model.kind === "time_unset") {
    return (
      <Surface as="article" tone="ink" radius="surface" className="p-[22px]">
        <HeroTopLine tone="ink" left="Time unset" actions={actions?.("ink")} />
      </Surface>
    );
  }

  if (model.kind === "final") {
    return <FinalHero model={model} actions={actions} />;
  }

  return (
    <Surface
      as="article"
      tone={model.tone}
      radius="surface"
      className="p-[22px]"
    >
      {/* ADR-0013: the left label is booked now, not "Team confirmed" / seats held. */}
      <HeroTopLine
        tone={model.tone}
        left={model.leftLabel}
        right={
          model.statusLabel ? (
            <p className="min-w-[11ch] shrink-0 text-right tabular-nums">
              {model.statusLabel}
            </p>
          ) : null
        }
        actions={actions?.(model.tone)}
      />
      {model.partnerName ? (
        <>
          <p className="font-expanded text-display mt-3 leading-none tracking-[-0.03em]">
            You and {model.partnerName}
          </p>
          <p className="text-lead mt-3">{model.dateLine}</p>
        </>
      ) : (
        <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
          <span className="font-expanded text-[54px] tabular-nums leading-none">
            {model.kickoffTime}
          </span>
          <span className="text-dim text-[18px] leading-none">
            {model.trailer}
          </span>
        </p>
      )}
      <ScheduleSubline line={model.scheduleLine} />
      <div className="mt-4">
        <DividedFigurePair surface="dark" figures={model.figures} />
      </div>
    </Surface>
  );
}

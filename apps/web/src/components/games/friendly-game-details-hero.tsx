"use client";

import { Surface } from "~/components/ui/surface";
import { useEffect, useState } from "react";

import { DividedFigurePair } from "~/components/home/home-all-time";
import { WinLossMark } from "~/components/home/home-recent-form-row";
import {
  friendlyGameHeroModel,
  type FriendlyGameHeroInput,
  type FriendlyGameHeroModel,
} from "@repo/domain/friendly-game-hero";

function ScheduleSubline({ line }: { line: string | null }) {
  if (!line) {
    return null;
  }
  return <p className="text-dim text-meta mt-2">{line}</p>;
}

function FinalHero({
  model,
}: {
  model: Extract<FriendlyGameHeroModel, { kind: "final" }>;
}) {
  return (
    <article className="border-rule bg-paper text-ink rounded-xl border p-[22px]">
      <div className="text-muted-foreground text-meta flex items-start justify-between gap-3">
        <p className="min-w-0 truncate">{model.dateLabel}</p>
        <p className="shrink-0">{model.tag}</p>
      </div>

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

export function FriendlyGameDetailsHero(props: FriendlyGameHeroInput) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const model = friendlyGameHeroModel(props, now);

  if (!model) {
    return null;
  }

  if (model.kind === "time_unset") {
    return (
      <Surface as="article" tone="ink" radius="surface" className="p-[22px]">
        <p className="text-dim text-meta">Time unset</p>
      </Surface>
    );
  }

  if (model.kind === "final") {
    return <FinalHero model={model} />;
  }

  return (
    <Surface
      as="article"
      tone={model.tone}
      radius="surface"
      className="p-[22px]"
    >
      <div className="text-dim text-meta flex items-start justify-between gap-3">
        <p className="min-w-0 truncate">
          {/* ADR-0013: booked now, not "Team confirmed" / seats held. */}
          {model.leftLabel}
        </p>
        {model.statusLabel ? (
          <p className="min-w-[11ch] shrink-0 text-right tabular-nums">
            {model.statusLabel}
          </p>
        ) : null}
      </div>
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

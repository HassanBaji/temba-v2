"use client";

import { Navigation } from "lucide-react";
import { useEffect, useState } from "react";

import type { CourtFigure } from "@repo/domain/friendly-game-court";
import {
  friendlyGameHeroModel,
  type FriendlyGameHeroInput,
  type FriendlyGameHeroModel,
} from "@repo/domain/friendly-game-hero";

import { HeroNavRow } from "~/components/games/hero-nav-row";
import { HeroTopLine } from "~/components/games/hero-top-line";
import { DividedFigurePair } from "~/components/home/home-all-time";
import { WinLossMark } from "~/components/home/home-recent-form-row";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Surface } from "~/components/ui/surface";
import { cn } from "~/lib/utils";

/** Edge to edge on phones, matching the mobile App; a card from `md` up. */
const HERO_BLEED =
  "-mx-4 px-4 py-[22px] min-[430px]:-mx-5 min-[430px]:px-5 md:mx-0 md:rounded-xl md:p-[22px]";

export type FriendlyGameHeroPlace = {
  name: string | null;
  line: string | null;
  directionsUrl: string | null;
};

/** The countdown tag: outlined while the Game is ahead, solid once it has started. */
function StatusPill({ label, solid }: { label: string; solid: boolean }) {
  return (
    <span
      className={cn(
        "text-eyebrow shrink-0 rounded-full border px-[9px] py-[3px] tabular-nums",
        solid
          ? "bg-paper text-ink border-paper font-semibold"
          : "border-dimrule text-paper",
      )}
    >
      {label}
    </span>
  );
}

function PlaceRow({ place }: { place: FriendlyGameHeroPlace }) {
  const m = useMessages();
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        {place.name ? (
          <p className="truncate font-semibold">{place.name}</p>
        ) : null}
        {place.line ? (
          <p className="text-dim text-meta truncate">{place.line}</p>
        ) : null}
      </div>
      {place.directionsUrl ? (
        <Button
          variant="outline"
          size="sm"
          asChild
          className="border-dimrule text-paper hover:bg-raised hover:text-paper shrink-0 bg-transparent"
        >
          <a
            href={place.directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={
              place.name
                ? m.webGame.directionsTo(place.name)
                : m.webGame.directions
            }
          >
            <Navigation aria-hidden="true" className="size-3.5" />
            {m.webGame.directions}
          </a>
        </Button>
      ) : null}
    </div>
  );
}

function Figures({ figures }: { figures: CourtFigure[] }) {
  return (
    <div className="divide-dimrule border-dimrule mt-4 grid grid-cols-[1fr_1fr_1.4fr] divide-x border-t pt-4">
      {figures.map((figure) => (
        <div
          key={figure.key}
          className="flex min-w-0 flex-col gap-0.5 ps-4 first:ps-0"
        >
          <p
            className={cn(
              "font-expanded truncate text-[22px] tabular-nums leading-none tracking-[-0.03em] sm:text-[26px]",
              figure.unset && "text-dim",
            )}
          >
            {figure.value}
          </p>
          <p className="text-dim text-eyebrow truncate">{figure.label}</p>
        </div>
      ))}
    </div>
  );
}

function FinalHero({
  model,
  actions,
}: {
  model: Extract<FriendlyGameHeroModel, { kind: "final" }>;
  actions?: React.ReactNode;
}) {
  return (
    <article className="border-rule bg-paper text-ink rounded-xl border p-[22px]">
      <HeroNavRow tone="paper" actions={actions} />
      <div className="mt-6">
        <HeroTopLine
          tone="paper"
          left={model.dateLabel}
          right={<p className="shrink-0">{model.tag}</p>}
        />
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

/**
 * The black head of Game details: back and the Game's actions, when it is,
 * where, and how full the court is.
 */
export function FriendlyGameDetailsHero({
  input,
  place,
  figures,
  actions,
}: {
  input: FriendlyGameHeroInput;
  place: FriendlyGameHeroPlace | null;
  figures: CourtFigure[];
  /** Share and the Game's menu, top right across from back. */
  actions?: React.ReactNode;
}) {
  const locale = useLocale();
  const m = useMessages();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const model = friendlyGameHeroModel(input, now, locale);

  if (!model) {
    return <HeroNavRow tone="paper" actions={actions} />;
  }

  if (model.kind === "final") {
    return <FinalHero model={model} actions={actions} />;
  }

  return (
    <Surface as="article" tone="ink" className={HERO_BLEED}>
      <HeroNavRow tone="ink" actions={actions} />
      {model.kind === "time_unset" ? (
        <p className="text-dim text-meta mt-4">{m.webGame.hero.timeUnset}</p>
      ) : (
        <>
          <div className="mt-4 flex min-w-0 items-center gap-2.5">
            {/* ADR-0013: the left label is booked now, not "Team confirmed" / seats held. */}
            <p className="text-dim text-meta min-w-0 truncate">
              {model.leftLabel}
            </p>
            {model.statusLabel ? (
              <StatusPill
                label={model.statusLabel}
                solid={model.phase !== "upcoming"}
              />
            ) : null}
          </div>
          {model.partnerName ? (
            <>
              <p className="font-expanded text-display mt-3 leading-none tracking-[-0.03em]">
                {m.webGame.hero.youAnd(model.partnerName)}
              </p>
              <p className="text-lead mt-3">{model.dateLine}</p>
            </>
          ) : (
            <p className="mt-3 flex flex-wrap items-baseline gap-x-2.5">
              <span className="font-expanded text-[56px] tabular-nums leading-[0.9] tracking-[-0.04em] md:text-[72px]">
                {model.kickoffTime}
              </span>
              <span className="text-dim text-[20px] leading-none">
                {model.trailer}
              </span>
            </p>
          )}
        </>
      )}
      {place && (place.name || place.line) ? <PlaceRow place={place} /> : null}
      <Figures figures={figures} />
    </Surface>
  );
}

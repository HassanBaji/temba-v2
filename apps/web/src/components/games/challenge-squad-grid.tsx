"use client";

import {
  squadCounterParts,
  squadSeatViews,
  type SquadPlayer,
} from "@repo/domain/matchday-squad";
import type { SurfaceTone } from "@repo/domain/surface-tone";

import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Hatch } from "~/components/ui/hatch";
import { cn } from "~/lib/utils";

type SeatView = ReturnType<typeof squadSeatViews>[number];

function Seat({ seat, tone }: { seat: SeatView; tone: SurfaceTone }) {
  const ink = tone === "ink";
  const muted = ink ? "text-dim" : "text-muted-foreground";
  return (
    <li
      aria-label={seat.accessibilityLabel}
      className={cn(
        "relative flex h-[54px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-md px-1",
        seat.player && (ink ? "bg-raised" : "bg-wash"),
      )}
    >
      {seat.player ? (
        <>
          <span className="text-[12px] font-semibold leading-none">
            {seat.player.initials}
          </span>
          {seat.player.code ? (
            <span className={cn("font-mono text-[9px] leading-none", muted)}>
              {seat.player.code}
            </span>
          ) : null}
        </>
      ) : (
        <>
          <Hatch tone={tone} radius="md" className="absolute inset-0" />
          <span className={cn("relative truncate text-[11px]", muted)}>
            {seat.emptyLabel}
          </span>
        </>
      )}
    </li>
  );
}

/**
 * One side's Matchday squad: the counter, then `side + 3` seats three to a
 * row in naming order, named tiles with initials and role, empty seats
 * hatched "Open", the last three "Reserve". The second side mirrors its
 * counter.
 */
export function ChallengeSquadGrid({
  named,
  sideSize,
  end,
  tone,
}: {
  named: readonly SquadPlayer[];
  sideSize: number;
  end: boolean;
  tone: SurfaceTone;
}) {
  const locale = useLocale();
  const seats = squadSeatViews(named, sideSize, locale);
  const counter = squadCounterParts(named.length, sideSize, locale);
  return (
    <div className="min-w-0">
      <p
        className={cn(
          "mb-2 flex justify-between gap-2 text-[12px]",
          end && "flex-row-reverse",
        )}
      >
        <span className="font-semibold">{counter.strong}</span>
        <span className={tone === "ink" ? "text-dim" : "text-muted-foreground"}>
          {counter.muted}
        </span>
      </p>
      <ul className="grid grid-cols-3 gap-1.5">
        {seats.map((seat) => (
          <Seat key={seat.key} seat={seat} tone={tone} />
        ))}
      </ul>
    </div>
  );
}

type SquadSide = {
  gameTeamId: string;
  name: string | null;
  named: readonly SquadPlayer[];
  sideSize: number;
};

/**
 * Both squads of a football Challenge Game side by side under the
 * team-vs-team row, the squad button for the side the viewer names, and the
 * note on who names them.
 */
export function ChallengeSquads({
  sides,
  tone,
  action,
}: {
  sides: readonly SquadSide[];
  tone: SurfaceTone;
  action?: { label: string; accessibilityLabel: string; onClick: () => void };
}) {
  const m = useMessages();
  return (
    <section className="mt-4">
      <h2 className="sr-only">{m.challenge.gameDetails.squadsTitle}</h2>
      <div className="grid grid-cols-2 gap-3">
        {sides.slice(0, 2).map((side, index) => (
          <section
            key={side.gameTeamId}
            aria-label={m.challenge.squad.squadOf(
              side.name ?? m.team.memberFallback,
            )}
          >
            <ChallengeSquadGrid
              named={side.named}
              sideSize={side.sideSize}
              end={index === 1}
              tone={tone}
            />
          </section>
        ))}
      </div>
      {action ? (
        <Button
          type="button"
          variant={tone === "ink" ? "inverse" : "default"}
          className="mt-4 h-[50px] w-full rounded-lg text-[15px] font-semibold"
          aria-label={action.accessibilityLabel}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      ) : null}
      <p
        className={cn(
          "mt-3 text-[12px] leading-normal",
          tone === "ink" ? "text-dim" : "text-muted-foreground",
        )}
      >
        {m.challenge.squad.note}
      </p>
    </section>
  );
}

"use client";

import {
  squadCounterLine,
  squadSeatViews,
  type SquadPlayer,
} from "@repo/domain/matchday-squad";

import { useLocale } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Hatch } from "~/components/ui/hatch";

type SeatView = ReturnType<typeof squadSeatViews>[number];

function Seat({ seat }: { seat: SeatView }) {
  const reserve = seat.kind === "reserve";
  return (
    <li
      aria-label={seat.accessibilityLabel}
      className="h-15 relative flex min-w-0 flex-col justify-center gap-0.5 rounded-md px-2"
    >
      {seat.player ? (
        <>
          <span className="border-rule pointer-events-none absolute inset-0 rounded-md border" />
          <span className="text-meta truncate font-semibold">
            {seat.player.name}
          </span>
          <span className="text-eyebrow text-muted-foreground truncate">
            {[reserve ? seat.label : null, seat.player.meta || null]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </>
      ) : (
        <>
          <Hatch radius="md" className="absolute inset-0" />
          {reserve ? (
            <span className="text-eyebrow text-muted-foreground relative text-center font-mono uppercase">
              {seat.label}
            </span>
          ) : null}
        </>
      )}
    </li>
  );
}

/**
 * One side's Matchday squad: `side + 3` seats in naming order, named tiles
 * with their role, empty seats hatched, the last three labelled Reserve, the
 * counter line, and the squad button for whoever acts for this side.
 */
export function ChallengeSquadGrid({
  title,
  named,
  sideSize,
  action,
}: {
  title: string;
  named: readonly SquadPlayer[];
  sideSize: number;
  action?: { label: string; accessibilityLabel: string; onClick: () => void };
}) {
  const locale = useLocale();
  const seats = squadSeatViews(named, sideSize, locale);
  return (
    <section className="border-rule bg-paper space-y-3 rounded-xl border p-5">
      <div>
        <h2 className="text-title font-semibold tracking-[-0.01em]">{title}</h2>
        <p className="text-meta text-muted-foreground">
          {squadCounterLine(named.length, sideSize, locale)}
        </p>
      </div>
      <ul className="grid grid-cols-3 gap-1.5">
        {seats
          .filter((seat) => seat.kind === "side")
          .map((seat) => (
            <Seat key={seat.key} seat={seat} />
          ))}
      </ul>
      <ul className="grid grid-cols-3 gap-1.5">
        {seats
          .filter((seat) => seat.kind === "reserve")
          .map((seat) => (
            <Seat key={seat.key} seat={seat} />
          ))}
      </ul>
      {action ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full"
          aria-label={action.accessibilityLabel}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      ) : null}
    </section>
  );
}

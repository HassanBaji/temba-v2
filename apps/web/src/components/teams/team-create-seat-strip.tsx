"use client";

import type { TeamRosterDraftView } from "@repo/domain/team-roster-draft";

import { useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

const SEAT = {
  in: "bg-control",
  pending: "hatch [--hatch-inset:var(--color-input)]",
  open: "border-rule border",
} as const;

/** One segment per Roster seat: in, waiting, open. */
export function TeamCreateSeatStrip({
  roster,
  legend,
}: {
  roster: TeamRosterDraftView;
  legend: boolean;
}) {
  const m = useMessages().team.create;
  return (
    <div className="mt-3">
      <div
        role="img"
        aria-label={roster.stripSpoken}
        className="grid gap-0.5"
        style={{
          gridTemplateColumns: `repeat(${roster.seats.length}, minmax(0, 1fr))`,
        }}
      >
        {roster.seats.map((seat, index) => (
          <span key={index} className={cn("h-2 rounded-[2px]", SEAT[seat])} />
        ))}
      </div>
      <div className="text-muted-foreground mt-1.5 flex justify-between gap-3 text-[11px] leading-4">
        <span>{roster.stripHelper}</span>
        <span className="shrink-0">{roster.stripMax}</span>
      </div>
      {legend ? (
        <div className="text-eyebrow text-muted-foreground mt-2 flex flex-wrap gap-x-3.5 gap-y-1">
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn("h-2 w-3.5 rounded-[2px]", SEAT.in)}
            />
            {m.legendIn}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn("h-2 w-3.5 rounded-[2px]", SEAT.pending)}
            />
            {m.legendPending}
          </span>
        </div>
      ) : null}
    </div>
  );
}

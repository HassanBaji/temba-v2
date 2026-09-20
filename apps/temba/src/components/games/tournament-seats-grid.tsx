"use client";

import {
  INVITE_FROM_A_GROUP_LABEL,
  SEATS_HEADING,
  tournamentFieldSummary,
  tournamentSeatsTakenLine,
  tournamentSeatsTakenSrLabel,
  type TournamentHomeSide,
} from "~/lib/tournament-home";
import { cn } from "~/lib/utils";

export function TournamentSeatsGrid({
  sides,
  onInvite,
}: {
  sides: readonly TournamentHomeSide[];
  onInvite?: () => void;
}) {
  const field = tournamentFieldSummary(sides);
  if (field.seatTotal < 1) {
    return null;
  }

  const cells = sides.flatMap((side) => [
    { key: `${side.sideIndex}-left`, filled: side.left != null },
    { key: `${side.sideIndex}-right`, filled: side.right != null },
  ]);
  const countLine = tournamentSeatsTakenLine(field.seatsTaken, field.seatTotal);

  return (
    <section className="border-rule rounded-[14px] border p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold">{SEATS_HEADING}</h2>
        <p aria-hidden="true" className="text-muted-foreground text-[13px]">
          {countLine}
        </p>
      </div>
      <div aria-hidden="true" className="mt-3.5 grid grid-cols-12 gap-[5px]">
        {cells.map((cell) => (
          <span
            key={cell.key}
            className={cn(
              "h-[22px] rounded-[5px]",
              cell.filled ? "bg-ink" : "hatch border-rule box-border border",
            )}
          />
        ))}
      </div>
      <p className="sr-only">
        {tournamentSeatsTakenSrLabel(field.seatsTaken, field.seatTotal)}
      </p>
      {onInvite ? (
        <button
          type="button"
          onClick={onInvite}
          className="border-ink focus-visible:ring-ring/50 mt-[18px] flex min-h-11 w-full items-center justify-center rounded-[11px] border text-sm font-semibold outline-none focus-visible:ring-[3px]"
        >
          {INVITE_FROM_A_GROUP_LABEL}
        </button>
      ) : null}
    </section>
  );
}

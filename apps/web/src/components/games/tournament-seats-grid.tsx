"use client";

import { Button } from "~/components/ui/button";
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
    <section className="border-rule rounded-card border p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-body font-semibold">{SEATS_HEADING}</h2>
        <p aria-hidden="true" className="text-muted-foreground text-meta">
          {countLine}
        </p>
      </div>
      <div aria-hidden="true" className="mt-3.5 grid grid-cols-12 gap-[5px]">
        {cells.map((cell) => (
          <span
            key={cell.key}
            className={cn(
              "rounded-xs h-[22px]",
              cell.filled ? "bg-ink" : "hatch border-rule box-border border",
            )}
          />
        ))}
      </div>
      <p className="sr-only">
        {tournamentSeatsTakenSrLabel(field.seatsTaken, field.seatTotal)}
      </p>
      {onInvite ? (
        <Button
          type="button"
          variant="outline"
          onClick={onInvite}
          className="border-ink mt-[18px] w-full font-semibold"
        >
          {INVITE_FROM_A_GROUP_LABEL}
        </Button>
      ) : null}
    </section>
  );
}

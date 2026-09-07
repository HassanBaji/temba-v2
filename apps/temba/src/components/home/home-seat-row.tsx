import { Fragment } from "react";

import { initials } from "~/lib/initials";
import type { HomeSeatView } from "~/lib/home-seats";
import { cn } from "~/lib/utils";
import { UserAvatar } from "../common/user-avatar";

function seatCaption(seat: HomeSeatView, useInitials: boolean): string | null {
  if (!seat.filled || !seat.name) {
    return null;
  }
  if (useInitials) {
    return initials(seat.name);
  }
  const first = seat.name.trim().split(/\s+/)[0];
  return first ?? seat.name;
}

function seatsBySide(seats: HomeSeatView[]): HomeSeatView[][] {
  const groups: HomeSeatView[][] = [];
  const indexByLabel = new Map<string, number>();

  for (const seat of seats) {
    const label = seat.sideLabel ?? "";
    const existing = indexByLabel.get(label);
    if (existing === undefined) {
      indexByLabel.set(label, groups.length);
      groups.push([seat]);
      continue;
    }
    groups[existing]?.push(seat);
  }

  return groups;
}

function HomeSeat({
  seat,
  useInitials,
}: {
  seat: HomeSeatView;
  useInitials: boolean;
}) {
  const caption = seatCaption(seat, useInitials);

  return (
    <div
      className={cn(
        "relative flex h-[60px] min-w-0 flex-1 flex-col items-center justify-center rounded-[5px]",
        seat.filled ? "bg-raised" : null,
      )}
    >
      {seat.filled ? (
        <div className="flex flex-col items-center gap-1">
          <UserAvatar
            name={seat.name ?? ""}
            image={seat.image ?? ""}
            className="size-6"
          />
          <span className="sr-only">{seat.name ?? "Filled seat"}</span>
          <span
            aria-hidden="true"
            className="text-paper truncate px-1 text-xs font-medium"
          >
            {caption}
          </span>
        </div>
      ) : (
        <>
          <span
            aria-hidden="true"
            className="hatch hatch-on-ink absolute inset-0 rounded-[5px]"
          />
          <span aria-hidden="true" className="text-paper text-lead">
            +
          </span>
          <span className="sr-only">Open seat</span>
        </>
      )}
    </div>
  );
}

export function HomeSeatRow({ seats }: { seats: HomeSeatView[] }) {
  const filled = seats.filter((seat) => seat.filled).length;
  const open = seats.length - filled;
  const useInitials = seats.length > 6;
  const sides = seatsBySide(seats);

  return (
    <div className="space-y-2">
      <div className="text-dim text-meta flex items-center justify-between gap-2">
        <p>
          {filled} of {seats.length} players in
        </p>
        <p>
          {open === 0
            ? "Full"
            : open === 1
              ? "One spot open"
              : `${open} spots open`}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {sides.map((sideSeats, index) => (
          <Fragment key={sideSeats[0]?.id ?? index}>
            {index > 0 ? (
              <span className="text-dim text-meta shrink-0 px-1.5 font-medium">
                vs
              </span>
            ) : null}
            <div className="flex min-w-0 flex-1 gap-1">
              {sideSeats.map((seat) => (
                <HomeSeat key={seat.id} seat={seat} useInitials={useInitials} />
              ))}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

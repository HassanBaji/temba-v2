import { Fragment } from "react";

import {
  homeSeatCaption,
  homeSeatRowSummary,
  homeSeatsBySide,
  type HomeSeatView,
} from "@repo/domain/home-seats";
import { cn } from "~/lib/utils";
import { UserAvatar } from "../common/user-avatar";

function HomeSeat({
  seat,
  useInitials,
}: {
  seat: HomeSeatView;
  useInitials: boolean;
}) {
  const caption = homeSeatCaption(seat, useInitials);

  return (
    <div
      className={cn(
        "rounded-xs relative flex h-[60px] min-w-0 flex-1 flex-col items-center justify-center",
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
            className="text-paper text-eyebrow truncate px-1 font-medium"
          >
            {caption}
          </span>
        </div>
      ) : (
        <>
          <span
            aria-hidden="true"
            className="hatch hatch-on-ink rounded-xs absolute inset-0"
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
  const { filled, total, useInitials, spotsLabel } = homeSeatRowSummary(seats);
  const sides = homeSeatsBySide(seats);

  return (
    <div className="space-y-2">
      <div className="text-dim text-meta flex items-center justify-between gap-2">
        <p>
          {filled} of {total} players in
        </p>
        {spotsLabel ? <p>{spotsLabel}</p> : null}
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

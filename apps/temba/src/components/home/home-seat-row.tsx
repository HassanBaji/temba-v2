import { initials } from "~/lib/initials";
import type { HomeSeatView } from "~/lib/home-seats";
import { cn } from "~/lib/utils";

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

export function HomeSeatRow({ seats }: { seats: HomeSeatView[] }) {
  const filled = seats.filter((seat) => seat.filled).length;
  const open = seats.length - filled;
  const useInitials = seats.length > 6;

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
      <div className="flex gap-1">
        {seats.map((seat) => {
          const caption = seatCaption(seat, useInitials);
          return (
            <div
              key={seat.id}
              className={cn(
                "relative flex h-[52px] min-w-0 flex-1 flex-col items-center justify-center rounded-[5px]",
                seat.filled ? "bg-raised" : null,
              )}
            >
              {seat.filled ? (
                <>
                  <span className="sr-only">{seat.name ?? "Filled seat"}</span>
                  <span
                    aria-hidden="true"
                    className="text-paper text-meta truncate px-1"
                  >
                    {caption}
                  </span>
                </>
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
        })}
      </div>
    </div>
  );
}

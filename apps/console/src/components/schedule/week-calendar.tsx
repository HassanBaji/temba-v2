import { Hatch } from "~/components/ui/hatch";
import { cn } from "~/lib/utils";
import { formatDayMonth } from "@repo/domain/format-game-start";

import { BookingBlock } from "./booking-block";
import {
  closuresForCourt,
  dayStart,
  overlapsDay,
  weekDays,
} from "./booking-model";
import type { VenueBookings } from "./booking-types";

export function WeekCalendar({
  day,
  today,
  data,
  onSelect,
  onOpenDay,
}: {
  day: string;
  today: string;
  data: VenueBookings;
  onSelect: (bookingId: string) => void;
  onOpenDay: (day: string) => void;
}) {
  const days = weekDays(day);
  const { grid, bookings } = data;

  if (grid.courts.length === 0) {
    return (
      <p className="text-body text-muted-foreground">
        This Venue has no Courts yet.
      </p>
    );
  }

  return (
    <div className="border-border overflow-x-auto rounded-lg border">
      <div
        className="grid min-w-max"
        style={{
          gridTemplateColumns: `7rem repeat(7, minmax(9rem, 1fr))`,
        }}
      >
        <div className="border-border bg-background sticky left-0 z-10 border-b" />
        {days.map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => onOpenDay(entry)}
            className={cn(
              "text-body border-border border-b border-l px-2 py-2 text-left font-semibold",
              entry === today && "underline underline-offset-4",
            )}
          >
            {formatDayMonth(dayStart(entry), { weekday: "short" })}
          </button>
        ))}

        {grid.courts.map((court) => (
          <WeekRow
            key={court.id}
            court={court}
            days={days}
            data={{ grid, bookings }}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function WeekRow({
  court,
  days,
  data,
  onSelect,
}: {
  court: VenueBookings["grid"]["courts"][number];
  days: string[];
  data: Pick<VenueBookings, "grid" | "bookings">;
  onSelect: (bookingId: string) => void;
}) {
  return (
    <>
      <div className="text-body border-border bg-background sticky left-0 z-10 border-b px-2 py-2 font-semibold">
        {court.name}
      </div>
      {days.map((entry) => {
        const closures = closuresForCourt(data.grid.closures, court.id, entry);
        const cell = data.bookings.filter(
          (booking) =>
            booking.courtId === court.id && overlapsDay(entry, booking),
        );
        const closed =
          (data.grid.days.find((d) => d.day === entry)?.windows.length ?? 0) ===
          0;
        return (
          <div
            key={entry}
            className={cn(
              "border-border relative flex min-h-20 flex-col gap-1 border-b border-l p-1",
              closed && "bg-secondary/60",
            )}
          >
            {closures.length > 0 ? (
              <div className="border-border relative h-5 overflow-hidden rounded-sm border">
                <Hatch className="absolute inset-0" />
                <span className="text-eyebrow bg-background relative px-1">
                  {closures[0]?.reason?.trim() ? closures[0].reason : "Closed"}
                </span>
              </div>
            ) : null}
            {cell.map((booking) => (
              <BookingBlock
                key={booking.id}
                booking={booking}
                onSelect={onSelect}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}

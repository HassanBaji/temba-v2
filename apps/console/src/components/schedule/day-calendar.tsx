import { Hatch } from "~/components/ui/hatch";
import { cn } from "~/lib/utils";

import { BookingBlock } from "./booking-block";
import {
  buildDayGrid,
  closuresForCourt,
  formatClock,
  overlapsDay,
  placeInterval,
  rowSpan,
} from "./booking-model";
import type { VenueBookings } from "./booking-types";

const ROW_HEIGHT = 40;

export function DayCalendar({
  day,
  data,
  onSelect,
}: {
  day: string;
  data: VenueBookings;
  onSelect: (bookingId: string) => void;
}) {
  const { grid, bookings } = data;
  const windows = grid.days.find((entry) => entry.day === day)?.windows ?? [];
  const todays = bookings.filter((booking) => overlapsDay(day, booking));
  const layout = buildDayGrid({
    day,
    slotMinutes: grid.slotMinutes,
    windows,
    bookings: todays,
  });

  if (grid.courts.length === 0) {
    return (
      <p className="text-body text-muted-foreground">
        This Venue has no Courts yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {windows.length === 0 ? (
        <p className="text-body text-muted-foreground">
          The Venue is closed this day.
        </p>
      ) : null}
      <div className="border-border overflow-x-auto rounded-lg border">
        <div
          className="grid min-w-max"
          style={{
            gridTemplateColumns: `4rem repeat(${grid.courts.length}, minmax(10rem, 1fr))`,
          }}
        >
          <div className="border-border bg-background sticky left-0 z-10 border-b" />
          {grid.courts.map((court) => (
            <div
              key={court.id}
              className="text-body border-border border-b border-l px-2 py-2 font-semibold"
            >
              {court.name}
            </div>
          ))}

          <div
            className="bg-background sticky left-0 z-10"
            style={{ height: layout.rows.length * ROW_HEIGHT }}
          >
            {layout.rows.map((row) => (
              <div
                key={row.minute}
                className="text-eyebrow text-muted-foreground px-2 pt-1"
                style={{ height: ROW_HEIGHT }}
              >
                {formatClock(row.minute)}
              </div>
            ))}
          </div>

          {grid.courts.map((court) => (
            <div
              key={court.id}
              className="border-border relative border-l"
              style={{ height: layout.rows.length * ROW_HEIGHT }}
            >
              {layout.rows.map((row) => (
                <div
                  key={row.minute}
                  data-open={row.open}
                  className={cn(
                    "border-border border-t",
                    row.open ? "" : "bg-secondary/60",
                  )}
                  style={{ height: ROW_HEIGHT }}
                />
              ))}
              {closuresForCourt(grid.closures, court.id, day).map((closure) => {
                const span = rowSpan(
                  layout,
                  grid.slotMinutes,
                  placeInterval(day, closure),
                );
                return span ? (
                  <div
                    key={closure.id}
                    className="border-border absolute inset-x-0 overflow-hidden border-y"
                    style={{
                      top: span.top * ROW_HEIGHT,
                      height: span.height * ROW_HEIGHT,
                    }}
                  >
                    <Hatch className="absolute inset-0" />
                    <span className="text-eyebrow bg-background relative m-1 inline-block px-1">
                      {closure.reason?.trim() ? closure.reason : "Closed"}
                    </span>
                  </div>
                ) : null;
              })}
              {todays
                .filter((booking) => booking.courtId === court.id)
                .map((booking) => {
                  const span = rowSpan(
                    layout,
                    grid.slotMinutes,
                    placeInterval(day, booking),
                  );
                  return span ? (
                    <BookingBlock
                      key={booking.id}
                      booking={booking}
                      onSelect={onSelect}
                      className="absolute inset-x-1 z-[1]"
                      style={{
                        top: span.top * ROW_HEIGHT + 2,
                        height: span.height * ROW_HEIGHT - 4,
                      }}
                    />
                  ) : null;
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

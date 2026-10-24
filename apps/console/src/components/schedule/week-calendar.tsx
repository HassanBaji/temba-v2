"use client";

import { LayoutGrid } from "lucide-react";

import { CourtSportBadge } from "~/components/courts/court-sport-badge";
import { EmptyState } from "~/components/common/empty-state";
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

const COLUMNS = "120px repeat(7, minmax(0, 1fr))";
const HEADER_HEIGHT = 48;

export function WeekCalendar({
  day,
  today,
  now,
  data,
  selectedId,
  onSelect,
  onOpenDay,
}: {
  day: string;
  today: string;
  now: Date;
  data: VenueBookings;
  selectedId: string | null;
  onSelect: (bookingId: string) => void;
  onOpenDay: (day: string) => void;
}) {
  const days = weekDays(day);
  const { grid, bookings } = data;

  if (grid.courts.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="No Courts yet"
        description="Add a Court under Courts & pricing to see the week."
      />
    );
  }

  return (
    <div className="min-w-0 pr-7">
      <div
        className="border-rule bg-paper sticky top-0 z-20 grid border-b"
        style={{ gridTemplateColumns: COLUMNS, height: HEADER_HEIGHT }}
      >
        <div />
        {days.map((entry) => {
          const date = dayStart(entry);
          const isToday = entry === today;
          return (
            <button
              key={entry}
              type="button"
              onClick={() => onOpenDay(entry)}
              aria-label={`Open ${formatDayMonth(date, { weekday: "long" })}`}
              className="hover:bg-wash flex min-w-0 items-center gap-1.5 px-2.5 text-left text-[13px] transition-colors"
            >
              <span className="text-muted-foreground">
                {formatDayMonth(date, { weekday: "short" }).split(" ")[0]}
              </span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  isToday && "bg-ink text-paper rounded-[4px] px-1.5",
                )}
              >
                {formatDayMonth(date)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="pb-6">
        {grid.courts.map((court) => (
          <div
            key={court.id}
            className="grid"
            style={{ gridTemplateColumns: COLUMNS }}
          >
            <div className="border-rule flex min-w-0 items-start border-b px-2.5 py-2.5 text-[13px] font-semibold">
              <span className="truncate">{court.name}</span>
              <CourtSportBadge sport={court.sport} className="ml-2" />
            </div>
            {days.map((entry) => {
              const closures = closuresForCourt(grid.closures, court.id, entry);
              const cell = bookings.filter(
                (booking) =>
                  booking.courtId === court.id && overlapsDay(entry, booking),
              );
              const closed =
                (grid.days.find((d) => d.day === entry)?.windows.length ??
                  0) === 0;
              return (
                <div
                  key={entry}
                  className={cn(
                    "border-rule relative flex min-h-24 min-w-0 flex-col gap-1 border-b border-l p-1.5",
                    closed && "hatch",
                  )}
                >
                  {closures.map((closure) => (
                    <div
                      key={closure.id}
                      className="hatch rounded-block text-muted-foreground truncate px-2 py-1 text-[11px]"
                    >
                      {closure.reason?.trim()
                        ? `Closed, ${closure.reason.trim()}`
                        : "Closed"}
                    </div>
                  ))}
                  {cell.map((booking) => (
                    <BookingBlock
                      key={booking.id}
                      booking={booking}
                      now={now}
                      layout="week"
                      selected={booking.id === selectedId}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

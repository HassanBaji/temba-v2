"use client";

import { LayoutGrid } from "lucide-react";
import type { MouseEvent } from "react";

import { EmptyState } from "~/components/common/empty-state";
import { cn } from "~/lib/utils";
import { formatGameClock } from "@repo/domain/format-game-start";

import { BookingBlock } from "./booking-block";
import {
  buildDayGrid,
  closureTimeLabel,
  closuresForCourt,
  dayStart,
  formatAxisClock,
  hourMarks,
  nowOffset,
  overlapsDay,
  placeInterval,
  rowSpan,
} from "./booking-model";
import type { VenueBookings } from "./booking-types";

/** One minute is one pixel, so a 30-minute step is the design's 30px row. */
const AXIS_WIDTH = 56;
const COLUMN_GAP = 6;
const HEADER_HEIGHT = 48;
const COURT_MIN_WIDTH = 120;
const BLOCK_INSET = 2;
const DENSE_BLOCK_HEIGHT = 44;
const MS_PER_MINUTE = 60_000;

export type DraftPlacement = {
  courtId: string;
  startMinute: number;
  durationMinutes: number;
};

export function DayCalendar({
  day,
  now,
  data,
  selectedId,
  onSelect,
  draft,
  onPickCell,
}: {
  day: string;
  now: Date;
  data: VenueBookings;
  selectedId: string | null;
  onSelect: (bookingId: string) => void;
  draft?: DraftPlacement | null;
  /** A click on open, empty grid time that has not ended. */
  onPickCell?: (courtId: string, startMinute: number) => void;
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
  const height = layout.endMinute - layout.startMinute;
  const marks = hourMarks(layout);
  const nowTop = nowOffset(layout, day, now);
  const draftSpan = draft
    ? rowSpan(layout, grid.slotMinutes, {
        startMinute: draft.startMinute,
        endMinute: draft.startMinute + draft.durationMinutes,
      })
    : null;

  function pickCell(courtId: string, event: MouseEvent<HTMLDivElement>) {
    if (!onPickCell || event.target !== event.currentTarget) {
      return;
    }
    const offset =
      event.clientY - event.currentTarget.getBoundingClientRect().top;
    const minute =
      layout.startMinute +
      Math.floor(offset / grid.slotMinutes) * grid.slotMinutes;
    const endsAt =
      dayStart(day).getTime() + (minute + grid.slotMinutes) * MS_PER_MINUTE;
    if (endsAt <= now.getTime()) {
      return;
    }
    onPickCell(courtId, minute);
  }

  const columns = `${AXIS_WIDTH}px repeat(${grid.courts.length}, minmax(${COURT_MIN_WIDTH}px, 1fr))`;

  if (grid.courts.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="No Courts yet"
        description="Add a Court under Courts & pricing to see the day grid."
      />
    );
  }

  return (
    <div className="min-w-0 pr-7">
      <div
        className="border-rule bg-paper sticky top-0 z-20 grid border-b"
        style={{
          gridTemplateColumns: columns,
          columnGap: COLUMN_GAP,
          height: HEADER_HEIGHT,
        }}
      >
        <div />
        {grid.courts.map((court) => (
          <div
            key={court.id}
            className="flex min-w-0 items-center px-2.5 text-[13px] font-semibold"
          >
            <span className="truncate">{court.name}</span>
          </div>
        ))}
      </div>

      {windows.length === 0 ? (
        <p className="text-muted-foreground px-2.5 pt-3 text-[13px]">
          The Venue is closed this day.
        </p>
      ) : null}

      <div className="pb-6 pt-2">
        <div
          className="relative grid"
          style={{
            gridTemplateColumns: columns,
            columnGap: COLUMN_GAP,
            height,
          }}
        >
          <div className="relative">
            {marks.map((mark) => (
              <span
                key={mark.minute}
                className="text-dim absolute left-0 -translate-y-1/2 text-[11px] tabular-nums"
                style={{ top: mark.minute - layout.startMinute }}
              >
                {mark.label}
              </span>
            ))}
          </div>

          {marks.map((mark) => (
            <div
              key={mark.minute}
              aria-hidden="true"
              className="border-rule pointer-events-none absolute right-0 border-t"
              style={{
                left: AXIS_WIDTH + COLUMN_GAP,
                top: mark.minute - layout.startMinute,
              }}
            />
          ))}

          {grid.courts.map((court) => (
            // The header's New booking button is the keyboard path; a click
            // on the grid only saves picking the Court and start.
            <div
              key={court.id}
              className={cn("relative min-w-0", onPickCell && "cursor-pointer")}
              onClick={(event) => pickCell(court.id, event)}
            >
              {layout.rows
                .filter((row) => !row.open)
                .map((row) => (
                  <div
                    key={row.minute}
                    aria-hidden="true"
                    className="bg-wash absolute inset-x-0"
                    style={{
                      top: row.minute - layout.startMinute,
                      height: grid.slotMinutes,
                    }}
                  />
                ))}

              {closuresForCourt(grid.closures, court.id, day).map((closure) => {
                const placed = placeInterval(day, closure);
                const span = rowSpan(layout, grid.slotMinutes, placed);
                return span ? (
                  <div
                    key={closure.id}
                    className="hatch rounded-block text-muted-foreground absolute inset-x-0 overflow-hidden px-2.5 py-2 text-xs leading-4"
                    style={{
                      top: span.top * grid.slotMinutes + BLOCK_INSET,
                      height: span.height * grid.slotMinutes - BLOCK_INSET * 2,
                    }}
                  >
                    <div className="text-ink truncate font-semibold">
                      {closure.reason?.trim()
                        ? `Closed, ${closure.reason.trim()}`
                        : "Closed"}
                    </div>
                    <div className="truncate">
                      {closureTimeLabel(placed, layout)}
                    </div>
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
                  if (!span) {
                    return null;
                  }
                  const blockHeight =
                    span.height * grid.slotMinutes - BLOCK_INSET * 2;
                  return (
                    <BookingBlock
                      key={booking.id}
                      booking={booking}
                      now={now}
                      layout={
                        blockHeight < DENSE_BLOCK_HEIGHT ? "dense" : "day"
                      }
                      selected={booking.id === selectedId}
                      onSelect={onSelect}
                      className="absolute inset-x-0 z-[1]"
                      style={{
                        top: span.top * grid.slotMinutes + BLOCK_INSET,
                        height: blockHeight,
                      }}
                    />
                  );
                })}

              {draft?.courtId === court.id && draftSpan ? (
                <div
                  aria-hidden="true"
                  className="border-ink bg-wash rounded-block pointer-events-none absolute inset-x-0 z-[2] overflow-hidden border-2 border-dashed px-2.5 py-2 text-xs leading-4"
                  style={{
                    top: draftSpan.top * grid.slotMinutes + BLOCK_INSET,
                    height:
                      draftSpan.height * grid.slotMinutes - BLOCK_INSET * 2,
                  }}
                >
                  <div className="truncate font-semibold">New booking</div>
                  <div className="text-muted-foreground truncate">
                    {formatAxisClock(draft.startMinute, "meridiem")} to{" "}
                    {formatAxisClock(
                      draft.startMinute + draft.durationMinutes,
                      "meridiem",
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ))}

          {nowTop !== null ? (
            <div
              aria-hidden="true"
              className="border-ink pointer-events-none absolute right-0 z-10 border-t-2"
              style={{ left: AXIS_WIDTH + COLUMN_GAP, top: nowTop }}
            >
              <span className="bg-ink text-paper absolute -top-[18px] right-0 rounded-[4px] px-[5px] py-0.5 font-mono text-[10px]">
                {formatGameClock(now)}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

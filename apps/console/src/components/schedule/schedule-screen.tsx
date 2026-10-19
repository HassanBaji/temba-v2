"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { ErrorState } from "~/components/common/error-state";
import { ConsolePage } from "~/components/console/console-page";
import { useManagedVenue } from "~/components/console/managed-venue-context";
import { SegmentedControl } from "~/components/console/segmented-control";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { formatDayMonth } from "@repo/domain/format-game-start";
import { productDayKey } from "@repo/domain/product-timezone";

import { addDays, dayStart, scheduleStats, weekDays } from "./booking-model";
import { BookingPanel } from "./booking-panel";
import { DayCalendar } from "./day-calendar";
import { DateStepper, ScheduleLegend } from "./schedule-header";
import { ScheduleStatLine } from "./schedule-stats";
import { WeekCalendar } from "./week-calendar";

const CALENDAR_STATUSES = ["confirmed", "pending_payment", "no_show"] as const;

const VIEWS = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
] as const;

type View = (typeof VIEWS)[number]["value"];

function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function ScheduleScreen() {
  const venue = useManagedVenue();
  const now = useNow();
  const today = productDayKey(now);
  const [view, setView] = useState<View>("day");
  const [day, setDay] = useState(() => productDayKey(new Date()));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const week = weekDays(day);
  const range =
    view === "week" ? { from: week[0]!, to: week[6]! } : { from: day, to: day };
  const calendar = api.bookings.listForVenue.useQuery(
    { venueId: venue.id, ...range, status: [...CALENDAR_STATUSES] },
    { placeholderData: keepPreviousData },
  );
  const step = view === "week" ? 7 : 1;
  const unit = view === "week" ? "week" : "day";

  const data = calendar.data;
  const selected = data?.bookings.find((b) => b.id === selectedId) ?? null;
  const stats = data
    ? scheduleStats({
        days: data.grid.days,
        bookings: data.bookings,
        courtCount: data.grid.courts.length,
        now,
      })
    : null;

  const label =
    view === "week"
      ? `${formatDayMonth(dayStart(range.from))} to ${formatDayMonth(dayStart(range.to))}`
      : formatDayMonth(dayStart(day), { weekday: "short" });
  const hint =
    view === "week"
      ? week.includes(today)
        ? "This week"
        : undefined
      : day === today
        ? "Today"
        : undefined;
  const takenLabel = view === "day" && day === today ? "taken today" : "taken";

  return (
    <ConsolePage className="min-h-0 gap-0 overflow-hidden p-0">
      <header className="flex items-center gap-3.5 px-7 pt-[22px]">
        <DateStepper
          label={label}
          hint={hint}
          previousLabel={`Previous ${unit}`}
          nextLabel={`Next ${unit}`}
          onPrevious={() => setDay(addDays(day, -step))}
          onNext={() => setDay(addDays(day, step))}
          onToday={() => setDay(today)}
        />
        <SegmentedControl
          value={view}
          options={VIEWS}
          onChange={setView}
          label="Calendar view"
        />
        <ScheduleLegend />
      </header>

      <div className="px-7 pt-3.5">
        {stats ? (
          <ScheduleStatLine stats={stats} takenLabel={takenLabel} />
        ) : (
          <Skeleton className="h-[18px] w-80" />
        )}
      </div>

      <div className="border-rule mt-[18px] flex min-h-0 flex-1 border-t">
        <div
          className={cn(
            "min-w-0 flex-1 overflow-auto pl-7 transition-opacity",
            calendar.isPlaceholderData && "opacity-60",
          )}
          aria-busy={calendar.isFetching || undefined}
        >
          {calendar.isLoading ? (
            <Skeleton className="mr-7 mt-4 h-80" />
          ) : calendar.error || !data ? (
            <ErrorState
              title="Bookings could not be loaded"
              message={calendar.error?.message}
              onRetry={() => {
                void calendar.refetch();
              }}
            />
          ) : view === "day" ? (
            <DayCalendar
              day={day}
              now={now}
              data={data}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ) : (
            <WeekCalendar
              day={day}
              today={today}
              now={now}
              data={data}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onOpenDay={(next) => {
                setDay(next);
                setView("day");
              }}
            />
          )}
        </div>
        {selected ? (
          <BookingPanel
            venueId={venue.id}
            booking={selected}
            onClose={() => setSelectedId(null)}
          />
        ) : null}
      </div>
    </ConsolePage>
  );
}

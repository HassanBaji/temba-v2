"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { ErrorState } from "~/components/common/error-state";
import { ConsolePage } from "~/components/console/console-page";
import { useManagedVenue } from "~/components/console/managed-venue-context";
import { SegmentedControl } from "~/components/console/segmented-control";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useLocale, useMessages } from "~/components/locale-provider";
import { formatDayMonth } from "@repo/domain/format-game-start";
import { productDayKey } from "@repo/domain/product-timezone";

import { addDays, dayStart, scheduleStats, weekDays } from "./booking-model";
import { BookingPanel } from "./booking-panel";
import { DayCalendar } from "./day-calendar";
import type { NewBookingDraft } from "./new-booking-model";
import { NewBookingPanel } from "./new-booking-panel";
import { DateStepper, ScheduleLegend } from "./schedule-header";
import { ScheduleStatLine } from "./schedule-stats";
import { WeekCalendar } from "./week-calendar";

const CALENDAR_STATUSES = ["confirmed", "pending_payment", "no_show"] as const;

const VIEWS = ["day", "week"] as const;

type View = (typeof VIEWS)[number];

function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function ScheduleScreen() {
  const m = useMessages().consoleSchedule;
  const locale = useLocale();
  const venue = useManagedVenue();
  const now = useNow();
  const today = productDayKey(now);
  const [view, setView] = useState<View>("day");
  const [day, setDay] = useState(() => productDayKey(new Date()));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NewBookingDraft | null>(null);
  const [pickedFromGrid, setPickedFromGrid] = useState(false);
  const canBook = venue.archivedAt === null && venue.courts.length > 0;

  function startDraft(patch: Partial<NewBookingDraft>, fromGrid: boolean) {
    setSelectedId(null);
    setPickedFromGrid(fromGrid);
    setDraft((current) => ({
      holder: { kind: "none" },
      courtId: venue.courts[0]?.id ?? "",
      day,
      startMinute: null,
      durationMinutes: venue.durationOptionsMinutes.includes(90)
        ? 90
        : (venue.durationOptionsMinutes[0] ?? 60),
      priceInput: null,
      payment: "later",
      method: "cash",
      reference: "",
      notes: "",
      ...current,
      ...patch,
    }));
  }

  function selectBooking(bookingId: string) {
    setDraft(null);
    setSelectedId(bookingId);
  }

  const week = weekDays(day);
  const range =
    view === "week" ? { from: week[0]!, to: week[6]! } : { from: day, to: day };
  const calendar = api.bookings.listForVenue.useQuery(
    { venueId: venue.id, ...range, status: [...CALENDAR_STATUSES] },
    { placeholderData: keepPreviousData },
  );
  const step = view === "week" ? 7 : 1;

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
      ? m.weekRange(
          formatDayMonth(dayStart(range.from), locale),
          formatDayMonth(dayStart(range.to), locale),
        )
      : formatDayMonth(dayStart(day), locale, { weekday: "short" });
  const hint =
    view === "week"
      ? week.includes(today)
        ? m.thisWeek
        : undefined
      : day === today
        ? m.today
        : undefined;
  const takenLabel = view === "day" && day === today ? m.takenToday : m.taken;

  return (
    <ConsolePage className="min-h-0 gap-0 overflow-hidden p-0">
      <header className="flex items-center gap-3.5 px-7 pt-[22px]">
        <DateStepper
          label={label}
          hint={hint}
          previousLabel={view === "week" ? m.previousWeek : m.previousDay}
          nextLabel={view === "week" ? m.nextWeek : m.nextDay}
          onPrevious={() => setDay(addDays(day, -step))}
          onNext={() => setDay(addDays(day, step))}
          onToday={() => setDay(today)}
        />
        <SegmentedControl
          value={view}
          options={VIEWS.map((value) => ({ value, label: m.views[value] }))}
          onChange={setView}
          label={m.views.label}
        />
        <ScheduleLegend />
        {canBook ? (
          <Button
            type="button"
            className="rounded-control h-10 min-h-10 shrink-0 gap-2 px-4 text-sm font-semibold"
            onClick={() => startDraft({}, false)}
          >
            <Plus aria-hidden="true" className="size-4" />
            {m.newBooking}
          </Button>
        ) : null}
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
            "min-w-0 flex-1 overflow-auto ps-7 transition-opacity",
            calendar.isPlaceholderData && "opacity-60",
          )}
          aria-busy={calendar.isFetching || undefined}
        >
          {calendar.isLoading ? (
            <Skeleton className="me-7 mt-4 h-80" />
          ) : calendar.error || !data ? (
            <ErrorState
              title={m.loadError}
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
              onSelect={selectBooking}
              draft={
                draft?.day === day && draft.startMinute !== null
                  ? {
                      courtId: draft.courtId,
                      startMinute: draft.startMinute,
                      durationMinutes: draft.durationMinutes,
                    }
                  : null
              }
              onPickCell={
                canBook
                  ? (courtId, startMinute) =>
                      startDraft({ courtId, day, startMinute }, true)
                  : undefined
              }
            />
          ) : (
            <WeekCalendar
              day={day}
              today={today}
              now={now}
              data={data}
              selectedId={selectedId}
              onSelect={selectBooking}
              onOpenDay={(next) => {
                setDay(next);
                setView("day");
              }}
            />
          )}
        </div>
        {draft ? (
          <NewBookingPanel
            venue={venue}
            draft={draft}
            pickedFromGrid={pickedFromGrid}
            onChange={setDraft}
            onClose={() => setDraft(null)}
            onCreated={(bookingId) => {
              setDraft(null);
              setDay(draft.day);
              setSelectedId(bookingId);
            }}
          />
        ) : selected ? (
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

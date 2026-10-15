"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { use } from "react";

import { ErrorState } from "~/components/common/error-state";
import { BookingSheet } from "~/components/manage/booking-sheet";
import { BookingsList } from "~/components/manage/bookings-list";
import { addDays, dayStart, weekDays } from "~/components/manage/booking-model";
import type { VenueBookings } from "~/components/manage/booking-types";
import { DayCalendar } from "~/components/manage/day-calendar";
import { WeekCalendar } from "~/components/manage/week-calendar";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { api } from "~/trpc/react";
import { formatDayMonth } from "@repo/domain/format-game-start";
import { productDayKey } from "@repo/domain/product-timezone";

const CALENDAR_STATUSES = ["confirmed", "pending_payment", "no_show"] as const;

export default function ManageBookingsPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const { venueId } = use(params);
  const today = React.useMemo(() => productDayKey(new Date()), []);
  const [view, setView] = React.useState("day");
  const [day, setDay] = React.useState(today);
  const [selected, setSelected] = React.useState<string | null>(null);

  const range =
    view === "week"
      ? { from: weekDays(day)[0]!, to: weekDays(day)[6]! }
      : { from: day, to: day };
  const calendar = api.bookings.listForVenue.useQuery(
    { venueId, ...range, status: [...CALENDAR_STATUSES] },
    { enabled: view !== "list" },
  );
  const step = view === "week" ? 7 : 1;

  return (
    <div className="space-y-4">
      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="day">Day</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>

        {view !== "list" ? (
          <div className="flex flex-wrap items-center gap-2 py-3">
            <Button
              variant="outline"
              size="icon"
              aria-label={view === "week" ? "Previous week" : "Previous day"}
              onClick={() => setDay(addDays(day, -step))}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={view === "week" ? "Next week" : "Next day"}
              onClick={() => setDay(addDays(day, step))}
            >
              <ChevronRight />
            </Button>
            <Button variant="outline" onClick={() => setDay(today)}>
              Today
            </Button>
            <h2 className="text-title font-semibold">
              {view === "week"
                ? `${formatDayMonth(dayStart(range.from))} – ${formatDayMonth(dayStart(range.to), { year: true })}`
                : formatDayMonth(dayStart(day), {
                    weekday: "long",
                    year: true,
                  })}
            </h2>
          </div>
        ) : null}

        <TabsContent value="day">
          <CalendarBody query={calendar}>
            {(data) => (
              <DayCalendar day={day} data={data} onSelect={setSelected} />
            )}
          </CalendarBody>
        </TabsContent>
        <TabsContent value="week">
          <CalendarBody query={calendar}>
            {(data) => (
              <WeekCalendar
                day={day}
                today={today}
                data={data}
                onSelect={setSelected}
                onOpenDay={(next) => {
                  setDay(next);
                  setView("day");
                }}
              />
            )}
          </CalendarBody>
        </TabsContent>
        <TabsContent value="list">
          <BookingsList
            venueId={venueId}
            today={today}
            onSelect={setSelected}
          />
        </TabsContent>
      </Tabs>

      <BookingSheet
        venueId={venueId}
        bookingId={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function CalendarBody({
  query,
  children,
}: {
  query: {
    isLoading: boolean;
    error: { message: string } | null;
    data: VenueBookings | undefined;
    refetch: () => unknown;
  };
  children: (data: VenueBookings) => React.ReactNode;
}) {
  if (query.isLoading) {
    return <Skeleton className="h-80 w-full" />;
  }
  if (query.error || !query.data) {
    return (
      <ErrorState
        title="Bookings could not be loaded"
        message={query.error?.message}
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }
  return <>{children(query.data)}</>;
}

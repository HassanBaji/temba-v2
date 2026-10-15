"use client";

import { CalendarDays, CircleCheck } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { use } from "react";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { ListRow, RowList } from "~/components/common/row-list";
import { Section } from "~/components/layout/section";
import { bookingTimeLabel } from "~/components/manage/booking-block";
import { addDays } from "~/components/manage/booking-model";
import {
  holderName,
  type VenueBooking,
} from "~/components/manage/booking-types";
import { PaymentBadge } from "~/components/manage/payment-badge";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";
import { formatDayMonth } from "@repo/domain/format-game-start";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";
import { productDayKey } from "@repo/domain/product-timezone";

const OUTSTANDING_DAYS = 31;

export default function ManageOverviewPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const { venueId } = use(params);
  const today = React.useMemo(() => productDayKey(new Date()), []);

  const todays = api.bookings.listForVenue.useQuery({
    venueId,
    from: today,
    to: today,
    status: ["confirmed", "pending_payment", "no_show"],
  });
  const outstanding = api.bookings.listForVenue.useQuery({
    venueId,
    from: addDays(today, 1 - OUTSTANDING_DAYS),
    to: today,
    status: ["confirmed", "no_show"],
    paymentStatus: ["pending"],
  });

  return (
    <div className="space-y-8">
      <Section title="Today" description="Bookings on every Court today.">
        {todays.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : todays.error || !todays.data ? (
          <ErrorState
            title="Today's Bookings could not be loaded"
            message={todays.error?.message}
            onRetry={() => {
              void todays.refetch();
            }}
          />
        ) : todays.data.bookings.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No Bookings today"
            description="Bookings made for today will appear here."
          />
        ) : (
          <div className="space-y-4">
            {todays.data.grid.courts.map((court) => {
              const rows = todays.data.bookings.filter(
                (booking) => booking.courtId === court.id,
              );
              return rows.length === 0 ? null : (
                <div key={court.id} className="space-y-2">
                  <h3 className="text-body font-semibold">{court.name}</h3>
                  <BookingRows venueId={venueId} bookings={rows} />
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section
        title="Outstanding payments"
        description={`Confirmed and no-show Bookings from the last ${OUTSTANDING_DAYS} days that have not been paid.`}
      >
        {outstanding.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : outstanding.error || !outstanding.data ? (
          <ErrorState
            title="Outstanding payments could not be loaded"
            message={outstanding.error?.message}
            onRetry={() => {
              void outstanding.refetch();
            }}
          />
        ) : outstanding.data.bookings.length === 0 ? (
          <EmptyState
            icon={CircleCheck}
            title="Nothing outstanding"
            description="Every recent Booking has been settled."
          />
        ) : (
          <>
            <p className="text-body font-semibold">
              {formatBookingPriceFils(
                outstanding.data.bookings.reduce(
                  (total, booking) => total + booking.priceFils,
                  0,
                ),
              )}{" "}
              across {outstanding.data.bookings.length} Booking
              {outstanding.data.bookings.length === 1 ? "" : "s"}
            </p>
            <BookingRows
              venueId={venueId}
              bookings={outstanding.data.bookings}
              showDay
            />
          </>
        )}
      </Section>
    </div>
  );
}

function BookingRows({
  venueId,
  bookings,
  showDay = false,
}: {
  venueId: string;
  bookings: VenueBooking[];
  showDay?: boolean;
}) {
  return (
    <RowList>
      {bookings.map((booking) => (
        <ListRow
          key={booking.id}
          asChild
          title={holderName(booking.holder)}
          subtitle={`${showDay ? `${formatDayMonth(booking.startsAt, { weekday: "short" })} · ` : ""}${bookingTimeLabel(booking)}${showDay ? ` · ${booking.courtName}` : ""}`}
          trailing={
            <span className="flex items-center gap-2">
              <span className="text-body">
                {formatBookingPriceFils(booking.priceFils)}
              </span>
              {booking.status === "pending_payment" ? (
                <span className="text-eyebrow font-semibold">
                  Awaiting payment
                </span>
              ) : (
                <PaymentBadge status={booking.paymentStatus} />
              )}
            </span>
          }
        >
          <Link href={`/dashboard/manage/${venueId}/bookings/${booking.id}`} />
        </ListRow>
      ))}
    </RowList>
  );
}

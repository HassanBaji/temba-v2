"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { Badge } from "~/components/ui/badge";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api } from "~/trpc/react";
import { formatDayMonth } from "@repo/domain/format-game-start";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";

import { bookingTimeLabel } from "./booking-list-model";
import { addDays, clampRange } from "./booking-list-model";
import { holderName } from "./booking-types";
import { PaymentBadge } from "./payment-badge";

const MAX_DAYS = 31;

const STATUS_OPTIONS = [
  { value: "confirmed", label: "Confirmed" },
  { value: "pending_payment", label: "Awaiting payment" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No-show" },
  { value: "expired", label: "Expired" },
] as const;

const PAYMENT_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "partially_refunded", label: "Partially refunded" },
  { value: "refunded", label: "Refunded" },
  { value: "waived", label: "Waived" },
] as const;

const SOURCE_OPTIONS = [
  { value: "app", label: "Booked in the app" },
  { value: "venue", label: "Made by the Venue" },
] as const;

const selectClass =
  "border-input text-body h-10 rounded-md border bg-transparent px-3";

export function BookingsList({
  venueId,
  today,
  onSelect,
}: {
  venueId: string;
  today: string;
  onSelect: (bookingId: string) => void;
}) {
  const [from, setFrom] = React.useState(today);
  const [to, setTo] = React.useState(addDays(today, 13));
  const [courtId, setCourtId] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [paymentStatus, setPaymentStatus] = React.useState("");
  const [source, setSource] = React.useState("");

  const venue = api.venues.managedById.useQuery({ venueId });
  const validRange = from !== "" && to !== "" && to >= from;
  const effectiveTo = validRange ? clampRange(from, to, MAX_DAYS) : to;
  const list = api.bookings.listForVenue.useQuery(
    {
      venueId,
      from,
      to: effectiveTo,
      courtId: courtId || undefined,
      status: status
        ? [status as (typeof STATUS_OPTIONS)[number]["value"]]
        : undefined,
      paymentStatus: paymentStatus
        ? [paymentStatus as (typeof PAYMENT_OPTIONS)[number]["value"]]
        : undefined,
      source: source ? [source as "app" | "venue"] : undefined,
    },
    { enabled: validRange },
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Field>
          <FieldLabel htmlFor="list-from">From</FieldLabel>
          <Input
            id="list-from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="list-to">To</FieldLabel>
          <Input
            id="list-to"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="list-court">Court</FieldLabel>
          <select
            id="list-court"
            className={selectClass}
            value={courtId}
            onChange={(event) => setCourtId(event.target.value)}
          >
            <option value="">All Courts</option>
            {(venue.data?.courts ?? []).map((court) => (
              <option key={court.id} value={court.id}>
                {court.name}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="list-status">Status</FieldLabel>
          <select
            id="list-status"
            className={selectClass}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Any except expired</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="list-payment">Payment</FieldLabel>
          <select
            id="list-payment"
            className={selectClass}
            value={paymentStatus}
            onChange={(event) => setPaymentStatus(event.target.value)}
          >
            <option value="">Any payment</option>
            {PAYMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="list-source">Source</FieldLabel>
          <select
            id="list-source"
            className={selectClass}
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            <option value="">Any source</option>
            {SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {validRange && effectiveTo !== to ? (
        <p className="text-body text-muted-foreground">
          Showing the first {MAX_DAYS} days of this range.
        </p>
      ) : null}
      {!validRange ? (
        <p role="alert" className="text-body text-muted-foreground">
          Choose a start day and an end day on or after it.
        </p>
      ) : list.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : list.error ? (
        <ErrorState
          title="Bookings could not be loaded"
          message={list.error.message}
          onRetry={() => {
            void list.refetch();
          }}
        />
      ) : list.data?.bookings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No Bookings match"
          description="Change the dates or filters to see more."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Court</TableHead>
              <TableHead>Holder</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data?.bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>
                  <button
                    type="button"
                    className="text-left underline-offset-4 hover:underline"
                    onClick={() => onSelect(booking.id)}
                  >
                    {formatDayMonth(booking.startsAt, { weekday: "short" })}
                    {" · "}
                    {bookingTimeLabel(booking)}
                  </button>
                </TableCell>
                <TableCell>{booking.courtName}</TableCell>
                <TableCell>
                  {holderName(booking.holder)}
                  {booking.source === "venue" ? (
                    <span className="text-muted-foreground"> · Venue</span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" size="sm">
                    {booking.status === "pending_payment"
                      ? "Awaiting payment"
                      : booking.statusLabel}
                  </Badge>
                </TableCell>
                <TableCell>
                  <PaymentBadge status={booking.paymentStatus} />
                </TableCell>
                <TableCell className="text-right">
                  {formatBookingPriceFils(booking.priceFils)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

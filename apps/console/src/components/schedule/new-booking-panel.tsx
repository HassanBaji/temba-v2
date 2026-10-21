"use client";

import { X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { FilterSelect } from "~/components/bookings/filter-select";
import { MANUAL_METHODS } from "~/components/bookings/payment-mutations";
import type { ManagedVenue } from "~/components/console/managed-venue-context";
import { SegmentedControl } from "~/components/console/segmented-control";
import { mutationErrorMessage } from "~/components/courts/mutation-error";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";
import { managerDurationOptions } from "@repo/domain/booking-slots";
import { formatDayMonth } from "@repo/domain/format-game-start";
import {
  filsToMajorInput,
  formatBookingPriceFils,
  parseOptionalPricePerPlayerFils,
} from "@repo/domain/price-per-player";

import { dayStart, formatAxisClock } from "./booking-model";
import { HolderPicker } from "./holder-picker";
import {
  draftToInput,
  quotedPriceFils,
  startOptions,
  type ManualMethod,
  type NewBookingDraft,
  type PaymentChoice,
} from "./new-booking-model";

const PAYMENT_CHOICES = [
  { value: "later", label: "Pay later" },
  { value: "paid", label: "Paid now" },
  { value: "waived", label: "Waived" },
] as const satisfies readonly { value: PaymentChoice; label: string }[];

const fieldClass = "rounded-control h-10 min-h-10 text-[13px] shadow-none";

export function NewBookingPanel({
  venue,
  draft,
  pickedFromGrid,
  onChange,
  onClose,
  onCreated,
}: {
  venue: ManagedVenue;
  draft: NewBookingDraft;
  pickedFromGrid: boolean;
  onChange: (draft: NewBookingDraft) => void;
  onClose: () => void;
  onCreated: (bookingId: string) => void;
}) {
  const utils = api.useUtils();
  const [problem, setProblem] = useState<string | null>(null);
  const create = api.bookings.createForVenue.useMutation({
    onSuccess: async (booking) => {
      await utils.bookings.listForVenue.invalidate();
      toast.success("Booking added");
      onCreated(booking.id);
    },
    onError: (error) => setProblem(mutationErrorMessage(error)),
  });

  const update = (patch: Partial<NewBookingDraft>) => {
    setProblem(null);
    onChange({ ...draft, ...patch });
  };

  const court = venue.courts.find((entry) => entry.id === draft.courtId);
  const starts = startOptions({
    day: draft.day,
    openingHours: venue.openingHours,
    slotMinutes: venue.slotMinutes,
  });
  if (draft.startMinute !== null && !starts.includes(draft.startMinute)) {
    starts.unshift(draft.startMinute);
    starts.sort((a, b) => a - b);
  }
  const durations = managerDurationOptions(venue.slotMinutes).map(
    (minutes) => ({ value: String(minutes), label: `${minutes} min` }),
  );

  const quote = quotedPriceFils(venue.pricingRules, draft);
  const typed =
    draft.priceInput === null
      ? null
      : parseOptionalPricePerPlayerFils(draft.priceInput);
  const shownFils =
    typed?.ok && typed.fils !== null ? typed.fils : typed ? null : quote;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (create.isPending) {
      return;
    }
    const result = draftToInput(venue.id, draft, quote);
    if (!result.ok) {
      setProblem(result.message);
      return;
    }
    create.mutate(result.input);
  }

  return (
    <aside
      aria-label="New booking"
      className="border-rule bg-paper flex w-[var(--console-panel-width)] shrink-0 flex-col overflow-y-auto border-l"
    >
      <form onSubmit={submit} className="flex min-h-full flex-col">
        <div className="flex items-center justify-between gap-3 px-[22px] pt-5">
          <h2 className="font-expanded text-[20px]">New booking</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:bg-wash hover:text-ink rounded-block flex size-8 shrink-0 items-center justify-center transition-colors"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        <p className="text-muted-foreground px-[22px] pt-1 text-[13px]">
          {pickedFromGrid && court
            ? `${court.name}, picked from the grid. Change anything below.`
            : "For a Temba player or someone new."}
        </p>

        <div className="flex flex-col gap-4 px-[22px] pt-5">
          <Group label="Customer">
            <HolderPicker
              venueId={venue.id}
              holder={draft.holder}
              onChange={(holder) => update({ holder })}
            />
          </Group>

          <div className="grid grid-cols-2 gap-2.5">
            <Group label="Court" htmlFor="new-booking-court">
              <FilterSelect
                id="new-booking-court"
                value={draft.courtId}
                onChange={(courtId) => update({ courtId })}
                options={venue.courts.map((entry) => ({
                  value: entry.id,
                  label: entry.name,
                }))}
                className="w-full"
              />
            </Group>
            <Group label="Day" htmlFor="new-booking-day">
              <Input
                id="new-booking-day"
                type="date"
                required
                value={draft.day}
                className={fieldClass}
                onChange={(event) => {
                  if (event.target.value) {
                    update({ day: event.target.value });
                  }
                }}
              />
            </Group>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Group label="Start" htmlFor="new-booking-start">
              {starts.length > 0 ? (
                <FilterSelect
                  id="new-booking-start"
                  value={
                    draft.startMinute === null ? "" : String(draft.startMinute)
                  }
                  onChange={(value) =>
                    update({ startMinute: value === "" ? null : Number(value) })
                  }
                  options={[
                    ...(draft.startMinute === null
                      ? [{ value: "", label: "Pick a time" }]
                      : []),
                    ...starts.map((minute) => ({
                      value: String(minute),
                      label: formatAxisClock(minute, "meridiem"),
                    })),
                  ]}
                  className="w-full"
                />
              ) : (
                <p className="text-muted-foreground flex h-10 items-center text-[13px]">
                  Closed this day
                </p>
              )}
            </Group>
            <Group label="Duration" htmlFor="new-booking-duration">
              <FilterSelect
                id="new-booking-duration"
                value={String(draft.durationMinutes)}
                onChange={(value) => update({ durationMinutes: Number(value) })}
                options={durations}
                className="w-full"
              />
            </Group>
          </div>

          <Group label="Price (BD)" htmlFor="new-booking-price">
            <Input
              id="new-booking-price"
              inputMode="decimal"
              value={draft.priceInput ?? filsToMajorInput(quote)}
              placeholder={
                quote === null ? "No rate covers this time" : undefined
              }
              className={fieldClass}
              onChange={(event) => update({ priceInput: event.target.value })}
            />
            {draft.priceInput !== null && quote !== null ? (
              <button
                type="button"
                onClick={() => update({ priceInput: null })}
                className="text-muted-foreground hover:text-ink self-start text-xs underline-offset-2 hover:underline"
              >
                Use the rate, {formatBookingPriceFils(quote)}
              </button>
            ) : null}
          </Group>

          <Group label="Payment">
            <SegmentedControl
              value={draft.payment}
              options={PAYMENT_CHOICES}
              onChange={(payment) => update({ payment })}
              label="Payment"
              className="[&>button]:flex-1"
            />
            {draft.payment === "paid" ? (
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <FilterSelect
                  label="Method"
                  value={draft.method}
                  onChange={(method) =>
                    update({ method: method as ManualMethod })
                  }
                  options={MANUAL_METHODS}
                  className="w-full"
                />
                <Input
                  aria-label="Reference, optional"
                  placeholder="Reference, optional"
                  value={draft.reference}
                  maxLength={255}
                  className={fieldClass}
                  onChange={(event) =>
                    update({ reference: event.target.value })
                  }
                />
              </div>
            ) : null}
          </Group>

          <Group label="Notes, optional" htmlFor="new-booking-notes">
            <textarea
              id="new-booking-notes"
              rows={2}
              maxLength={1000}
              value={draft.notes}
              onChange={(event) => update({ notes: event.target.value })}
              className="border-border rounded-control focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-none border bg-transparent px-3 py-2 text-[13px] outline-none focus-visible:ring-[3px]"
            />
          </Group>
        </div>

        <div className="border-rule mt-auto flex flex-col gap-2.5 border-t px-[22px] py-[18px]">
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="text-muted-foreground">
              {formatDayMonth(dayStart(draft.day), { weekday: "short" })},{" "}
              {draft.durationMinutes} min
            </span>
            <span className="font-semibold tabular-nums">
              {shownFils === null
                ? "No price"
                : formatBookingPriceFils(shownFils)}
            </span>
          </div>
          {problem ? (
            <p role="alert" className="text-destructive text-xs">
              {problem}
            </p>
          ) : null}
          <Button
            type="submit"
            className="rounded-control h-10 min-h-10 w-full text-sm font-semibold"
            pending={create.isPending}
            pendingLabel="Booking…"
          >
            {court ? `Book ${court.name}` : "Book"}
          </Button>
        </div>
      </form>
    </aside>
  );
}

function Group({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  const heading = (
    <span className="text-muted-foreground text-xs">{label}</span>
  );
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {htmlFor ? <label htmlFor={htmlFor}>{heading}</label> : heading}
      {children}
    </div>
  );
}

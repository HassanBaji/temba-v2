"use client";

import * as React from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { useManagedVenue } from "~/components/console/managed-venue-context";
import { mutationErrorMessage } from "~/components/courts/mutation-error";
import { formatAxisClock } from "~/components/schedule/booking-model";
import {
  quotedPriceFils,
  startOptions,
} from "~/components/schedule/new-booking-model";
import { Button } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { managerDurationOptions } from "@repo/domain/booking-slots";
import {
  formatDayMonth,
  formatGameClock,
} from "@repo/domain/format-game-start";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";

import {
  editDraftFrom,
  editToInput,
  priceLocked,
  shownPriceInput,
  type EditDraft,
} from "./booking-edit-model";
import { FilterSelect } from "./filter-select";
import { holderName, type BookingView } from "./booking-types";

export type BookingAction = "edit" | "cancel" | "noShow";

const controlClass = "h-10 min-h-10 shadow-none";

function useBookingRefresh(bookingId: string) {
  const utils = api.useUtils();
  return async () => {
    await Promise.all([
      utils.bookings.byId.invalidate({ bookingId }),
      utils.bookings.listForVenue.invalidate(),
    ]);
  };
}

/** The manager's Edit, Cancel and No-show dialogs for one Booking, opened by `action`. */
export function BookingActionDialogs({
  booking,
  action,
  onActionChange,
  restoreFocusRef,
}: {
  booking: BookingView;
  action: BookingAction | null;
  onActionChange: (action: BookingAction | null) => void;
  restoreFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const refresh = useBookingRefresh(booking.id);
  const noShow = api.bookings.markNoShow.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success("Marked no-show");
    },
  });

  return (
    <>
      {action === "edit" ? (
        <EditBookingDialog
          booking={booking}
          onClose={() => onActionChange(null)}
          restoreFocusRef={restoreFocusRef}
        />
      ) : null}
      {action === "cancel" ? (
        <CancelBookingDialog
          booking={booking}
          onClose={() => onActionChange(null)}
          restoreFocusRef={restoreFocusRef}
        />
      ) : null}
      <ConfirmDialog
        open={action === "noShow"}
        onOpenChange={(next) => onActionChange(next ? "noShow" : null)}
        title="Mark as no-show?"
        description={`${holderName(booking.manager!.holder)} did not turn up. There is no refund and the payment stays as it is. This cannot be undone.`}
        confirmLabel="Mark no-show"
        pending={noShow.isPending}
        restoreFocusRef={restoreFocusRef}
        onConfirm={async () => {
          await noShow.mutateAsync({ bookingId: booking.id });
        }}
      />
    </>
  );
}

function EditBookingDialog({
  booking,
  onClose,
  restoreFocusRef,
}: {
  booking: BookingView;
  onClose: () => void;
  restoreFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const venue = useManagedVenue();
  const editable = {
    courtId: booking.court.id,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    priceFils: booking.priceFils,
    paymentStatus: booking.paymentStatus,
    managerNotes: booking.manager?.managerNotes ?? null,
  };
  const [draft, setDraft] = React.useState<EditDraft>(() =>
    editDraftFrom(editable),
  );
  const [problem, setProblem] = React.useState<string | null>(null);
  const refresh = useBookingRefresh(booking.id);
  const update = api.bookings.update.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success("Booking updated");
      onClose();
    },
    onError: (error) => setProblem(mutationErrorMessage(error)),
  });

  const change = (patch: Partial<EditDraft>) => {
    setProblem(null);
    setDraft((current) => ({ ...current, ...patch }));
  };

  const starts = startOptions({
    day: draft.day,
    openingHours: venue.openingHours,
    slotMinutes: venue.slotMinutes,
  });
  if (!starts.includes(draft.startMinute)) {
    starts.push(draft.startMinute);
    starts.sort((a, b) => a - b);
  }
  const quote = quotedPriceFils(venue.pricingRules, draft);
  const locked = priceLocked(editable);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (update.isPending) {
      return;
    }
    const result = editToInput(booking.id, editable, draft, quote);
    if (!result.ok) {
      setProblem(result.message);
      return;
    }
    if (!result.input) {
      onClose();
      return;
    }
    update.mutate(result.input);
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(next) => {
        if (!next && !update.isPending) {
          onClose();
        }
      }}
    >
      <ResponsiveDialogContent
        restoreFocusRef={restoreFocusRef}
        showCloseButton={false}
      >
        <form onSubmit={submit} className="flex flex-col gap-[18px]">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Edit booking</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {holderName(booking.manager!.holder)}. A move is priced from the
              rates unless you type a price.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="edit-booking-court">Court</FieldLabel>
              <FilterSelect
                id="edit-booking-court"
                value={draft.courtId}
                onChange={(courtId) => change({ courtId })}
                options={venue.courts.map((court) => ({
                  value: court.id,
                  label: court.name,
                }))}
                className="w-full"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-booking-day">Day</FieldLabel>
              <Input
                id="edit-booking-day"
                type="date"
                required
                value={draft.day}
                className={controlClass}
                onChange={(event) => {
                  if (event.target.value) {
                    change({ day: event.target.value });
                  }
                }}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-booking-start">Start</FieldLabel>
              <FilterSelect
                id="edit-booking-start"
                value={String(draft.startMinute)}
                onChange={(value) => change({ startMinute: Number(value) })}
                options={starts.map((minute) => ({
                  value: String(minute),
                  label: formatAxisClock(minute, "meridiem"),
                }))}
                className="w-full"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-booking-duration">Duration</FieldLabel>
              <FilterSelect
                id="edit-booking-duration"
                value={String(draft.durationMinutes)}
                onChange={(value) => change({ durationMinutes: Number(value) })}
                options={managerDurationOptions(venue.slotMinutes).map(
                  (minutes) => ({
                    value: String(minutes),
                    label: `${minutes} min`,
                  }),
                )}
                className="w-full"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-booking-price">Price (BD)</FieldLabel>
              <Input
                id="edit-booking-price"
                inputMode="decimal"
                disabled={locked}
                value={shownPriceInput(editable, draft, quote)}
                className={controlClass}
                onChange={(event) => change({ priceInput: event.target.value })}
              />
              {locked ? (
                <p className="text-muted-foreground text-xs">
                  The payment is settled, so the price stays.
                </p>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-booking-notes">
                Notes, optional
              </FieldLabel>
              <Input
                id="edit-booking-notes"
                value={draft.notes}
                maxLength={1000}
                className={controlClass}
                onChange={(event) => change({ notes: event.target.value })}
              />
            </Field>
          </div>

          {problem ? (
            <p role="alert" className="text-destructive text-[13px]">
              {problem}
            </p>
          ) : null}

          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="outline"
              className={controlClass}
              disabled={update.isPending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={controlClass}
              pending={update.isPending}
              pendingLabel="Saving…"
            >
              Save
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function refundLine(fils: number, cancelledBy: "venue" | "customer") {
  if (cancelledBy === "venue") {
    return fils > 0
      ? `Full refund, ${formatBookingPriceFils(fils)}`
      : "Nothing was paid, so nothing is refunded";
  }
  return fils > 0
    ? `Policy applies: ${formatBookingPriceFils(fils)} refunded`
    : "Policy applies: no refund";
}

function CancelBookingDialog({
  booking,
  onClose,
  restoreFocusRef,
}: {
  booking: BookingView;
  onClose: () => void;
  restoreFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const manager = booking.manager!;
  const [cancelledBy, setCancelledBy] = React.useState<"venue" | "customer">(
    "venue",
  );
  const [reason, setReason] = React.useState("");
  const [problem, setProblem] = React.useState<string | null>(null);
  const refresh = useBookingRefresh(booking.id);
  const cancel = api.bookings.cancelForVenue.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success("Booking cancelled");
      onClose();
    },
    onError: (error) => setProblem(mutationErrorMessage(error)),
  });

  const refundFils = manager.refundIfCancelled[cancelledBy];
  const paidByHand = manager.payments.some(
    (payment) =>
      payment.provider === "manual" &&
      (payment.status === "paid" || payment.status === "partially_refunded"),
  );
  const context = [
    `${holderName(manager.holder)}, ${booking.court.name}, ${formatDayMonth(booking.startsAt, { weekday: "short" })} ${formatGameClock(booking.startsAt)}.`,
    booking.game ? "The Game on this Booking is cancelled too." : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <ResponsiveDialog
      open
      onOpenChange={(next) => {
        if (!next && !cancel.isPending) {
          onClose();
        }
      }}
    >
      <ResponsiveDialogContent
        restoreFocusRef={restoreFocusRef}
        showCloseButton={false}
      >
        <form
          className="flex flex-col gap-[18px]"
          onSubmit={(event) => {
            event.preventDefault();
            if (cancel.isPending) {
              return;
            }
            cancel.mutate({
              bookingId: booking.id,
              cancelledBy,
              reason: reason.trim() || undefined,
            });
          }}
        >
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Cancel this booking?</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>{context}</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div
            role="radiogroup"
            aria-label="Who is cancelling"
            className="flex flex-col gap-2"
          >
            {(["venue", "customer"] as const).map((option) => {
              const selected = option === cancelledBy;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setCancelledBy(option)}
                  className={cn(
                    "rounded-control flex items-center gap-3 border px-3.5 py-3 text-left text-[13px] transition-colors",
                    selected ? "border-ink" : "border-border hover:bg-wash",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="border-ink flex size-4 shrink-0 items-center justify-center rounded-full border"
                  >
                    {selected ? (
                      <span className="bg-ink size-2 rounded-full" />
                    ) : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">
                      {option === "venue" ? "Venue cancels" : "Customer asked"}
                    </span>
                    <span className="text-muted-foreground block">
                      {refundLine(manager.refundIfCancelled[option], option)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {refundFils > 0 && paidByHand ? (
            <p className="text-muted-foreground text-[13px]">
              The payment was taken at the Venue. Pay it back, then record the
              refund on the Booking.
            </p>
          ) : null}

          <Field>
            <FieldLabel htmlFor="cancel-booking-reason">
              Note to customer, optional
            </FieldLabel>
            <Input
              id="cancel-booking-reason"
              value={reason}
              maxLength={500}
              className={controlClass}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>

          {problem ? (
            <p role="alert" className="text-destructive text-[13px]">
              {problem}
            </p>
          ) : null}

          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="outline"
              className={controlClass}
              disabled={cancel.isPending}
              onClick={onClose}
            >
              Keep booking
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className={controlClass}
              pending={cancel.isPending}
              pendingLabel="Cancelling…"
            >
              {refundFils > 0 ? "Cancel and refund" : "Cancel booking"}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

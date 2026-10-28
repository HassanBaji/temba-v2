"use client";

import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { ActionMenuItem } from "~/components/common/action-menu";
import { ConfirmDialog } from "~/components/common/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { bookingPath } from "~/lib/console-paths";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";

import {
  BookingActionDialogs,
  type BookingAction,
} from "./booking-action-dialogs";
import { settleActions } from "./booking-ledger-model";
import type { VenueBooking } from "./booking-types";
import { MarkPaidDialog, RefundDialog } from "./payment-dialogs";
import { usePaymentMutations } from "./payment-mutations";

type Dialog = "paid" | "waive" | "refund" | BookingAction | null;

/**
 * The list row carries no ledger, so the menu reads the Booking when it opens
 * and offers only what the ledger allows, the same rules as the Booking page.
 * Clicks are stopped here because the dialogs render in a portal and still
 * bubble to the clickable row through the React tree.
 */
export function BookingRowMenu({
  venueId,
  booking,
}: {
  venueId: string;
  booking: VenueBooking;
}) {
  const [open, setOpen] = React.useState(false);
  const [dialog, setDialog] = React.useState<Dialog>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const mayAct =
    booking.status === "confirmed" ||
    booking.status === "pending_payment" ||
    booking.status === "no_show" ||
    booking.paymentStatus === "paid" ||
    booking.paymentStatus === "partially_refunded";
  const view = api.bookings.byId.useQuery(
    { bookingId: booking.id },
    { enabled: (open || dialog !== null) && mayAct },
  );
  const { settle } = usePaymentMutations(booking.id, { toastErrors: false });

  const manager = view.data?.manager ?? null;
  const actions = manager
    ? settleActions(booking.status, manager.payments)
    : { pay: false, waive: false, fail: false };
  const refundable = manager?.refundableFils ?? 0;
  const allowed = manager?.actions ?? {
    edit: false,
    cancel: false,
    noShow: false,
  };

  return (
    <span className="contents" onClick={(event) => event.stopPropagation()}>
      <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            ref={triggerRef}
            type="button"
            aria-label="Actions for this Booking"
            className={cn(
              "rounded-block text-muted-foreground hover:bg-wash focus-visible:ring-ring/50 flex size-8 items-center justify-center outline-none transition-colors focus-visible:ring-[3px]",
              open && "bg-ink text-paper hover:bg-ink",
            )}
          >
            <MoreHorizontal aria-hidden="true" className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[60] min-w-48">
          <ActionMenuItem asChild>
            <Link href={bookingPath(venueId, booking.id)}>Open booking</Link>
          </ActionMenuItem>
          {mayAct && view.isLoading ? (
            <ActionMenuItem disabled>Loading…</ActionMenuItem>
          ) : null}
          {actions.pay ? (
            <ActionMenuItem onSelect={() => setDialog("paid")}>
              Mark as paid
            </ActionMenuItem>
          ) : null}
          {actions.waive ? (
            <ActionMenuItem onSelect={() => setDialog("waive")}>
              Waive
            </ActionMenuItem>
          ) : null}
          {refundable > 0 ? (
            <ActionMenuItem onSelect={() => setDialog("refund")}>
              Record refund
            </ActionMenuItem>
          ) : null}
          {allowed.edit ? (
            <ActionMenuItem onSelect={() => setDialog("edit")}>
              Edit
            </ActionMenuItem>
          ) : null}
          {allowed.noShow ? (
            <ActionMenuItem onSelect={() => setDialog("noShow")}>
              Mark no-show
            </ActionMenuItem>
          ) : null}
          {allowed.cancel ? (
            <ActionMenuItem onSelect={() => setDialog("cancel")}>
              Cancel booking
            </ActionMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <MarkPaidDialog
        open={dialog === "paid"}
        onOpenChange={(next) => setDialog(next ? "paid" : null)}
        bookingId={booking.id}
        priceFils={booking.priceFils}
        restoreFocusRef={triggerRef}
      />
      <ConfirmDialog
        open={dialog === "waive"}
        onOpenChange={(next) => setDialog(next ? "waive" : null)}
        title="Waive this payment?"
        description="The Booking stays, nothing is owed on it."
        confirmLabel="Waive"
        variant="default"
        pending={settle.isPending}
        restoreFocusRef={triggerRef}
        onConfirm={async () => {
          await settle.mutateAsync({
            bookingId: booking.id,
            outcome: "waived",
          });
        }}
      />
      <RefundDialog
        open={dialog === "refund"}
        onOpenChange={(next) => setDialog(next ? "refund" : null)}
        bookingId={booking.id}
        refundableFils={refundable}
        restoreFocusRef={triggerRef}
      />
      {view.data ? (
        <BookingActionDialogs
          booking={view.data}
          action={
            dialog === "edit" || dialog === "cancel" || dialog === "noShow"
              ? dialog
              : null
          }
          onActionChange={setDialog}
          restoreFocusRef={triggerRef}
        />
      ) : null}
    </span>
  );
}

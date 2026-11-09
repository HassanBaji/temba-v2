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
import { useMessages } from "~/components/locale-provider";

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
  const m = useMessages().consoleBookings;
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
            aria-label={m.rowMenu.label}
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
            <Link href={bookingPath(venueId, booking.id)}>
              {m.rowMenu.open}
            </Link>
          </ActionMenuItem>
          {mayAct && view.isLoading ? (
            <ActionMenuItem disabled>{m.rowMenu.loading}</ActionMenuItem>
          ) : null}
          {actions.pay ? (
            <ActionMenuItem onSelect={() => setDialog("paid")}>
              {m.actions.markPaid}
            </ActionMenuItem>
          ) : null}
          {actions.waive ? (
            <ActionMenuItem onSelect={() => setDialog("waive")}>
              {m.actions.waive}
            </ActionMenuItem>
          ) : null}
          {refundable > 0 ? (
            <ActionMenuItem onSelect={() => setDialog("refund")}>
              {m.actions.recordRefund}
            </ActionMenuItem>
          ) : null}
          {allowed.edit ? (
            <ActionMenuItem onSelect={() => setDialog("edit")}>
              {m.actions.edit}
            </ActionMenuItem>
          ) : null}
          {allowed.noShow ? (
            <ActionMenuItem onSelect={() => setDialog("noShow")}>
              {m.actions.noShow}
            </ActionMenuItem>
          ) : null}
          {allowed.cancel ? (
            <ActionMenuItem onSelect={() => setDialog("cancel")}>
              {m.actions.cancel}
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
        title={m.rowMenu.waiveTitle}
        description={m.rowMenu.waiveDescription}
        confirmLabel={m.actions.waive}
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

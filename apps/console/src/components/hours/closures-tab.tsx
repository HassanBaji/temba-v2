"use client";

import { MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import {
  ConsoleCard,
  ConsoleCardHeader,
} from "~/components/console/console-card";
import { useManagedVenue } from "~/components/console/managed-venue-context";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Hatch } from "~/components/ui/hatch";
import { Input } from "~/components/ui/input";
import { bookingPath } from "~/lib/console-paths";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { zonedDateTimeToInstant } from "@repo/domain/product-timezone";

import { controlClass, linkButtonClass, outlineButtonClass } from "./classes";
import {
  closureStatus,
  closureTitle,
  describeClosureWindow,
} from "./closures-model";
import { toastMutationError } from "./mutation-error";
import { NativeSelect } from "./native-select";
import { productDateTimeInputToInstant } from "./opening-hours-model";

const FORM_ID = "new-closure-form";

export function ClosuresCard() {
  const venue = useManagedVenue();
  const utils = api.useUtils();
  const [courtId, setCourtId] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [startsAt, setStartsAt] = React.useState("");
  const [endsAt, setEndsAt] = React.useState("");
  const [conflicts, setConflicts] = React.useState<string[] | null>(null);
  const [removeId, setRemoveId] = React.useState<string | null>(null);
  const now = new Date();

  const addClosure = api.venues.addClosure.useMutation({
    onSuccess: async (created) => {
      toast.success("Closure added");
      setReason("");
      setStartsAt("");
      setEndsAt("");
      setConflicts(
        created.affectedBookingIds.length > 0
          ? created.affectedBookingIds
          : null,
      );
      await utils.venues.managedById.invalidate({ venueId: venue.id });
    },
    onError: toastMutationError,
  });

  const removeClosure = api.venues.removeClosure.useMutation({
    onSuccess: async () => {
      toast.success("Closure removed");
      await utils.venues.managedById.invalidate({ venueId: venue.id });
    },
  });

  const closures = [...venue.closures].sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
  );
  const removing = closures.find((closure) => closure.id === removeId);

  function scopeLabel(closureCourtId: string | null) {
    return closureCourtId
      ? (venue.courts.find((court) => court.id === closureCourtId)?.name ??
          "Court")
      : "All courts";
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (addClosure.isPending) {
      return;
    }
    const start = productDateTimeInputToInstant(
      startsAt,
      zonedDateTimeToInstant,
    );
    const end = productDateTimeInputToInstant(endsAt, zonedDateTimeToInstant);
    if (!start || !end) {
      toast.error("Choose when the Closure starts and ends");
      return;
    }
    addClosure.mutate({
      venueId: venue.id,
      courtId: courtId || null,
      startsAt: start,
      endsAt: end,
      reason,
    });
  }

  return (
    <ConsoleCard className="flex flex-col overflow-hidden">
      <ConsoleCardHeader
        title="Closures"
        action={
          <Button
            type="submit"
            form={FORM_ID}
            variant="outline"
            className={cn(
              outlineButtonClass,
              "rounded-block h-[34px] min-h-[34px] gap-1.5 px-3",
            )}
            pending={addClosure.isPending}
            pendingLabel="Adding…"
          >
            <Plus aria-hidden="true" className="size-[13px]" />
            Add closure
          </Button>
        }
      />

      {closures.length === 0 ? (
        <p className="border-border text-muted-foreground text-meta border-b px-5 py-4">
          No Closures in the next 90 days.
        </p>
      ) : (
        <ul className="divide-border divide-y">
          {closures.map((closure) => {
            const title = closureTitle(
              scopeLabel(closure.courtId),
              closure.reason,
            );
            const status = closureStatus(closure.startsAt, now);
            return (
              <li
                key={closure.id}
                className="text-meta flex items-center gap-3.5 px-5 py-3.5"
              >
                <Hatch className="rounded-block size-[38px] shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{title}</span>
                  <span className="text-muted-foreground block">
                    {describeClosureWindow(
                      closure.startsAt,
                      closure.endsAt,
                      now,
                    )}
                  </span>
                </span>
                {status === "active" ? (
                  <span className="bg-ink text-paper rounded-xs px-2 py-[3px] text-[11px]">
                    Active
                  </span>
                ) : (
                  <span className="border-border text-muted-foreground rounded-xs border px-[7px] py-0.5 text-[11px]">
                    Scheduled
                  </span>
                )}
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${title} actions`}
                      className="text-muted-foreground hover:bg-wash hover:text-ink rounded-block -mr-2"
                    >
                      <MoreHorizontal aria-hidden="true" className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="rounded-block border-border min-w-40 shadow-none"
                  >
                    <DropdownMenuItem
                      variant="destructive"
                      className="text-meta cursor-pointer"
                      onSelect={() => setRemoveId(closure.id)}
                    >
                      Remove closure
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}

      {conflicts ? (
        <div
          role="alert"
          className="border-border flex flex-col gap-2 border-t px-5 py-4"
        >
          <p className="text-meta font-semibold">
            {conflicts.length} Booking{conflicts.length === 1 ? "" : "s"} fall
            inside this Closure
          </p>
          <p className="text-muted-foreground text-eyebrow">
            They stay confirmed until you cancel them from the Bookings page.
          </p>
          <ul className="text-meta flex flex-col gap-1">
            {conflicts.map((id) => (
              <li key={id}>
                <Link
                  href={bookingPath(venue.id, id)}
                  className="underline underline-offset-2"
                >
                  Booking {id.slice(0, 8)}
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className={cn(linkButtonClass, "self-start")}
            onClick={() => setConflicts(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <form
        id={FORM_ID}
        onSubmit={onSubmit}
        className="border-border flex flex-col gap-2.5 border-t px-5 py-[18px]"
      >
        <p className="text-muted-foreground text-eyebrow">New closure</p>
        <div className="grid grid-cols-2 gap-2">
          <NativeSelect
            aria-label="Closure applies to"
            className="h-[38px]"
            value={courtId}
            onChange={(event) => setCourtId(event.target.value)}
          >
            <option value="">All courts</option>
            {venue.courts.map((court) => (
              <option key={court.id} value={court.id}>
                {court.name}
              </option>
            ))}
          </NativeSelect>
          <Input
            aria-label="Reason"
            placeholder="Reason"
            className={cn(controlClass, "h-[38px] min-h-[38px]")}
            value={reason}
            maxLength={255}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            aria-label="From"
            type="datetime-local"
            required
            className={cn(controlClass, "h-[38px] min-h-[38px]")}
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
          <Input
            aria-label="To"
            type="datetime-local"
            required
            min={startsAt || undefined}
            className={cn(controlClass, "h-[38px] min-h-[38px]")}
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
          />
        </div>
        <p className="text-muted-foreground text-eyebrow leading-normal">
          Times are in Bahrain time. Existing bookings inside the window are
          listed once the closure is added; they stay confirmed until you cancel
          them from the Bookings page.
        </p>
      </form>

      <ConfirmDialog
        open={removing !== undefined}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveId(null);
          }
        }}
        title="Remove this closure?"
        description={
          removing
            ? `${closureTitle(scopeLabel(removing.courtId), removing.reason)}, ${describeClosureWindow(removing.startsAt, removing.endsAt, now)}. The time becomes bookable again.`
            : undefined
        }
        confirmLabel="Remove closure"
        pending={removeClosure.isPending}
        onConfirm={async () => {
          if (removing) {
            await removeClosure.mutateAsync({ closureId: removing.id });
          }
        }}
      />
    </ConsoleCard>
  );
}

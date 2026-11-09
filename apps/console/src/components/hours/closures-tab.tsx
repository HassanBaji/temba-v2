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
import { useLocale, useMessages } from "~/components/locale-provider";
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
  const { consoleHours, consoleCourts } = useMessages();
  const m = consoleHours.closures;
  const locale = useLocale();
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
      toast.success(m.addedToast);
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
      toast.success(m.removedToast);
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
          consoleCourts.court)
      : consoleCourts.allCourts;
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
      toast.error(m.chooseTimes);
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
        title={m.title}
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
            pendingLabel={m.adding}
          >
            <Plus aria-hidden="true" className="size-[13px]" />
            {m.add}
          </Button>
        }
      />

      {closures.length === 0 ? (
        <p className="border-border text-muted-foreground text-meta border-b px-5 py-4">
          {m.none}
        </p>
      ) : (
        <ul className="divide-border divide-y">
          {closures.map((closure) => {
            const title = closureTitle(
              scopeLabel(closure.courtId),
              closure.reason,
              locale,
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
                      locale,
                    )}
                  </span>
                </span>
                {status === "active" ? (
                  <span className="bg-ink text-paper rounded-xs px-2 py-[3px] text-[11px]">
                    {m.active}
                  </span>
                ) : (
                  <span className="border-border text-muted-foreground rounded-xs border px-[7px] py-0.5 text-[11px]">
                    {m.scheduled}
                  </span>
                )}
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={m.actions(title)}
                      className="text-muted-foreground hover:bg-wash hover:text-ink rounded-block -me-2"
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
                      {m.remove}
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
            {m.conflicts(conflicts.length)}
          </p>
          <p className="text-muted-foreground text-eyebrow">
            {m.conflictsHelp}
          </p>
          <ul className="text-meta flex flex-col gap-1">
            {conflicts.map((id) => (
              <li key={id}>
                <Link
                  href={bookingPath(venue.id, id)}
                  className="underline underline-offset-2"
                >
                  {m.bookingRef(id.slice(0, 8))}
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className={cn(linkButtonClass, "self-start")}
            onClick={() => setConflicts(null)}
          >
            {m.dismiss}
          </button>
        </div>
      ) : null}

      <form
        id={FORM_ID}
        onSubmit={onSubmit}
        className="border-border flex flex-col gap-2.5 border-t px-5 py-[18px]"
      >
        <p className="text-muted-foreground text-eyebrow">{m.newClosure}</p>
        <div className="grid grid-cols-2 gap-2">
          <NativeSelect
            aria-label={m.appliesTo}
            className="h-[38px]"
            value={courtId}
            onChange={(event) => setCourtId(event.target.value)}
          >
            <option value="">{consoleCourts.allCourts}</option>
            {venue.courts.map((court) => (
              <option key={court.id} value={court.id}>
                {court.name}
              </option>
            ))}
          </NativeSelect>
          <Input
            aria-label={m.reason}
            placeholder={m.reason}
            className={cn(controlClass, "h-[38px] min-h-[38px]")}
            value={reason}
            maxLength={255}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            aria-label={m.from}
            type="datetime-local"
            required
            className={cn(controlClass, "h-[38px] min-h-[38px]")}
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
          <Input
            aria-label={m.to}
            type="datetime-local"
            required
            min={startsAt || undefined}
            className={cn(controlClass, "h-[38px] min-h-[38px]")}
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
          />
        </div>
        <p className="text-muted-foreground text-eyebrow leading-normal">
          {m.timezoneNote}
        </p>
      </form>

      <ConfirmDialog
        open={removing !== undefined}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveId(null);
          }
        }}
        title={m.removeTitle}
        description={
          removing
            ? m.removeDescription(
                closureTitle(
                  scopeLabel(removing.courtId),
                  removing.reason,
                  locale,
                ),
                describeClosureWindow(
                  removing.startsAt,
                  removing.endsAt,
                  now,
                  locale,
                ),
              )
            : undefined
        }
        confirmLabel={m.remove}
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

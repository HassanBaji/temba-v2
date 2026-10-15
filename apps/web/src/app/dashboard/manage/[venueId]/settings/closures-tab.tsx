"use client";

import * as React from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { RowList } from "~/components/common/row-list";
import { Section } from "~/components/layout/section";
import { Button } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { api } from "~/trpc/react";
import { formatGameStart } from "@repo/domain/format-game-start";
import { zonedDateTimeToInstant } from "@repo/domain/product-timezone";

import { NativeSelect } from "./native-select";
import { productDateTimeInputToInstant } from "./opening-hours-model";

export function ClosuresTab({ venueId }: { venueId: string }) {
  const utils = api.useUtils();
  const venue = api.venues.managedById.useQuery({ venueId });
  const [courtId, setCourtId] = React.useState("");
  const [startsAt, setStartsAt] = React.useState("");
  const [endsAt, setEndsAt] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [conflicts, setConflicts] = React.useState<string[] | null>(null);
  const [removeId, setRemoveId] = React.useState<string | null>(null);

  const addClosure = api.venues.addClosure.useMutation({
    onSuccess: async (created) => {
      toast.success("Closure added");
      setStartsAt("");
      setEndsAt("");
      setReason("");
      setConflicts(
        created.affectedBookingIds.length > 0 ? created.affectedBookingIds : null,
      );
      await utils.venues.managedById.invalidate({ venueId });
    },
    onError: (error) => toastGlobalFormError(error),
  });

  const removeClosure = api.venues.removeClosure.useMutation({
    onSuccess: async () => {
      toast.success("Closure removed");
      await utils.venues.managedById.invalidate({ venueId });
    },
  });

  const courts = venue.data?.courts ?? [];
  const closures = [...(venue.data?.closures ?? [])].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (addClosure.isPending) {
      return;
    }
    const start = productDateTimeInputToInstant(startsAt, zonedDateTimeToInstant);
    const end = productDateTimeInputToInstant(endsAt, zonedDateTimeToInstant);
    if (!start || !end) {
      toast.error("Choose when the Closure starts and ends");
      return;
    }
    addClosure.mutate({
      venueId,
      courtId: courtId || null,
      startsAt: start,
      endsAt: end,
      reason,
    });
  }

  return (
    <>
      <Section
        title="Closures"
        description="Block the whole Venue or a single Court for a period, such as maintenance or a private event. Times are in Bahrain time."
      >
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="closure-scope">Applies to</FieldLabel>
              <NativeSelect
                id="closure-scope"
                value={courtId}
                onChange={(event) => setCourtId(event.target.value)}
              >
                <option value="">Whole Venue</option>
                {courts.map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="closure-reason">Reason</FieldLabel>
              <Input
                id="closure-reason"
                value={reason}
                maxLength={255}
                onChange={(event) => setReason(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="closure-starts">Starts</FieldLabel>
              <Input
                id="closure-starts"
                type="datetime-local"
                required
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="closure-ends">Ends</FieldLabel>
              <Input
                id="closure-ends"
                type="datetime-local"
                required
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
              />
            </Field>
          </div>
          <Button type="submit" disabled={addClosure.isPending || !venue.data}>
            {addClosure.isPending ? "Adding…" : "Add Closure"}
          </Button>
        </form>

        {conflicts ? (
          <div role="alert" className="border-border space-y-2 rounded-md border p-4">
            <p className="text-body font-semibold">
              {conflicts.length} Booking{conflicts.length === 1 ? "" : "s"} fall
              inside this Closure
            </p>
            <p className="text-body text-muted-foreground">
              They stay confirmed until you cancel them from the Bookings page.
            </p>
            <ul className="text-body list-disc pl-5">
              {conflicts.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
            <Button type="button" variant="outline" onClick={() => setConflicts(null)}>
              Dismiss
            </Button>
          </div>
        ) : null}

        {closures.length === 0 ? (
          <p className="text-body text-muted-foreground">
            No upcoming Closures in the next 90 days.
          </p>
        ) : (
          <RowList>
            {closures.map((closure) => {
              const court = courts.find((item) => item.id === closure.courtId);
              return (
                <li
                  key={closure.id}
                  className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-body font-semibold">
                      {court ? court.name : "Whole Venue"}
                    </p>
                    <p className="text-body text-muted-foreground">
                      {formatGameStart(closure.startsAt)} to{" "}
                      {formatGameStart(closure.endsAt)}
                      {closure.reason ? ` · ${closure.reason}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={removeClosure.isPending}
                    aria-label={`Remove Closure starting ${formatGameStart(closure.startsAt)}`}
                    onClick={() => setRemoveId(closure.id)}
                  >
                    Remove
                  </Button>
                </li>
              );
            })}
          </RowList>
        )}
      </Section>

      <ConfirmDialog
        open={removeId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveId(null);
          }
        }}
        title="Remove this Closure?"
        description="The time becomes bookable again."
        confirmLabel="Remove Closure"
        pending={removeClosure.isPending}
        onConfirm={async () => {
          if (!removeId) {
            return;
          }
          await removeClosure.mutateAsync({ closureId: removeId });
        }}
      />
    </>
  );
}

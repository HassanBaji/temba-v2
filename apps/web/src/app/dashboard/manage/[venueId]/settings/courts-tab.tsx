"use client";

import * as React from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { RowList } from "~/components/common/row-list";
import { Section } from "~/components/layout/section";
import { Button } from "~/components/ui/button";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Input } from "~/components/ui/input";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";
import { api } from "~/trpc/react";
import { courtRenameIsDirty } from "@repo/domain/court-rename";

export function CourtsTab({ venueId }: { venueId: string }) {
  const utils = api.useUtils();
  const venue = api.venues.managedById.useQuery({ venueId });
  const [newCourtName, setNewCourtName] = React.useState("");
  const [courtNames, setCourtNames] = React.useState<Record<string, string>>(
    {},
  );
  const [deleteCourtId, setDeleteCourtId] = React.useState<string | null>(null);
  const summaryRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!venue.data) {
      return;
    }
    setCourtNames((current) => {
      const next: Record<string, string> = {};
      for (const court of venue.data.courts) {
        next[court.id] = current[court.id] ?? court.name;
      }
      return next;
    });
  }, [venue.data]);

  const refresh = async () => {
    await utils.venues.managedById.invalidate({ venueId });
  };

  const addCourt = api.venues.addCourt.useMutation({
    onSuccess: async () => {
      toast.success("Court added");
      setNewCourtName("");
      await refresh();
    },
    onError: (error) => {
      toastGlobalFormError(error);
      focusFormFailure(error, { name: "new-court-name" }, summaryRef.current);
    },
  });

  const renameCourt = api.venues.renameCourt.useMutation({
    onSuccess: async () => {
      toast.success("Court renamed");
      await refresh();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const deleteCourt = api.venues.deleteCourt.useMutation({
    onSuccess: async () => {
      toast.success("Court deleted");
      await refresh();
    },
  });

  function onAddCourt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (addCourt.isPending) {
      return;
    }
    addCourt.mutate({ venueId, name: newCourtName });
  }

  const courts = venue.data?.courts ?? [];
  const deleteCourtName =
    courts.find((court) => court.id === deleteCourtId)?.name ?? "Court";

  return (
    <>
      <Section
        title="Courts"
        description="Each Court on this Venue needs its own name."
      >
        <form onSubmit={onAddCourt} className="space-y-3">
          <FormErrorSummary
            ref={summaryRef}
            message={globalFormErrorMessage(addCourt.error)}
          />
          <Field>
            <FieldLabel htmlFor="new-court-name">Court name</FieldLabel>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <Input
                id="new-court-name"
                className="min-w-48 flex-1"
                value={newCourtName}
                onChange={(event) => setNewCourtName(event.target.value)}
                required
                maxLength={255}
                aria-invalid={
                  fieldErrorMessage(addCourt.error, "name") ? true : undefined
                }
                aria-describedby={
                  fieldErrorMessage(addCourt.error, "name")
                    ? "new-court-name-error"
                    : undefined
                }
              />
              <Button type="submit" disabled={addCourt.isPending}>
                {addCourt.isPending ? "Adding…" : "Add Court"}
              </Button>
            </div>
            <FieldError id="new-court-name-error">
              {fieldErrorMessage(addCourt.error, "name")}
            </FieldError>
          </Field>
        </form>

        {courts.length === 0 ? (
          <p className="text-body text-muted-foreground">
            No Courts yet. Add one to start taking Bookings.
          </p>
        ) : (
          <RowList>
            {courts.map((court) => {
              const draft = courtNames[court.id] ?? court.name;
              const renaming =
                renameCourt.isPending && renameCourt.variables?.id === court.id;
              const renameError =
                renameCourt.error && renameCourt.variables?.id === court.id
                  ? fieldErrorMessage(renameCourt.error, "name")
                  : undefined;
              return (
                <li
                  key={court.id}
                  className="flex min-h-16 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-end"
                >
                  <Field className="min-w-0 flex-1">
                    <FieldLabel htmlFor={`court-name-${court.id}`}>
                      Court name
                    </FieldLabel>
                    <Input
                      id={`court-name-${court.id}`}
                      value={draft}
                      onChange={(event) =>
                        setCourtNames((current) => ({
                          ...current,
                          [court.id]: event.target.value,
                        }))
                      }
                      maxLength={255}
                      required
                      aria-invalid={renameError ? true : undefined}
                      aria-describedby={
                        renameError ? `court-name-${court.id}-error` : undefined
                      }
                    />
                    <FieldError id={`court-name-${court.id}-error`}>
                      {renameError}
                    </FieldError>
                  </Field>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      aria-label={`Rename ${court.name}`}
                      disabled={
                        !courtRenameIsDirty(draft, court.name) ||
                        renameCourt.isPending
                      }
                      pending={renaming}
                      pendingLabel="Renaming…"
                      onClick={() =>
                        renameCourt.mutate({ id: court.id, name: draft })
                      }
                    >
                      Rename
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      aria-label={`Delete ${court.name}`}
                      disabled={deleteCourt.isPending}
                      onClick={() => setDeleteCourtId(court.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              );
            })}
          </RowList>
        )}
      </Section>

      <ConfirmDialog
        open={deleteCourtId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteCourtId(null);
          }
        }}
        title={`Delete ${deleteCourtName}?`}
        description="This cannot be undone."
        confirmLabel="Delete Court"
        pending={deleteCourt.isPending}
        onConfirm={async () => {
          if (!deleteCourtId) {
            return;
          }
          await deleteCourt.mutateAsync({ id: deleteCourtId });
        }}
      />
    </>
  );
}

"use client";

import { MoreHorizontal } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { useManagedVenue } from "~/components/console/managed-venue-context";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Hatch } from "~/components/ui/hatch";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { courtRenameIsDirty } from "@repo/domain/court-rename";
import { COURT_SPORT_LABELS } from "@repo/domain/court-sport-copy";
import { SPORTS, type Sport } from "@repo/domain/sport";

import {
  controlClass,
  dialogClass,
  inkButtonClass,
  outlineButtonClass,
} from "./classes";
import {
  closedUntilLabel,
  courtAvailability,
  type CourtAvailability,
} from "./court-status-model";
import { CourtSportBadge } from "./court-sport-badge";
import { mutationErrorMessage } from "./mutation-error";
import { NativeSelect } from "./native-select";

function AvailabilityBadge({
  availability,
  now,
}: {
  availability: CourtAvailability;
  now: Date;
}) {
  if (availability.kind === "closed") {
    return (
      <span className="bg-ink text-paper rounded-xs px-2 py-[3px] text-[11px]">
        {closedUntilLabel(availability.until, now)}
      </span>
    );
  }
  return (
    <span className="border-border text-muted-foreground rounded-xs border px-[7px] py-0.5 text-[11px]">
      {availability.kind === "bookable" ? "Bookable" : "Not bookable"}
    </span>
  );
}

function CourtNameDialog({
  open,
  onOpenChange,
  title,
  description,
  initialName,
  withSport,
  confirmLabel,
  pending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  initialName: string;
  withSport?: boolean;
  confirmLabel: string;
  pending: boolean;
  error: string | null;
  onSubmit: (name: string, sport: Sport) => void;
}) {
  const [name, setName] = React.useState(initialName);
  const [sport, setSport] = React.useState<Sport>("padel");

  React.useEffect(() => {
    if (open) {
      setName(initialName);
      setSport("padel");
    }
  }, [open, initialName]);

  const dirty =
    initialName === ""
      ? name.trim().length > 0
      : courtRenameIsDirty(name, initialName);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (pending ? null : onOpenChange(next))}
    >
      <DialogContent className={cn(dialogClass, "sm:max-w-sm")}>
        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            if (!pending && dirty) {
              onSubmit(name.trim(), sport);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="court-name" className="text-meta">
              Court name
            </Label>
            <Input
              id="court-name"
              className={controlClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={255}
              required
              autoFocus
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "court-name-error" : undefined}
            />
            {error ? (
              <p
                id="court-name-error"
                role="alert"
                className="text-destructive text-meta"
              >
                {error}
              </p>
            ) : null}
          </div>
          {withSport ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="court-sport" className="text-meta">
                Sport
              </Label>
              <NativeSelect
                id="court-sport"
                value={sport}
                onChange={(event) => setSport(event.target.value as Sport)}
              >
                {SPORTS.map((value) => (
                  <option key={value} value={value}>
                    {COURT_SPORT_LABELS[value]}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className={outlineButtonClass}
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={inkButtonClass}
              disabled={!dirty}
              pending={pending}
              pendingLabel={`${confirmLabel}…`}
            >
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddCourtDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const venue = useManagedVenue();
  const utils = api.useUtils();
  const addCourt = api.venues.addCourt.useMutation({
    onSuccess: async () => {
      toast.success("Court added");
      onOpenChange(false);
      await utils.venues.managedById.invalidate({ venueId: venue.id });
    },
  });

  return (
    <CourtNameDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          addCourt.reset();
        }
        onOpenChange(next);
      }}
      title="Add court"
      description="Players see this name when they pick a Court."
      initialName=""
      withSport
      confirmLabel="Add court"
      pending={addCourt.isPending}
      error={addCourt.error ? mutationErrorMessage(addCourt.error) : null}
      onSubmit={(name, sport) =>
        addCourt.mutate({ venueId: venue.id, name, sport })
      }
    />
  );
}

function CourtMenu({
  courtName,
  onRename,
  onDelete,
}: {
  courtName: string;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`${courtName} actions`}
          className="text-muted-foreground hover:bg-wash hover:text-ink rounded-block"
        >
          <MoreHorizontal aria-hidden="true" className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="rounded-block border-border min-w-40 shadow-none"
      >
        <DropdownMenuItem
          className="text-meta cursor-pointer"
          onSelect={onRename}
        >
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          className="text-meta cursor-pointer"
          onSelect={onDelete}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CourtCards() {
  const venue = useManagedVenue();
  const utils = api.useUtils();
  const [renameId, setRenameId] = React.useState<string | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const now = new Date();

  const refresh = () =>
    utils.venues.managedById.invalidate({ venueId: venue.id });

  const renameCourt = api.venues.renameCourt.useMutation({
    onSuccess: async () => {
      toast.success("Court renamed");
      setRenameId(null);
      await refresh();
    },
  });

  const setCourtSport = api.venues.setCourtSport.useMutation({
    onSuccess: async () => {
      toast.success("Sport updated");
      await refresh();
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const deleteCourt = api.venues.deleteCourt.useMutation({
    onSuccess: async () => {
      toast.success("Court deleted");
      await refresh();
    },
  });

  const renaming = venue.courts.find((court) => court.id === renameId);
  const deleting = venue.courts.find((court) => court.id === deleteId);

  if (venue.courts.length === 0) {
    return (
      <div className="border-border rounded-card flex flex-col items-center gap-2 border px-6 py-10 text-center">
        <Hatch className="rounded-control block h-[84px] w-full max-w-[220px]" />
        <p className="mt-2 text-base font-semibold">No Courts yet</p>
        <p className="text-muted-foreground text-meta">
          Add a Court to start taking Bookings.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-4 gap-3.5">
        {venue.courts.map((court) => {
          const availability = courtAvailability({
            courtId: court.id,
            closures: venue.closures,
            acceptingBookings: venue.acceptingBookings,
            now,
          });
          return (
            <li
              key={court.id}
              className={cn(
                "rounded-card flex flex-col gap-3 border p-[18px]",
                availability.kind === "closed" ? "border-ink" : "border-border",
              )}
            >
              <Hatch className="rounded-control block h-[84px] w-full" />
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-base font-semibold">
                  {court.name}
                </span>
                <CourtSportBadge sport={court.sport} />
                <AvailabilityBadge availability={availability} now={now} />
                <CourtMenu
                  courtName={court.name}
                  onRename={() => {
                    renameCourt.reset();
                    setRenameId(court.id);
                  }}
                  onDelete={() => setDeleteId(court.id)}
                />
              </div>
              <NativeSelect
                aria-label={`${court.name} sport`}
                value={court.sport}
                disabled={setCourtSport.isPending}
                onChange={(event) =>
                  setCourtSport.mutate({
                    id: court.id,
                    sport: event.target.value as Sport,
                  })
                }
              >
                {SPORTS.map((value) => (
                  <option key={value} value={value}>
                    {COURT_SPORT_LABELS[value]}
                  </option>
                ))}
              </NativeSelect>
            </li>
          );
        })}
      </ul>

      <CourtNameDialog
        open={renaming !== undefined}
        onOpenChange={(open) => {
          if (!open) {
            setRenameId(null);
          }
        }}
        title={`Rename ${renaming?.name ?? "Court"}`}
        description="The new name shows on every upcoming Booking."
        initialName={renaming?.name ?? ""}
        confirmLabel="Rename"
        pending={renameCourt.isPending}
        error={
          renameCourt.error ? mutationErrorMessage(renameCourt.error) : null
        }
        onSubmit={(name) => {
          if (renaming) {
            renameCourt.mutate({ id: renaming.id, name });
          }
        }}
      />

      <ConfirmDialog
        open={deleting !== undefined}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteId(null);
          }
        }}
        title={`Delete ${deleting?.name ?? "Court"}?`}
        description="A Court with Bookings cannot be deleted. This cannot be undone."
        confirmLabel="Delete court"
        pending={deleteCourt.isPending}
        onConfirm={async () => {
          if (deleting) {
            await deleteCourt.mutateAsync({ id: deleting.id });
          }
        }}
      />
    </>
  );
}

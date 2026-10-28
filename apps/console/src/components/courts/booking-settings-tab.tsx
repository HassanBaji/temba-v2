"use client";

import * as React from "react";
import { toast } from "sonner";

import { useManagedVenue } from "~/components/console/managed-venue-context";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";

import { describeHorizon, describeLeadTime } from "./booking-rules-model";
import {
  controlClass,
  dialogClass,
  inkButtonClass,
  linkButtonClass,
  outlineButtonClass,
} from "./classes";
import { toastMutationError } from "./mutation-error";
import { NativeSelect } from "./native-select";

const DURATION_CHOICES = [30, 60, 90, 120, 150, 180, 210, 240];

function RuleLine({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="text-meta flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

function SettingSwitch({
  label,
  checked,
  pending,
  onChange,
}: {
  label: string;
  checked: boolean;
  pending: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-busy={pending || undefined}
      disabled={pending}
      onClick={() => onChange(!checked)}
      className={cn(
        "focus-visible:ring-ring/50 relative h-5 w-9 shrink-0 rounded-full border transition-colors focus-visible:ring-[3px] disabled:opacity-50",
        checked ? "bg-ink border-ink" : "bg-paper border-input",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-[3px] top-[3px] size-3 rounded-full transition-transform",
          checked ? "bg-paper translate-x-4" : "bg-ink",
        )}
      />
    </button>
  );
}

function BookingSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const venue = useManagedVenue();
  const utils = api.useUtils();
  const [slotMinutes, setSlotMinutes] = React.useState(venue.slotMinutes);
  const [durations, setDurations] = React.useState<number[]>(
    venue.durationOptionsMinutes,
  );
  const [horizon, setHorizon] = React.useState(
    String(venue.bookingHorizonDays),
  );
  const [lead, setLead] = React.useState(String(venue.minLeadMinutes));
  const [description, setDescription] = React.useState(venue.description ?? "");
  const [notes, setNotes] = React.useState(venue.bookingNotes ?? "");

  React.useEffect(() => {
    if (open) {
      setSlotMinutes(venue.slotMinutes);
      setDurations(venue.durationOptionsMinutes);
      setHorizon(String(venue.bookingHorizonDays));
      setLead(String(venue.minLeadMinutes));
      setDescription(venue.description ?? "");
      setNotes(venue.bookingNotes ?? "");
    }
  }, [open, venue]);

  const update = api.venues.updateBookingSettings.useMutation({
    onSuccess: async () => {
      toast.success("Booking rules saved");
      onOpenChange(false);
      await utils.venues.managedById.invalidate({ venueId: venue.id });
    },
    onError: toastMutationError,
  });

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (update.isPending) {
      return;
    }
    update.mutate({
      venueId: venue.id,
      slotMinutes,
      durationOptionsMinutes: durations,
      bookingHorizonDays: Number(horizon),
      minLeadMinutes: Number(lead),
      description,
      bookingNotes: notes,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (update.isPending ? null : onOpenChange(next))}
    >
      <DialogContent className={cn(dialogClass, "sm:max-w-md")}>
        <form className="contents" onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Booking rules</DialogTitle>
            <DialogDescription>
              What players can pick when they book. Changes apply to new
              Bookings only.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="slot-minutes" className="text-meta">
                Start steps
              </Label>
              <NativeSelect
                id="slot-minutes"
                value={slotMinutes}
                onChange={(event) => setSlotMinutes(Number(event.target.value))}
              >
                <option value={30}>Every 30 min</option>
                <option value={60}>Every 60 min</option>
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="booking-horizon" className="text-meta">
                Book ahead (days)
              </Label>
              <Input
                id="booking-horizon"
                className={controlClass}
                type="number"
                inputMode="numeric"
                min={1}
                max={90}
                required
                value={horizon}
                onChange={(event) => setHorizon(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="min-lead" className="text-meta">
                Last minute (min)
              </Label>
              <Input
                id="min-lead"
                className={controlClass}
                type="number"
                inputMode="numeric"
                min={0}
                max={1440}
                required
                value={lead}
                onChange={(event) => setLead(event.target.value)}
              />
            </div>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-meta mb-2 font-medium">Durations</legend>
            <div className="grid grid-cols-4 gap-2">
              {DURATION_CHOICES.map((minutes) => {
                const offGrid = minutes % slotMinutes !== 0;
                return (
                  <label
                    key={minutes}
                    className={cn(
                      "text-meta flex items-center gap-2",
                      offGrid && "text-muted-foreground",
                    )}
                  >
                    <Checkbox
                      checked={durations.includes(minutes)}
                      disabled={offGrid}
                      className="rounded-xs"
                      onCheckedChange={(checked) =>
                        setDurations((current) =>
                          checked === true
                            ? [...current, minutes].sort((a, b) => a - b)
                            : current.filter((value) => value !== minutes),
                        )
                      }
                    />
                    {minutes} min
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="venue-description" className="text-meta">
              Description
            </Label>
            <Input
              id="venue-description"
              className={controlClass}
              value={description}
              maxLength={1000}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="booking-notes" className="text-meta">
              Notes shown when booking
            </Label>
            <Input
              id="booking-notes"
              className={controlClass}
              value={notes}
              maxLength={1000}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className={outlineButtonClass}
              disabled={update.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={inkButtonClass}
              disabled={durations.length === 0}
              pending={update.isPending}
              pendingLabel="Saving…"
            >
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BookingRulesCard() {
  const venue = useManagedVenue();
  const utils = api.useUtils();
  const [editing, setEditing] = React.useState(false);

  const toggleAccepting = api.venues.updateBookingSettings.useMutation({
    onSuccess: async (updated) => {
      toast.success(
        updated.acceptingBookings ? "Accepting bookings" : "Bookings paused",
      );
      await utils.venues.managedById.invalidate({ venueId: venue.id });
    },
    onError: toastMutationError,
  });

  const togglePayAtVenue = api.venues.updateBookingSettings.useMutation({
    onSuccess: async (updated) => {
      toast.success(
        updated.payAtVenueAllowed
          ? "Players can pay at the venue"
          : "Players pay online when they book",
      );
      await utils.venues.managedById.invalidate({ venueId: venue.id });
    },
    onError: toastMutationError,
  });

  return (
    <section className="border-border rounded-card flex flex-col gap-3 border px-5 py-[18px]">
      <header className="flex items-center justify-between gap-4">
        <h2 className="text-body font-semibold">Booking rules</h2>
        <button
          type="button"
          className={linkButtonClass}
          onClick={() => setEditing(true)}
        >
          Edit
        </button>
      </header>
      <RuleLine label="Durations">
        <span className="flex gap-1.5">
          {venue.durationOptionsMinutes.map((minutes) => (
            <span
              key={minutes}
              className="border-ink rounded-xs border px-2 py-[3px]"
            >
              {minutes}
            </span>
          ))}
        </span>
      </RuleLine>
      <RuleLine label="Start steps">Every {venue.slotMinutes} min</RuleLine>
      <RuleLine label="Book ahead">
        {describeHorizon(venue.bookingHorizonDays)}
      </RuleLine>
      <RuleLine label="Last minute">
        {describeLeadTime(venue.minLeadMinutes)}
      </RuleLine>
      <div className="border-border text-meta flex items-center justify-between gap-4 border-t pt-3">
        <span className="font-medium">Accepting bookings</span>
        <SettingSwitch
          label="Accepting bookings"
          checked={venue.acceptingBookings}
          pending={toggleAccepting.isPending}
          onChange={(next) =>
            toggleAccepting.mutate({
              venueId: venue.id,
              acceptingBookings: next,
            })
          }
        />
      </div>
      <div className="text-meta flex items-center justify-between gap-4">
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">Pay at the venue</span>
          <span className="text-muted-foreground">
            {venue.onlinePaymentAvailable
              ? "Let players book now and pay at the desk."
              : "Online payment is not on yet, so players pay at the desk."}
          </span>
        </span>
        <SettingSwitch
          label="Pay at the venue"
          checked={venue.payAtVenueAllowed}
          pending={togglePayAtVenue.isPending}
          onChange={(next) =>
            togglePayAtVenue.mutate({
              venueId: venue.id,
              payAtVenueAllowed: next,
            })
          }
        />
      </div>
      <BookingSettingsDialog open={editing} onOpenChange={setEditing} />
    </section>
  );
}

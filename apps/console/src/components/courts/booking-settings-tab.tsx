"use client";

import * as React from "react";
import { toast } from "sonner";

import { Section } from "~/components/layout/section";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { api } from "~/trpc/react";

import { NativeSelect } from "./native-select";

const DURATION_CHOICES = [30, 60, 90, 120, 150, 180, 210, 240];

export function BookingSettingsTab({ venueId }: { venueId: string }) {
  const utils = api.useUtils();
  const venue = api.venues.managedById.useQuery({ venueId });
  const [accepting, setAccepting] = React.useState(false);
  const [slotMinutes, setSlotMinutes] = React.useState(30);
  const [durations, setDurations] = React.useState<number[]>([60, 90]);
  const [horizon, setHorizon] = React.useState("14");
  const [lead, setLead] = React.useState("60");
  const [description, setDescription] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [hydratedAt, setHydratedAt] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!venue.data || venue.dataUpdatedAt === hydratedAt) {
      return;
    }
    setAccepting(venue.data.acceptingBookings);
    setSlotMinutes(venue.data.slotMinutes);
    setDurations(venue.data.durationOptionsMinutes);
    setHorizon(String(venue.data.bookingHorizonDays));
    setLead(String(venue.data.minLeadMinutes));
    setDescription(venue.data.description ?? "");
    setNotes(venue.data.bookingNotes ?? "");
    setHydratedAt(venue.dataUpdatedAt);
  }, [venue.data, venue.dataUpdatedAt, hydratedAt]);

  const update = api.venues.updateBookingSettings.useMutation({
    onSuccess: async () => {
      toast.success("Booking settings saved");
      await utils.venues.managedById.invalidate({ venueId });
    },
    onError: (error) => toastGlobalFormError(error),
  });

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (update.isPending) {
      return;
    }
    update.mutate({
      venueId,
      acceptingBookings: accepting,
      slotMinutes,
      durationOptionsMinutes: durations,
      bookingHorizonDays: Number(horizon),
      minLeadMinutes: Number(lead),
      description,
      bookingNotes: notes,
    });
  }

  return (
    <Section
      title="Booking settings"
      description="Control whether Customers can book this Venue and how."
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="flex items-center gap-3">
          <Checkbox
            id="accepting-bookings"
            checked={accepting}
            onCheckedChange={(checked) => setAccepting(checked === true)}
          />
          <label htmlFor="accepting-bookings" className="text-body font-semibold">
            Accepting bookings
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="slot-minutes">Slot length</FieldLabel>
            <NativeSelect
              id="slot-minutes"
              value={slotMinutes}
              onChange={(event) => setSlotMinutes(Number(event.target.value))}
            >
              <option value={30}>30 minutes</option>
              <option value={60}>60 minutes</option>
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="booking-horizon">Book up to (days ahead)</FieldLabel>
            <Input
              id="booking-horizon"
              type="number"
              inputMode="numeric"
              min={1}
              max={90}
              value={horizon}
              onChange={(event) => setHorizon(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="min-lead">Earliest booking before start (minutes)</FieldLabel>
            <Input
              id="min-lead"
              type="number"
              inputMode="numeric"
              min={0}
              max={1440}
              value={lead}
              onChange={(event) => setLead(event.target.value)}
            />
          </Field>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-body font-semibold">Durations Customers can book</legend>
          <div className="flex flex-wrap gap-4">
            {DURATION_CHOICES.map((minutes) => (
              <div key={minutes} className="flex items-center gap-2">
                <Checkbox
                  id={`duration-${minutes}`}
                  checked={durations.includes(minutes)}
                  disabled={minutes % slotMinutes !== 0}
                  onCheckedChange={(checked) =>
                    setDurations((current) =>
                      checked === true
                        ? [...current, minutes].sort((a, b) => a - b)
                        : current.filter((value) => value !== minutes),
                    )
                  }
                />
                <label htmlFor={`duration-${minutes}`} className="text-body">
                  {minutes} min
                </label>
              </div>
            ))}
          </div>
        </fieldset>

        <Field>
          <FieldLabel htmlFor="venue-description">Description</FieldLabel>
          <Input
            id="venue-description"
            value={description}
            maxLength={1000}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="booking-notes">Notes shown when booking</FieldLabel>
          <Input
            id="booking-notes"
            value={notes}
            maxLength={1000}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>

        <Button type="submit" className="min-h-11" disabled={update.isPending || !venue.data}>
          {update.isPending ? "Saving…" : "Save"}
        </Button>
      </form>
    </Section>
  );
}

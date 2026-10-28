"use client";

import * as React from "react";
import { toast } from "sonner";

import { ConsoleCard } from "~/components/console/console-card";
import {
  useManagedVenue,
  type ManagedVenue,
} from "~/components/console/managed-venue-context";
import { Button } from "~/components/ui/button";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import { controlClass, labelClass, textareaClass } from "./details-styles";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
  toastGlobalFormError,
} from "./form-mutation-error";
import { VenueLogoField } from "./venue-logo-field";

const FIELD_IDS = {
  phone: "venue-phone",
  website: "venue-website",
  description: "venue-description",
  bookingNotes: "venue-booking-notes",
};

export function DetailsForm() {
  const venue = useManagedVenue();
  return <DetailsFormFields key={venue.id} venue={venue} />;
}

function DetailsFormFields({ venue }: { venue: ManagedVenue }) {
  const venueId = venue.id;
  const utils = api.useUtils();
  const [phone, setPhone] = React.useState(venue.phone ?? "");
  const [website, setWebsite] = React.useState(venue.website ?? "");
  const [description, setDescription] = React.useState(venue.description ?? "");
  const [bookingNotes, setBookingNotes] = React.useState(
    venue.bookingNotes ?? "",
  );
  const summaryRef = React.useRef<HTMLDivElement>(null);

  const refresh = async () => {
    await utils.venues.managedById.invalidate({ venueId });
  };

  const updateDetails = api.venues.updateDetails.useMutation({
    onError: (error) => {
      toastGlobalFormError(error);
      focusFormFailure(error, FIELD_IDS, summaryRef.current);
    },
  });

  const updateText = api.venues.updateBookingSettings.useMutation({
    onError: (error) => {
      toastGlobalFormError(error);
      focusFormFailure(error, FIELD_IDS, summaryRef.current);
    },
  });

  const saving = updateDetails.isPending || updateText.isPending;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) {
      return;
    }
    const results = await Promise.allSettled([
      updateDetails.mutateAsync({ venueId, phone, website }),
      updateText.mutateAsync({ venueId, description, bookingNotes }),
    ]);
    if (results.every((result) => result.status === "fulfilled")) {
      toast.success("Details saved");
    }
    await refresh();
  }

  const formError =
    globalFormErrorMessage(updateDetails.error) ??
    globalFormErrorMessage(updateText.error);

  const phoneError = fieldErrorMessage(updateDetails.error, "phone");
  const websiteError = fieldErrorMessage(updateDetails.error, "website");
  const descriptionError = fieldErrorMessage(updateText.error, "description");
  const notesError = fieldErrorMessage(updateText.error, "bookingNotes");

  return (
    <ConsoleCard className="max-w-[760px]">
      <form
        onSubmit={(event) => {
          void onSubmit(event);
        }}
        noValidate
      >
        <div className="border-border space-y-5 border-b px-6 py-5">
          <FormErrorSummary ref={summaryRef} message={formError} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={phoneError ? true : undefined}>
              <FieldLabel htmlFor={FIELD_IDS.phone} className={labelClass}>
                Phone
              </FieldLabel>
              <Input
                id={FIELD_IDS.phone}
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                maxLength={255}
                className={controlClass}
                aria-invalid={phoneError ? true : undefined}
                aria-describedby={
                  phoneError ? `${FIELD_IDS.phone}-error` : undefined
                }
              />
              <FieldError id={`${FIELD_IDS.phone}-error`}>
                {phoneError}
              </FieldError>
            </Field>
            <Field data-invalid={websiteError ? true : undefined}>
              <FieldLabel htmlFor={FIELD_IDS.website} className={labelClass}>
                Website
              </FieldLabel>
              <Input
                id={FIELD_IDS.website}
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                maxLength={255}
                className={controlClass}
                aria-invalid={websiteError ? true : undefined}
                aria-describedby={
                  websiteError ? `${FIELD_IDS.website}-error` : undefined
                }
              />
              <FieldError id={`${FIELD_IDS.website}-error`}>
                {websiteError}
              </FieldError>
            </Field>
          </div>
          <Field data-invalid={descriptionError ? true : undefined}>
            <FieldLabel htmlFor={FIELD_IDS.description} className={labelClass}>
              Description
            </FieldLabel>
            <textarea
              id={FIELD_IDS.description}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={1000}
              rows={3}
              className={textareaClass}
              aria-invalid={descriptionError ? true : undefined}
              aria-describedby={
                descriptionError ? `${FIELD_IDS.description}-error` : undefined
              }
            />
            <FieldError id={`${FIELD_IDS.description}-error`}>
              {descriptionError}
            </FieldError>
          </Field>
          <Field data-invalid={notesError ? true : undefined}>
            <FieldLabel htmlFor={FIELD_IDS.bookingNotes} className={labelClass}>
              Booking notes
            </FieldLabel>
            <textarea
              id={FIELD_IDS.bookingNotes}
              value={bookingNotes}
              onChange={(event) => setBookingNotes(event.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Shown to players when they book: parking, entrance, what to bring."
              className={textareaClass}
              aria-invalid={notesError ? true : undefined}
              aria-describedby={
                notesError ? `${FIELD_IDS.bookingNotes}-error` : undefined
              }
            />
            <FieldError id={`${FIELD_IDS.bookingNotes}-error`}>
              {notesError}
            </FieldError>
          </Field>
        </div>

        <div className="border-border space-y-4 border-b px-6 py-5">
          <VenueLogoField
            venueId={venueId}
            logoImageUrl={venue.logoImageUrl ?? null}
          />
        </div>

        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <p className="text-muted-foreground text-xs">
            Name, city and country are managed by an Operator.
          </p>
          <Button
            type="submit"
            className={cn(controlClass, "px-4")}
            pending={saving}
            pendingLabel="Saving…"
          >
            Save
          </Button>
        </div>
      </form>
    </ConsoleCard>
  );
}

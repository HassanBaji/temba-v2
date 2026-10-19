"use client";

import * as React from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
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
import { entityImageUploadInput } from "@repo/domain/entity-image-file";

import { controlClass, labelClass, textareaClass } from "./details-styles";
import { EntityImageField } from "./entity-image-field";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
  toastGlobalFormError,
} from "./form-mutation-error";

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
  const [logoError, setLogoError] = React.useState<string | null>(null);
  const [clearLogoOpen, setClearLogoOpen] = React.useState(false);
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

  const uploadLogo = api.venues.uploadLogo.useMutation({
    onSuccess: async () => {
      toast.success("Logo saved");
      setLogoError(null);
      await refresh();
    },
    onError: (error) => {
      toastGlobalFormError(error);
      setLogoError(error.message);
    },
  });

  const clearLogo = api.venues.clearLogo.useMutation({
    onSuccess: async () => {
      toast.success("Logo cleared");
      await refresh();
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

  function onLogoPicked(file: File | null) {
    if (!file) {
      return;
    }
    void entityImageUploadInput(file, "Logo")
      .then((input) => uploadLogo.mutate({ venueId, ...input }))
      .catch((error: unknown) => {
        setLogoError(
          error instanceof Error ? error.message : "Logo could not be read",
        );
      });
  }

  const formError =
    globalFormErrorMessage(updateDetails.error) ??
    globalFormErrorMessage(updateText.error);

  const phoneError = fieldErrorMessage(updateDetails.error, "phone");
  const websiteError = fieldErrorMessage(updateDetails.error, "website");
  const descriptionError = fieldErrorMessage(updateText.error, "description");
  const notesError = fieldErrorMessage(updateText.error, "bookingNotes");

  const logoImageUrl = venue.logoImageUrl ?? null;

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
          <EntityImageField
            id="venue-logo"
            label="Logo"
            noun="Logo"
            currentImageUrl={logoImageUrl}
            error={logoError}
            disabled={clearLogo.isPending}
            pending={uploadLogo.isPending}
            onFileChange={onLogoPicked}
            onError={setLogoError}
          />
          {logoImageUrl ? (
            <Button
              type="button"
              variant="outline"
              className={cn(controlClass, "hover:bg-wash px-3.5 text-[13px]")}
              disabled={clearLogo.isPending || uploadLogo.isPending}
              onClick={() => setClearLogoOpen(true)}
            >
              Clear logo
            </Button>
          ) : null}
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

      <ConfirmDialog
        open={clearLogoOpen}
        onOpenChange={setClearLogoOpen}
        title="Clear logo?"
        description="The current logo will be removed."
        confirmLabel="Clear logo"
        pending={clearLogo.isPending}
        onConfirm={async () => {
          await clearLogo.mutateAsync({ venueId });
        }}
      />
    </ConsoleCard>
  );
}

"use client";

import * as React from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { EntityImageField } from "~/components/details/entity-image-field";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Input } from "~/components/ui/input";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
  toastGlobalFormError,
} from "~/components/details/form-mutation-error";
import { api } from "~/trpc/react";
import { entityImageUploadInput } from "@repo/domain/entity-image-file";

export function DetailsTab({ venueId }: { venueId: string }) {
  const utils = api.useUtils();
  const venue = api.venues.managedById.useQuery({ venueId });
  const [phone, setPhone] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [hydratedId, setHydratedId] = React.useState<string | null>(null);
  const [logoError, setLogoError] = React.useState<string | null>(null);
  const [clearLogoOpen, setClearLogoOpen] = React.useState(false);
  const summaryRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!venue.data || hydratedId === venue.data.id) {
      return;
    }
    setPhone(venue.data.phone ?? "");
    setWebsite(venue.data.website ?? "");
    setHydratedId(venue.data.id);
  }, [venue.data, hydratedId]);

  const refresh = async () => {
    await utils.venues.managedById.invalidate({ venueId });
  };

  const updateDetails = api.venues.updateDetails.useMutation({
    onSuccess: async () => {
      toast.success("Details saved");
      await refresh();
    },
    onError: (error) => {
      toastGlobalFormError(error);
      focusFormFailure(
        error,
        { phone: "venue-phone", website: "venue-website" },
        summaryRef.current,
      );
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

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (updateDetails.isPending) {
      return;
    }
    updateDetails.mutate({ venueId, phone, website });
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

  const logoImageUrl = venue.data?.logoImageUrl ?? null;

  return (
    <>
      <Section
        title="Details"
        description="Contact details shown for this Venue. Name, city and country are managed by an Operator."
      >
        <form onSubmit={onSubmit} className="space-y-6">
          <FormErrorSummary
            ref={summaryRef}
            message={globalFormErrorMessage(updateDetails.error)}
          />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="venue-phone">Phone</FieldLabel>
              <Input
                id="venue-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                maxLength={255}
                aria-invalid={
                  fieldErrorMessage(updateDetails.error, "phone")
                    ? true
                    : undefined
                }
                aria-describedby={
                  fieldErrorMessage(updateDetails.error, "phone")
                    ? "venue-phone-error"
                    : undefined
                }
              />
              <FieldError id="venue-phone-error">
                {fieldErrorMessage(updateDetails.error, "phone")}
              </FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="venue-website">Website</FieldLabel>
              <Input
                id="venue-website"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                maxLength={255}
                aria-invalid={
                  fieldErrorMessage(updateDetails.error, "website")
                    ? true
                    : undefined
                }
                aria-describedby={
                  fieldErrorMessage(updateDetails.error, "website")
                    ? "venue-website-error"
                    : undefined
                }
              />
              <FieldError id="venue-website-error">
                {fieldErrorMessage(updateDetails.error, "website")}
              </FieldError>
            </Field>
          </FieldGroup>
          <Button
            type="submit"
            className="min-h-11"
            disabled={updateDetails.isPending || !venue.data}
          >
            {updateDetails.isPending ? "Saving…" : "Save"}
          </Button>
        </form>
      </Section>

      <Section title="Logo">
        <EntityImageField
          id="venue-logo"
          label="Upload logo"
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
            disabled={clearLogo.isPending || uploadLogo.isPending}
            onClick={() => setClearLogoOpen(true)}
          >
            Clear logo
          </Button>
        ) : null}
      </Section>

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
    </>
  );
}

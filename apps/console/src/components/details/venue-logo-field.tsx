"use client";

import * as React from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { entityImageUploadInput } from "@repo/domain/entity-image-file";

import { controlClass } from "./details-styles";
import { EntityImageField } from "./entity-image-field";
import { toastGlobalFormError } from "./form-mutation-error";

/** Uploads each valid pick at once and clears behind a confirm, on Details and Photos alike. */
export function VenueLogoField({
  venueId,
  logoImageUrl,
}: {
  venueId: string;
  logoImageUrl: string | null;
}) {
  const utils = api.useUtils();
  const [logoError, setLogoError] = React.useState<string | null>(null);
  const [clearLogoOpen, setClearLogoOpen] = React.useState(false);

  const refresh = async () => {
    await utils.venues.managedById.invalidate({ venueId });
  };

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

  return (
    <>
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

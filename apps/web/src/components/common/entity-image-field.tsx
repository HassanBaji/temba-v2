"use client";

import { Loader2Icon } from "lucide-react";
import * as React from "react";

import { EntityMonogram } from "~/components/common/entity-monogram";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  ENTITY_IMAGE_ACCEPT,
  entityImageFileError,
  type EntityImageNoun,
} from "@repo/domain/entity-image-file";

/**
 * One image or logo picker. With `file` it holds a pick until the form
 * submits (Group create); without it the parent uploads each valid pick at
 * once and passes `pending` while it does (Venue logo).
 */
export function EntityImageField({
  id,
  label,
  noun = "Image",
  file = null,
  currentImageUrl,
  error,
  disabled = false,
  pending = false,
  onFileChange,
  onError,
}: {
  id: string;
  label?: string;
  noun?: EntityImageNoun;
  file?: File | null;
  currentImageUrl?: string | null;
  error: string | null;
  disabled?: boolean;
  pending?: boolean;
  onFileChange: (file: File | null) => void;
  onError: (error: string | null) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const fieldLabel = label ?? m.webUi.entityImage.addImage;
  const previewUrl = React.useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const shownImage = previewUrl ?? currentImageUrl ?? null;

  return (
    <Field>
      <FieldLabel htmlFor={id}>{fieldLabel}</FieldLabel>
      {shownImage ? (
        <div className="flex min-w-0 items-center gap-3">
          <EntityMonogram
            name={file?.name ?? fieldLabel}
            image={shownImage}
            size="lg"
          />
          <p className="text-meta min-w-0 flex-1 truncate">
            {file
              ? file.name
              : noun === "Logo"
                ? m.webUi.entityImage.currentLogo
                : m.webUi.entityImage.currentImage}
          </p>
          {file ? (
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => {
                onError(null);
                onFileChange(null);
              }}
            >
              {m.common.clear}
            </Button>
          ) : null}
        </div>
      ) : null}
      <Input
        id={id}
        type="file"
        accept={ENTITY_IMAGE_ACCEPT}
        disabled={disabled || pending}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : `${id}-help`}
        onChange={(event) => {
          const next = event.target.files?.[0] ?? null;
          event.target.value = "";
          if (!next) {
            return;
          }
          const message = entityImageFileError(next, locale, noun);
          if (message) {
            onError(message);
            return;
          }
          onError(null);
          onFileChange(next);
        }}
      />
      <FieldDescription id={`${id}-help`}>
        {m.createGame.image.help}
      </FieldDescription>
      <p
        role="status"
        className="text-meta text-muted-foreground flex items-center gap-2 empty:hidden"
      >
        {pending ? (
          <>
            <Loader2Icon aria-hidden="true" className="size-4 animate-spin" />
            {noun === "Logo"
              ? m.webUi.entityImage.uploadingLogo
              : m.webUi.entityImage.uploadingImage}
          </>
        ) : null}
      </p>
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </Field>
  );
}

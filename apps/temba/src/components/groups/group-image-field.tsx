"use client";

import * as React from "react";

import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  GROUP_IMAGE_ACCEPT,
  groupImageFileError,
} from "~/lib/group-image-file";

export function GroupImageField({
  id,
  file,
  error,
  disabled,
  onFileChange,
  onError,
}: {
  id: string;
  file: File | null;
  error: string | null;
  disabled?: boolean;
  onFileChange: (file: File | null) => void;
  onError: (error: string | null) => void;
}) {
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

  return (
    <Field>
      <FieldLabel htmlFor={id}>Add image</FieldLabel>
      <Input
        id={id}
        type="file"
        accept={GROUP_IMAGE_ACCEPT}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : `${id}-help`}
        onChange={(event) => {
          const next = event.target.files?.[0] ?? null;
          event.target.value = "";
          if (!next) {
            return;
          }
          const message = groupImageFileError(next);
          if (message) {
            onError(message);
            return;
          }
          onError(null);
          onFileChange(next);
        }}
      />
      <FieldDescription id={`${id}-help`}>
        Optional. JPEG, PNG, or WebP, at most 2 MB.
      </FieldDescription>
      {file ? (
        <div className="flex items-center gap-3">
          {previewUrl ? (
            // Local object URL for the unsubmitted pick.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="size-10 rounded-lg object-cover"
            />
          ) : null}
          <p className="text-meta min-w-0 flex-1 truncate">{file.name}</p>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => {
              onError(null);
              onFileChange(null);
            }}
          >
            Clear
          </Button>
        </div>
      ) : null}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </Field>
  );
}

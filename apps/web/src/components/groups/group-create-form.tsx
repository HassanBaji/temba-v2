"use client";

import * as React from "react";

import { EntityImageField } from "~/components/common/entity-image-field";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { entityImageFileError } from "@repo/domain/entity-image-file";
import {
  GROUP_CREATE_COPY,
  groupCreateRequiresApproval,
  type GroupCreateContext,
  type GroupCreateType,
} from "@repo/domain/group-create";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
} from "~/lib/form-mutation-error";

export type GroupCreateValues = {
  name: string;
  type: GroupCreateType;
  requiresApproval: boolean;
  image: File | null;
};

export function GroupCreateForm({
  context,
  idPrefix,
  pending,
  error,
  secondaryAction,
  onSubmit,
}: {
  context: GroupCreateContext;
  idPrefix: string;
  pending: boolean;
  error?: { message: string; data?: { zodError?: unknown } | null } | null;
  secondaryAction?: React.ReactNode;
  onSubmit: (values: GroupCreateValues) => void;
}) {
  const copy = GROUP_CREATE_COPY[context];
  const ids = {
    name: `${idPrefix}-name`,
    type: `${idPrefix}-type`,
    approval: `${idPrefix}-requires-approval`,
    image: `${idPrefix}-image`,
  };
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<GroupCreateType>("public");
  const [requiresApproval, setRequiresApproval] = React.useState(false);
  const [image, setImage] = React.useState<File | null>(null);
  const [imageError, setImageError] = React.useState<string | null>(null);
  const nameError = fieldErrorMessage(error, "name");

  React.useEffect(() => {
    if (!error) {
      return;
    }
    focusFormFailure(error, { name: ids.name }, summaryRef.current);
  }, [error, ids.name]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (pending || !trimmed) {
      return;
    }
    if (image) {
      const pickedError = entityImageFileError(image);
      if (pickedError) {
        setImageError(pickedError);
        return;
      }
    }
    onSubmit({
      name: trimmed,
      type,
      requiresApproval: groupCreateRequiresApproval(type, requiresApproval),
      image,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormErrorSummary
        ref={summaryRef}
        message={globalFormErrorMessage(error)}
      />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={ids.name}>Name</FieldLabel>
          <Input
            id={ids.name}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={255}
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? `${ids.name}-error` : undefined}
          />
          <FieldError id={`${ids.name}-error`}>{nameError}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor={ids.type}>Type</FieldLabel>
          <Select
            value={type}
            onValueChange={(value) => {
              const next = value === "private" ? "private" : "public";
              setType(next);
              if (next === "private") {
                setRequiresApproval(false);
              }
            }}
          >
            <SelectTrigger
              id={ids.type}
              className="w-full"
              aria-describedby={`${ids.type}-help`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">{copy.publicLabel}</SelectItem>
              <SelectItem value="private">{copy.privateLabel}</SelectItem>
            </SelectContent>
          </Select>
          <FieldDescription id={`${ids.type}-help`}>
            {type === "private" ? copy.privateHelp : copy.publicHelp}
          </FieldDescription>
        </Field>

        {type === "public" ? (
          <Field>
            <div className="flex items-center gap-3">
              <Checkbox
                id={ids.approval}
                checked={requiresApproval}
                onCheckedChange={(checked) =>
                  setRequiresApproval(checked === true)
                }
              />
              <FieldLabel htmlFor={ids.approval}>Require approval</FieldLabel>
            </div>
            <FieldDescription>{copy.approvalHelp}</FieldDescription>
          </Field>
        ) : null}

        <EntityImageField
          id={ids.image}
          file={image}
          error={imageError}
          disabled={pending}
          onFileChange={setImage}
          onError={setImageError}
        />
      </FieldGroup>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" pending={pending} pendingLabel="Creating…">
          {copy.submit}
        </Button>
        {secondaryAction}
      </div>
    </form>
  );
}

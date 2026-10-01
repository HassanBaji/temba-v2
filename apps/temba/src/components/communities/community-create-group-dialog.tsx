"use client";

import * as React from "react";

import { EntityImageField } from "~/components/common/entity-image-field";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import {
  GROUP_CREATE_COPY,
  type GroupCreateType,
} from "~/components/groups/group-create-form";
import { ChoiceChip } from "~/components/temba/choice-chip";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Input } from "~/components/ui/input";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { entityImageFileError } from "~/lib/entity-image-file";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
} from "~/lib/form-mutation-error";

type CreateError = {
  message: string;
  data?: { zodError?: unknown } | null;
} | null;

const COPY = GROUP_CREATE_COPY.club;

const FIELD_IDS = {
  name: "club-group-name",
  type: "club-group-type",
  approval: "club-group-requires-approval",
  image: "club-group-image",
};

const TYPE_OPTIONS: { value: GroupCreateType; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
];

function ClubGroupForm({
  pending,
  error,
  onCreatePublic,
  onCreatePrivate,
}: {
  pending: boolean;
  error: CreateError;
  onCreatePublic: (
    name: string,
    requiresApproval: boolean,
    image: File | null,
  ) => void;
  onCreatePrivate: (name: string, image: File | null) => void;
}) {
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<GroupCreateType>("public");
  const [requiresApproval, setRequiresApproval] = React.useState(false);
  const [image, setImage] = React.useState<File | null>(null);
  const [imageError, setImageError] = React.useState<string | null>(null);
  // The page keeps a failed create's error across a close or a Type change,
  // so an error already present at open or at a Type change is stale.
  const [dismissedError, setDismissedError] = React.useState(error);
  const visibleError = error && error !== dismissedError ? error : null;
  const nameError = fieldErrorMessage(visibleError, "name");

  React.useEffect(() => {
    if (!visibleError) {
      return;
    }
    focusFormFailure(
      visibleError,
      { name: FIELD_IDS.name },
      summaryRef.current,
    );
  }, [visibleError]);

  function chooseType(next: GroupCreateType) {
    if (next === type) {
      return;
    }
    setType(next);
    setDismissedError(error);
    if (next === "private") {
      setRequiresApproval(false);
    }
  }

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
    if (type === "private") {
      onCreatePrivate(trimmed, image);
      return;
    }
    onCreatePublic(trimmed, requiresApproval, image);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormErrorSummary
        ref={summaryRef}
        message={globalFormErrorMessage(visibleError)}
      />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={FIELD_IDS.name}>Name</FieldLabel>
          <Input
            id={FIELD_IDS.name}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={255}
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? `${FIELD_IDS.name}-error` : undefined}
          />
          <FieldError id={`${FIELD_IDS.name}-error`}>{nameError}</FieldError>
        </Field>

        <Field>
          <FieldTitle id={`${FIELD_IDS.type}-label`}>Type</FieldTitle>
          <RovingRadioGroup
            id={FIELD_IDS.type}
            aria-labelledby={`${FIELD_IDS.type}-label`}
            aria-describedby={`${FIELD_IDS.type}-description`}
            className="grid grid-cols-2 gap-2"
          >
            {TYPE_OPTIONS.map((option) => (
              <ChoiceChip
                key={option.value}
                role="radio"
                selected={type === option.value}
                disabled={pending}
                onClick={() => chooseType(option.value)}
              >
                {option.label}
              </ChoiceChip>
            ))}
          </RovingRadioGroup>
          <FieldDescription id={`${FIELD_IDS.type}-description`}>
            {type === "private" ? COPY.privateHelp : COPY.publicHelp}
          </FieldDescription>
        </Field>

        {type === "public" ? (
          <Field>
            <div className="flex items-center gap-3">
              <Checkbox
                id={FIELD_IDS.approval}
                checked={requiresApproval}
                onCheckedChange={(checked) =>
                  setRequiresApproval(checked === true)
                }
              />
              <FieldLabel htmlFor={FIELD_IDS.approval}>
                Require approval
              </FieldLabel>
            </div>
            <FieldDescription>{COPY.approvalHelp}</FieldDescription>
          </Field>
        ) : null}

        <EntityImageField
          id={FIELD_IDS.image}
          file={image}
          error={imageError}
          disabled={pending}
          onFileChange={setImage}
          onError={setImageError}
        />
      </FieldGroup>

      <Button
        type="submit"
        pending={pending}
        pendingLabel="Creating…"
        className="bg-ink text-paper hover:bg-dimrule h-[46px] w-full rounded-[12px] font-semibold"
      >
        {COPY.submit}
      </Button>
    </form>
  );
}

export function CommunityCreateGroupDialog({
  open,
  onOpenChange,
  pending,
  error,
  onCreatePublic,
  onCreatePrivate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  error?: CreateError;
  onCreatePublic: (
    name: string,
    requiresApproval: boolean,
    image: File | null,
  ) => void;
  onCreatePrivate: (name: string, image: File | null) => void;
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Create Club Group</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            A padel Group inside this Community.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="px-4 pb-4 md:px-0 md:pb-0">
          <ClubGroupForm
            pending={pending}
            error={error ?? null}
            onCreatePublic={onCreatePublic}
            onCreatePrivate={onCreatePrivate}
          />
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

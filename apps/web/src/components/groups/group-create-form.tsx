"use client";

import * as React from "react";

import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import {
  ENTITY_IMAGE_ACCEPT,
  entityImageFileError,
} from "@repo/domain/entity-image-file";
import {
  groupCreateCanSubmit,
  groupCreateCopy,
  groupCreateRequiresApproval,
  groupCreateSubmitLabel,
  type GroupCreateContext,
  type GroupCreateType,
} from "@repo/domain/group-create";
import { groupJoiningToggleHelp } from "@repo/domain/group-settings";
import { DEFAULT_SPORT, SPORTS, type Sport } from "@repo/domain/sport";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
} from "~/lib/form-mutation-error";
import {
  FormBlock,
  GroupNameField,
  GroupPhotoTile,
  SportSegment,
  ToggleCard,
  VisibilityCards,
} from "./group-form-parts";

export type GroupCreateValues = {
  name: string;
  sport: Sport;
  type: GroupCreateType;
  requiresApproval: boolean;
  image: File | null;
};

/** The form of design "Group create and edit flow" 01. */
export function GroupCreateForm({
  context,
  idPrefix,
  sports = SPORTS,
  showSportPicker = true,
  pending,
  error,
  onSubmit,
}: {
  context: GroupCreateContext;
  idPrefix: string;
  sports?: readonly Sport[];
  showSportPicker?: boolean;
  pending: boolean;
  error?: { message: string; data?: { zodError?: unknown } | null } | null;
  onSubmit: (values: GroupCreateValues) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = groupCreateCopy(context, locale);
  const screen = m.group.create.screen;
  const joining = m.group.settings.joining;
  const ids = {
    name: `${idPrefix}-name`,
    sport: `${idPrefix}-sport`,
    visibility: `${idPrefix}-visibility`,
    approval: `${idPrefix}-requires-approval`,
    image: `${idPrefix}-image`,
  };
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const [name, setName] = React.useState("");
  const [pickedSport, setPickedSport] = React.useState<Sport | null>(null);
  const [type, setType] = React.useState<GroupCreateType>("public");
  const [requiresApproval, setRequiresApproval] = React.useState(false);
  const [image, setImage] = React.useState<File | null>(null);
  const [imageError, setImageError] = React.useState<string | null>(null);
  const nameError = fieldErrorMessage(error, "name");
  const sport =
    pickedSport && sports.includes(pickedSport)
      ? pickedSport
      : (sports[0] ?? DEFAULT_SPORT);
  const previewUrl = React.useMemo(
    () => (image ? URL.createObjectURL(image) : null),
    [image],
  );

  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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
      const pickedError = entityImageFileError(image, locale);
      if (pickedError) {
        setImageError(pickedError);
        return;
      }
    }
    onSubmit({
      name: trimmed,
      sport,
      type,
      requiresApproval: groupCreateRequiresApproval(type, requiresApproval),
      image,
    });
  }

  function onImageFile(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!next) {
      return;
    }
    const message = entityImageFileError(next, locale);
    if (message) {
      setImageError(message);
      return;
    }
    setImageError(null);
    setImage(next);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[26px]">
      <FormErrorSummary
        ref={summaryRef}
        message={globalFormErrorMessage(error)}
      />

      <div className="flex items-start gap-3.5">
        <div className="flex flex-col items-center gap-1.5">
          <GroupPhotoTile
            imageUrl={previewUrl}
            name={name || m.webGroup.groupFallback}
            label={
              previewUrl ? m.group.settings.edit.photoChange : screen.photo
            }
            disabled={pending}
            onPick={() => imageInputRef.current?.click()}
          />
          {image ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setImage(null);
                setImageError(null);
              }}
              className="text-eyebrow text-muted-foreground hover:text-ink min-h-6"
            >
              {m.common.remove}
            </button>
          ) : null}
          <input
            ref={imageInputRef}
            id={ids.image}
            type="file"
            accept={ENTITY_IMAGE_ACCEPT}
            className="hidden"
            tabIndex={-1}
            disabled={pending}
            onChange={onImageFile}
          />
        </div>
        <GroupNameField
          id={ids.name}
          label={screen.nameLabel}
          value={name}
          onChange={setName}
          placeholder={screen.namePlaceholder}
          help={imageError ?? screen.photoHelp}
          error={nameError}
          disabled={pending}
        />
      </div>

      {showSportPicker ? (
        <FormBlock label={screen.sportLabel} labelId={`${ids.sport}-label`}>
          <SportSegment
            labelledBy={`${ids.sport}-label`}
            sports={sports}
            value={sport}
            onSelect={setPickedSport}
            disabled={pending}
          />
          <p className="text-eyebrow text-muted-foreground">
            {screen.sportHelp}
          </p>
        </FormBlock>
      ) : null}

      <FormBlock
        label={screen.visibilityLabel}
        labelId={`${ids.visibility}-label`}
      >
        <VisibilityCards
          labelledBy={`${ids.visibility}-label`}
          context={context}
          value={type}
          onSelect={(next) => {
            setType(next);
            if (next === "private") {
              setRequiresApproval(false);
            }
          }}
          disabled={pending}
        />
        {context === "club" ? (
          <p className="text-eyebrow text-muted-foreground">
            {type === "private" ? copy.privateHelp : copy.publicHelp}
          </p>
        ) : null}
      </FormBlock>

      {type === "public" ? (
        <FormBlock label={joining.label}>
          <ToggleCard
            id={ids.approval}
            title={joining.toggle}
            help={groupJoiningToggleHelp({ requiresApproval, locale })}
            checked={requiresApproval}
            onCheckedChange={setRequiresApproval}
            disabled={pending}
          />
        </FormBlock>
      ) : null}

      <div className="border-rule flex flex-col items-center gap-2.5 border-t pt-3.5">
        <Button
          type="submit"
          size="lg"
          pending={pending}
          pendingLabel={m.webGroup.creating}
          disabled={!groupCreateCanSubmit(name)}
          className="w-full font-semibold"
        >
          {groupCreateSubmitLabel(context, name, locale)}
        </Button>
        <p className="text-eyebrow text-muted-foreground">{screen.footnote}</p>
      </div>
    </form>
  );
}

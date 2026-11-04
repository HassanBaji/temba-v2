"use client";

import { CameraIcon, LockIcon } from "lucide-react";
import * as React from "react";

import { useLocale, useMessages } from "~/components/locale-provider";
import { Switch } from "~/components/ui/switch";
import {
  GROUP_NAME_MAX_LENGTH,
  groupNameCounter,
  groupSportSublabel,
  groupVisibilityCopy,
  type GroupVisibility,
} from "@repo/domain/group-settings";
import { initials } from "@repo/domain/initials";
import { sportLabel, type Sport } from "@repo/domain/sport";
import { cn } from "~/lib/utils";

/** Shared parts of Create Group and Edit Group (design "Group create and edit flow" 01 and 03). */

export const FORM_INPUT =
  "border-rule text-ink placeholder:text-muted-foreground focus-visible:border-ink aria-invalid:border-destructive min-h-[50px] w-full rounded-[12px] border bg-paper px-3.5 text-base outline-none focus-visible:ring-0 disabled:opacity-50";

export function FormBlock({
  label,
  labelId,
  children,
}: {
  label: string;
  labelId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <p id={labelId} className="text-meta text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

export function GroupPhotoTile({
  imageUrl,
  name,
  label,
  empty = "camera",
  pending = false,
  disabled = false,
  onPick,
}: {
  imageUrl: string | null;
  name: string;
  /** Under the camera glyph when there is no photo; over the photo otherwise. */
  label: string;
  /** Without a photo: a dashed camera slot, or the Group's initials on ink. */
  empty?: "camera" | "initials";
  pending?: boolean;
  disabled?: boolean;
  onPick: () => void;
}) {
  const m = useMessages();
  const filled = Boolean(imageUrl) || empty === "initials";
  return (
    <button
      type="button"
      aria-label={
        imageUrl ? m.webGroup.form.changePhoto : m.webGroup.form.addPhoto
      }
      aria-busy={pending || undefined}
      disabled={disabled || pending}
      onClick={onPick}
      className={cn(
        "focus-visible:ring-ring/50 relative size-20 shrink-0 overflow-hidden rounded-[16px] outline-none focus-visible:ring-[3px] disabled:opacity-50",
        filled
          ? "bg-ink text-paper"
          : "border-input bg-surface-raised text-muted-foreground hover:border-ink hover:text-ink border border-dashed",
      )}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="size-full object-cover" />
      ) : filled ? (
        <span className="text-h2 flex size-full items-center justify-center font-semibold">
          {initials(name)}
        </span>
      ) : (
        <span className="text-eyebrow flex size-full flex-col items-center justify-center gap-1">
          <CameraIcon aria-hidden="true" className="size-5" />
          {label}
        </span>
      )}
      {filled ? (
        <span
          className={cn(
            "text-eyebrow absolute inset-x-0 bottom-0 py-1 text-center font-medium",
            imageUrl ? "bg-ink/80 text-paper" : "bg-dimrule text-paper",
          )}
        >
          {label}
        </span>
      ) : null}
    </button>
  );
}

export function GroupNameField({
  id,
  label,
  value,
  onChange,
  placeholder,
  help,
  error,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  help?: string | null;
  error?: string | null;
  disabled?: boolean;
}) {
  const m = useMessages();
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <label htmlFor={id} className="text-meta text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required
        maxLength={GROUP_NAME_MAX_LENGTH}
        disabled={disabled}
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : `${id}-help`}
        className={FORM_INPUT}
      />
      <div className="text-eyebrow text-muted-foreground flex justify-between gap-3">
        <span id={`${id}-help`} className="min-w-0">
          {error ? null : help}
        </span>
        <span
          className="shrink-0 tabular-nums"
          aria-label={m.webGroup.form.characterCount(
            value.length,
            GROUP_NAME_MAX_LENGTH,
          )}
        >
          {groupNameCounter(value)}
        </span>
      </div>
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-meta text-destructive font-medium"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Two equal cells, the picked one in ink, each with its format under it. */
export function SportSegment({
  labelledBy,
  sports,
  value,
  onSelect,
  disabled = false,
}: {
  labelledBy: string;
  sports: readonly Sport[];
  value: Sport;
  onSelect: (sport: Sport) => void;
  disabled?: boolean;
}) {
  const m = useMessages();
  const locale = useLocale();
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className={cn(
        "border-rule divide-rule grid auto-cols-fr grid-flow-col divide-x overflow-hidden rounded-[12px] border",
        disabled && "opacity-50",
      )}
    >
      {sports.map((sport) => {
        const selected = sport === value;
        const label = sportLabel(sport, locale);
        const sublabel = groupSportSublabel(sport, locale);
        return (
          <button
            key={sport}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={m.webGroup.form.sportChoice(label ?? sport, sublabel)}
            disabled={disabled}
            onClick={() => onSelect(sport)}
            className={cn(
              "focus-visible:ring-ring/50 flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-2 py-2 outline-none focus-visible:ring-[3px] focus-visible:ring-inset",
              selected
                ? "bg-ink text-paper"
                : "bg-paper text-ink hover:bg-wash",
            )}
          >
            <span className="text-body font-semibold">{label}</span>
            <span
              className={cn(
                "text-eyebrow",
                selected ? "text-dim" : "text-muted-foreground",
              )}
            >
              {sublabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function LockedSportCard({
  sport,
  help,
}: {
  sport: Sport | null;
  help: string;
}) {
  const m = useMessages();
  const locale = useLocale();
  return (
    <div className="border-rule bg-wash flex items-center gap-3 rounded-[12px] border px-[18px] py-3.5">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body font-semibold">
          {sport ? sportLabel(sport, locale) : m.common.notSet}
        </span>
        <span className="text-eyebrow text-muted-foreground">{help}</span>
      </span>
      <LockIcon aria-hidden="true" className="text-muted-foreground size-4" />
    </div>
  );
}

function RadioMark({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-[22px] shrink-0 items-center justify-center rounded-full border",
        selected ? "border-ink border-2" : "border-input",
      )}
    >
      {selected ? <span className="bg-ink size-2.5 rounded-full" /> : null}
    </span>
  );
}

export function RadioRow({
  title,
  description,
  selected,
  onSelect,
  disabled = false,
  leading,
}: {
  title: string;
  description?: string | null;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  leading?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className="hover:bg-wash focus-visible:ring-ring/50 flex min-h-11 w-full items-center gap-3.5 px-[18px] py-3.5 text-start outline-none focus-visible:ring-[3px] focus-visible:ring-inset disabled:opacity-50"
    >
      {leading}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body font-semibold">{title}</span>
        {description ? (
          <span className="text-eyebrow text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
      <RadioMark selected={selected} />
    </button>
  );
}

export function VisibilityCards({
  labelledBy,
  context,
  value,
  onSelect,
  disabled = false,
}: {
  labelledBy: string;
  context: "loose" | "club";
  value: GroupVisibility;
  onSelect: (value: GroupVisibility) => void;
  disabled?: boolean;
}) {
  const locale = useLocale();
  const copy = groupVisibilityCopy(context, locale);
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="border-rule divide-rule flex flex-col divide-y overflow-hidden rounded-[16px] border"
    >
      <RadioRow
        title={copy.public.title}
        description={copy.public.description}
        selected={value === "public"}
        disabled={disabled}
        onSelect={() => onSelect("public")}
      />
      <RadioRow
        title={copy.private.title}
        description={copy.private.description}
        selected={value === "private"}
        disabled={disabled}
        onSelect={() => onSelect("private")}
      />
    </div>
  );
}

/** The Joining card: a labelled switch with what it does in its current state. */
export function ToggleCard({
  id,
  title,
  help,
  checked,
  onCheckedChange,
  disabled = false,
}: {
  id: string;
  title: string;
  help: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="border-rule flex flex-col overflow-hidden rounded-[16px] border">
      <div className="flex items-center gap-3.5 px-[18px] py-3.5">
        <label
          htmlFor={id}
          className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5"
        >
          <span className="text-body font-semibold">{title}</span>
          <span className="text-eyebrow text-muted-foreground">{help}</span>
        </label>
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

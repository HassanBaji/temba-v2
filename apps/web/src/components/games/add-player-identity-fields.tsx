"use client";

import { PhoneField } from "~/components/auth/phone-field";
import {
  Group,
  RowChoices,
  SectionLabel,
} from "~/components/onboarding/onboarding-choices";
import { NotOnTembaTag } from "~/components/temba/seat";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  ADD_PLAYER_FOOTBALL_LEVEL_CHOICES,
  ADD_PLAYER_LEVEL_CHOICES,
  ADD_PLAYER_NAME_LABEL,
  type AddPlayerLevel,
} from "@repo/domain/add-player-by-phone";
import type { FootballSelfPlacement } from "@repo/domain/football-self-placement";

const PHONE_ID = "add-player-phone";
const NAME_ID = "add-player-name";

/** Phone, preview line and, for a new number, name and starting Level. */
export function AddPlayerIdentityFields({
  countryIso,
  national,
  onCountryIsoChange,
  onNationalChange,
  complete,
  preview,
  previewError,
  previewFetching,
  name,
  onNameChange,
  isFootball,
  level,
  onLevelChange,
  footballLevel,
  onFootballLevelChange,
  disabled,
}: {
  countryIso: string;
  national: string;
  onCountryIsoChange: (iso: string) => void;
  onNationalChange: (national: string) => void;
  complete: boolean;
  preview: {
    line: string;
    kind: "account" | "unclaimed" | "new";
    phoneMasked?: string;
  } | null;
  previewError: string | null;
  previewFetching: boolean;
  name: string;
  onNameChange: (name: string) => void;
  isFootball: boolean;
  level: AddPlayerLevel;
  onLevelChange: (level: AddPlayerLevel) => void;
  footballLevel: FootballSelfPlacement;
  onFootballLevelChange: (level: FootballSelfPlacement) => void;
  disabled: boolean;
}) {
  return (
    <>
      <Field>
        <FieldLabel htmlFor={PHONE_ID}>Phone</FieldLabel>
        <PhoneField
          id={PHONE_ID}
          countryIso={countryIso}
          national={national}
          onCountryIsoChange={onCountryIsoChange}
          onNationalChange={onNationalChange}
          invalid={Boolean(previewError && complete)}
          describedBy={`${PHONE_ID}-preview`}
          disabled={disabled}
        />
        <div id={`${PHONE_ID}-preview`} aria-live="polite">
          {complete && previewError ? (
            <FieldError>{previewError}</FieldError>
          ) : preview ? (
            <div className="space-y-1">
              <p className="text-meta">{preview.line}</p>
              {preview.kind === "unclaimed" ? (
                <p className="text-muted-foreground text-meta flex items-center gap-2 tabular-nums">
                  <NotOnTembaTag />
                  {preview.phoneMasked}
                </p>
              ) : null}
            </div>
          ) : complete && previewFetching ? (
            <p className="text-muted-foreground text-meta">Looking up…</p>
          ) : null}
        </div>
      </Field>

      {preview?.kind === "new" ? (
        <>
          <Field>
            <FieldLabel htmlFor={NAME_ID}>{ADD_PLAYER_NAME_LABEL}</FieldLabel>
            <Input
              id={NAME_ID}
              value={name}
              maxLength={100}
              autoComplete="off"
              disabled={disabled}
              onChange={(event) => onNameChange(event.target.value)}
            />
          </Field>
          <Group>
            <SectionLabel label="Starting Level" />
            {isFootball ? (
              <RowChoices
                label="Starting Level"
                choices={ADD_PLAYER_FOOTBALL_LEVEL_CHOICES}
                value={footballLevel}
                onSelect={onFootballLevelChange}
              />
            ) : (
              <RowChoices
                label="Starting Level"
                choices={ADD_PLAYER_LEVEL_CHOICES}
                value={level}
                onSelect={onLevelChange}
              />
            )}
          </Group>
        </>
      ) : null}
    </>
  );
}

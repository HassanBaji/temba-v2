import {
  ADD_PLAYER_FOOTBALL_LEVEL_CHOICES,
  ADD_PLAYER_LEVEL_CHOICES,
  ADD_PLAYER_NAME_LABEL,
  type AddPlayerLevel,
} from "@repo/domain/add-player-by-phone";
import type { FootballSelfPlacement } from "@repo/domain/football-self-placement";
import { View } from "react-native";

import { RowChoices } from "../auth/onboarding-choices";
import { PhoneField } from "../auth/phone-field";
import { NotOnTembaMark } from "../primitives/not-on-temba-mark";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";

export function AddPlayerSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text size="meta" tone="muted">
        {label}
      </Text>
      {children}
    </View>
  );
}

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
  previewError: string | undefined;
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
      <View style={{ gap: 8 }}>
        <PhoneField
          label="Phone"
          countryIso={countryIso}
          national={national}
          onCountryIsoChange={onCountryIsoChange}
          onNationalChange={onNationalChange}
          error={complete ? previewError : undefined}
          disabled={disabled}
        />
        <View accessibilityLiveRegion="polite" style={{ gap: 6 }}>
          {preview ? (
            <Text size="meta">{preview.line}</Text>
          ) : complete && previewFetching ? (
            <Text size="meta" tone="muted">
              Looking up…
            </Text>
          ) : null}
          {preview?.kind === "unclaimed" ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <NotOnTembaMark />
              <Text size="meta" tone="muted">
                {preview.phoneMasked}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {preview?.kind === "new" ? (
        <>
          <TextField
            label={ADD_PLAYER_NAME_LABEL}
            value={name}
            maxLength={100}
            autoCapitalize="words"
            autoComplete="off"
            editable={!disabled}
            onChangeText={onNameChange}
          />
          <AddPlayerSection label="Starting Level">
            {isFootball ? (
              <RowChoices
                label="Starting Level"
                choices={ADD_PLAYER_FOOTBALL_LEVEL_CHOICES}
                value={footballLevel}
                onSelect={onFootballLevelChange}
                disabled={disabled}
              />
            ) : (
              <RowChoices
                label="Starting Level"
                choices={ADD_PLAYER_LEVEL_CHOICES}
                value={level}
                onSelect={onLevelChange}
                disabled={disabled}
              />
            )}
          </AddPlayerSection>
        </>
      ) : null}
    </>
  );
}

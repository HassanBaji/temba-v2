import {
  addPlayerFootballLevelChoices,
  addPlayerLevelChoices,
  type AddPlayerLevel,
} from "@repo/domain/add-player-by-phone";
import type { FootballSelfPlacement } from "@repo/domain/football-self-placement";
import { phoneShapePlaceholder } from "@repo/domain/phone-number";
import { View } from "react-native";

import { RowChoices } from "../auth/onboarding-choices";
import { PhoneField } from "../auth/phone-field";
import { useLocale, useMessages } from "../i18n/locale-provider";
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
  const m = useMessages();
  const locale = useLocale();
  return (
    <>
      <View style={{ gap: 8 }}>
        <PhoneField
          label={m.mobileGameDetails.addPlayer.phone}
          countryIso={countryIso}
          national={national}
          placeholder={phoneShapePlaceholder(countryIso)}
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
              {m.mobileGameDetails.addPlayer.lookingUp}
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
            label={m.group.addPlayer.nameLabel}
            value={name}
            maxLength={100}
            autoCapitalize="words"
            autoComplete="off"
            editable={!disabled}
            onChangeText={onNameChange}
          />
          <AddPlayerSection label={m.mobileGameDetails.addPlayer.startingLevel}>
            {isFootball ? (
              <RowChoices
                label={m.mobileGameDetails.addPlayer.startingLevel}
                choices={addPlayerFootballLevelChoices(locale)}
                value={footballLevel}
                onSelect={onFootballLevelChange}
                disabled={disabled}
              />
            ) : (
              <RowChoices
                label={m.mobileGameDetails.addPlayer.startingLevel}
                choices={addPlayerLevelChoices(locale)}
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

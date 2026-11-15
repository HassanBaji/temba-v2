import { sizes } from "@repo/design-tokens";
import { isLevelBoundDisabled } from "@repo/domain/create-game-flow";
import {
  ASSIGNABLE_DISPLAY_LEVEL_BANDS,
  type AssignableDisplayLevelBand,
} from "@repo/domain/level-bands";
import { isolate } from "@repo/i18n/bidi";
import {
  displayRungOvrBound,
  LEVEL_BAND_SELECT_NONE,
  type LevelBandSelectValue,
} from "@repo/domain/level-range";
import type { Sport } from "@repo/domain/sport";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Text } from "../primitives/text";
import { ChipGrid, FieldError } from "./chips";
import type { StepProps } from "./step-props";
import { levelRangeSummary } from "./create-summary";
import { HelperNote, StepSection } from "./step-section";

function BoundRow({
  bound,
  value,
  other,
  error,
  sport,
  onChange,
}: {
  bound: "min" | "max";
  value: LevelBandSelectValue;
  other: LevelBandSelectValue;
  error?: string;
  sport?: Sport;
  onChange: (value: LevelBandSelectValue) => void;
}) {
  const copy = useMessages().mobileCreateGame.levelRange;
  const label = bound === "min" ? copy.minimum : copy.maximum;
  const chipLabel = (band: AssignableDisplayLevelBand) =>
    sport === "football" ? displayRungOvrBound(band, bound) : band;
  const chipA11y = (band: AssignableDisplayLevelBand) => {
    if (sport === "football") {
      const ovr = displayRungOvrBound(band, bound);
      return bound === "min" ? copy.minimumOvr(ovr) : copy.maximumOvr(ovr);
    }
    return bound === "min"
      ? copy.minimumLevelBand(band)
      : copy.maximumLevelBand(band);
  };
  return (
    <View style={{ gap: 8 }}>
      <Text size="meta" tone="muted">
        {label}
      </Text>
      <ChipGrid
        label={bound === "min" ? copy.minimumLevel : copy.maximumLevel}
        columns={5}
        dense
        chips={ASSIGNABLE_DISPLAY_LEVEL_BANDS.map((band) => ({
          value: band,
          label: chipLabel(band),
          ltr: true,
          accessibilityLabel: chipA11y(band),
          disabled: isLevelBoundDisabled(bound, band, other),
        }))}
        isSelected={(band) => band === value}
        onSelect={(band) =>
          onChange(band === value ? LEVEL_BAND_SELECT_NONE : band)
        }
      />
      <FieldError message={error} />
    </View>
  );
}

export function LevelRangeRows({
  state,
  errors,
  dispatch,
  openLink = true,
  sport,
}: StepProps & { openLink?: boolean; sport?: Sport }) {
  const { draft } = state;
  const locale = useLocale();
  const copy = useMessages().mobileCreateGame.levelRange;
  const summary = levelRangeSummary(
    draft.levelMin,
    draft.levelMax,
    locale,
    sport,
  );
  const setBound = (bound: "min" | "max") => (value: LevelBandSelectValue) =>
    dispatch({ kind: "setLevelBound", bound, value });

  return (
    <>
      <BoundRow
        bound="min"
        value={draft.levelMin}
        other={draft.levelMax}
        error={errors.levelMinTenths}
        sport={sport}
        onChange={setBound("min")}
      />
      <BoundRow
        bound="max"
        value={draft.levelMax}
        other={draft.levelMin}
        error={errors.levelMaxTenths}
        sport={sport}
        onChange={setBound("max")}
      />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text
          size="meta"
          tone="muted"
          accessibilityLabel={copy.summaryA11y(
            summary.minimum,
            summary.maximum,
          )}
          style={{ flexShrink: 1 }}
        >
          {copy.minimum}{" "}
          <Text size="meta" weight="semibold">
            {isolate(summary.minimum)}
          </Text>
          {"  /  "}
          {copy.maximum}{" "}
          <Text size="meta" weight="semibold">
            {isolate(summary.maximum)}
          </Text>
        </Text>
        {summary.open || !openLink ? null : (
          <Pressable
            accessibilityRole="button"
            onPress={() => dispatch({ kind: "openLevelRange" })}
            style={({ pressed }) => ({
              minHeight: sizes.touchTarget,
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              size="meta"
              tone="muted"
              style={{ textDecorationLine: "underline" }}
            >
              {copy.openToAnyone}
            </Text>
          </Pressable>
        )}
      </View>
    </>
  );
}

export function LevelRangeHelper() {
  const copy = useMessages().mobileCreateGame.levelRange;
  return <HelperNote>{copy.helper}</HelperNote>;
}

/** `encouraged` on a Public Game, which strangers join (ADR-0071). */
export function LevelRangeField({
  sport,
  encouraged = false,
  ...props
}: StepProps & { sport?: Sport; encouraged?: boolean }) {
  const m = useMessages();
  return (
    <StepSection
      title={m.mobileCreateGame.levelRange.title}
      note={encouraged ? m.rating.publicGame.levelRangeNote : m.common.optional}
    >
      <LevelRangeRows {...props} sport={sport} />
      {encouraged ? (
        <HelperNote>{m.rating.publicGame.levelRangeHint}</HelperNote>
      ) : null}
      <LevelRangeHelper />
    </StepSection>
  );
}

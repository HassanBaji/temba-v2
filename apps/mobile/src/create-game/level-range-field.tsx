import { sizes } from "@repo/design-tokens";
import { isLevelBoundDisabled } from "@repo/domain/create-game-flow";
import { ASSIGNABLE_DISPLAY_LEVEL_BANDS } from "@repo/domain/level-bands";
import { isolate } from "@repo/i18n/bidi";
import {
  formatLevelRangeLabel,
  LEVEL_BAND_SELECT_NONE,
  parseLevelBandSelectTenths,
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
  onChange,
}: {
  bound: "min" | "max";
  value: LevelBandSelectValue;
  other: LevelBandSelectValue;
  error?: string;
  onChange: (value: LevelBandSelectValue) => void;
}) {
  const copy = useMessages().mobileCreateGame.levelRange;
  const label = bound === "min" ? copy.minimum : copy.maximum;
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
          label: band,
          ltr: true,
          accessibilityLabel:
            bound === "min"
              ? copy.minimumLevelBand(band)
              : copy.maximumLevelBand(band),
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
}: StepProps & { openLink?: boolean }) {
  const { draft } = state;
  const locale = useLocale();
  const copy = useMessages().mobileCreateGame.levelRange;
  const summary = levelRangeSummary(draft.levelMin, draft.levelMax, locale);
  const setBound = (bound: "min" | "max") => (value: LevelBandSelectValue) =>
    dispatch({ kind: "setLevelBound", bound, value });

  return (
    <>
      <BoundRow
        bound="min"
        value={draft.levelMin}
        other={draft.levelMax}
        error={errors.levelMinTenths}
        onChange={setBound("min")}
      />
      <BoundRow
        bound="max"
        value={draft.levelMax}
        other={draft.levelMin}
        error={errors.levelMaxTenths}
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

/** A football Game's range read in OVR, under the band chips. */
function OvrRangeLine({ draft }: { draft: StepProps["state"]["draft"] }) {
  const locale = useLocale();
  const label = formatLevelRangeLabel(
    parseLevelBandSelectTenths(draft.levelMin, "min"),
    parseLevelBandSelectTenths(draft.levelMax, "max"),
    locale,
    "football",
  );
  return label ? (
    <Text size="meta" weight="semibold">
      {label}
    </Text>
  ) : null;
}

export function LevelRangeField({
  sport,
  ...props
}: StepProps & { sport?: Sport }) {
  const m = useMessages();
  return (
    <StepSection
      title={m.mobileCreateGame.levelRange.title}
      note={m.common.optional}
    >
      <LevelRangeRows {...props} />
      {sport === "football" ? <OvrRangeLine draft={props.state.draft} /> : null}
      <LevelRangeHelper />
    </StepSection>
  );
}

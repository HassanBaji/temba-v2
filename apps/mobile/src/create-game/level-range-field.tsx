import { sizes } from "@repo/design-tokens";
import { isLevelBoundDisabled } from "@repo/domain/create-game-flow";
import { ASSIGNABLE_DISPLAY_LEVEL_BANDS } from "@repo/domain/level-bands";
import {
  LEVEL_BAND_SELECT_NONE,
  type LevelBandSelectValue,
} from "@repo/domain/level-range";
import { Pressable, View } from "react-native";

import { Text } from "../primitives/text";
import { ChipGrid, FieldError } from "./chips";
import type { StepProps } from "./step-props";
import { levelRangeSummary } from "./create-summary";
import { HelperNote, StepSection } from "./step-section";

const BOUND_LABELS = { min: "Minimum", max: "Maximum" } as const;

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
  const label = BOUND_LABELS[bound];
  return (
    <View style={{ gap: 8 }}>
      <Text size="meta" tone="muted">
        {label}
      </Text>
      <ChipGrid
        label={`${label} Level`}
        columns={ASSIGNABLE_DISPLAY_LEVEL_BANDS.length}
        dense
        chips={ASSIGNABLE_DISPLAY_LEVEL_BANDS.map((band) => ({
          value: band,
          label: band,
          accessibilityLabel: `${label} Level ${band}`,
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

export function LevelRangeField({ state, errors, dispatch }: StepProps) {
  const { draft } = state;
  const summary = levelRangeSummary(draft.levelMin, draft.levelMax);
  const setBound = (bound: "min" | "max") => (value: LevelBandSelectValue) =>
    dispatch({ kind: "setLevelBound", bound, value });

  return (
    <StepSection title="Level range" note="Optional">
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
          accessibilityLabel={`Minimum ${summary.minimum}, Maximum ${summary.maximum}`}
          style={{ flexShrink: 1 }}
        >
          Minimum{" "}
          <Text size="meta" weight="semibold">
            {summary.minimum}
          </Text>
          {"  /  "}
          Maximum{" "}
          <Text size="meta" weight="semibold">
            {summary.maximum}
          </Text>
        </Text>
        {summary.open ? null : (
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
              Open to anyone
            </Text>
          </Pressable>
        )}
      </View>
      <HelperNote>
        Users without a Level must request to play when a range is set.
      </HelperNote>
    </StepSection>
  );
}

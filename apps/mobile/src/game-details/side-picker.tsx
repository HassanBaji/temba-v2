import { radii, sizes } from "@repo/design-tokens";
import type {
  JoinSideOption,
  JoinTeamOption,
  SideChoice,
} from "@repo/domain/padel-sides";
import { Pressable, View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import {
  SurfaceToneContext,
  useTonePalette,
} from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { tonePalette } from "../primitives/tone-palette";

const CARD_MIN_HEIGHT = 64;
const DIAGRAM_WIDTH = 30;
const DIAGRAM_HEIGHT = 20;

/** A picker card: ink once selected, hatched while it cannot be taken. */
function PickerCard({
  selected,
  disabled,
  accessibilityLabel,
  onPress,
  children,
}: {
  selected: boolean;
  disabled: boolean;
  accessibilityLabel: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const tone = selected ? "ink" : "paper";
  const palette = tonePalette(tone);
  return (
    <SurfaceToneContext.Provider value={tone}>
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ checked: selected, disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => ({
          flex: 1,
          minWidth: 0,
          minHeight: Math.max(CARD_MIN_HEIGHT, sizes.touchTarget),
          justifyContent: "center",
          gap: 4,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: radii.card,
          borderWidth: hairline,
          borderColor: selected ? palette.background : palette.rule,
          backgroundColor:
            pressed && !selected ? palette.wash : palette.background,
        })}
      >
        {disabled ? <Hatch radius={radii.card} /> : null}
        {children}
      </Pressable>
    </SurfaceToneContext.Provider>
  );
}

export function TeamPicker({
  options,
  selected,
  onSelect,
}: {
  options: JoinTeamOption[];
  selected: number | null;
  onSelect: (sideIndex: number) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((option) => (
        <View key={option.sideIndex} style={{ flexBasis: "48%", flexGrow: 1 }}>
          <PickerCard
            selected={option.sideIndex === selected}
            disabled={!option.open}
            accessibilityLabel={`${option.name}. ${option.meta}`}
            onPress={() => onSelect(option.sideIndex)}
          >
            <Text weight="semibold" numberOfLines={1}>
              {option.name}
            </Text>
            <Text size="eyebrow" tone="muted" numberOfLines={2}>
              {option.meta}
            </Text>
          </PickerCard>
        </View>
      ))}
    </View>
  );
}

/** Two court halves: the picked one filled, Either hatched on both. */
function SideDiagram({ side }: { side: SideChoice }) {
  const palette = useTonePalette();
  const half = (filled: boolean) => (
    <View
      style={{
        flex: 1,
        overflow: "hidden",
        backgroundColor:
          filled && side !== "either" ? palette.foreground : undefined,
      }}
    >
      {filled && side === "either" ? (
        <Hatch radius={0} bordered={false} />
      ) : null}
    </View>
  );
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      // Physical on purpose: Left and Right are court sides, not reading order.
      style={{
        width: DIAGRAM_WIDTH,
        height: DIAGRAM_HEIGHT,
        flexDirection: "row",
        direction: "ltr",
        borderWidth: hairline,
        borderColor: palette.foreground,
        borderRadius: radii.slot,
        overflow: "hidden",
      }}
    >
      {half(side !== "right")}
      <View style={{ width: hairline, backgroundColor: palette.foreground }} />
      {half(side !== "left")}
    </View>
  );
}

export function SidePicker({
  options,
  selected,
  onSelect,
}: {
  options: JoinSideOption[];
  selected: SideChoice | null;
  onSelect: (side: SideChoice) => void;
}) {
  const m = useMessages();
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {options.map((option) => (
        <PickerCard
          key={option.side}
          selected={option.side === selected && option.takenBy == null}
          disabled={option.takenBy != null}
          accessibilityLabel={
            option.takenBy
              ? m.game.sides.sideButtonTaken(option.label, option.takenBy)
              : m.game.sides.sideButton(option.label)
          }
          onPress={() => onSelect(option.side)}
        >
          <View style={{ alignItems: "center", gap: 6 }}>
            {option.takenBy ? null : <SideDiagram side={option.side} />}
            <Text
              weight="semibold"
              tone={option.takenBy ? "muted" : undefined}
              numberOfLines={1}
            >
              {option.label}
            </Text>
            {option.takenBy ? (
              <Text size="eyebrow" tone="muted" numberOfLines={1}>
                {option.takenBy}
              </Text>
            ) : null}
          </View>
        </PickerCard>
      ))}
    </View>
  );
}

/** A hairline box of label/value rows, as the join sheet's seat summary. */
export function SummaryRows({
  rows,
}: {
  rows: { label: string; value: string }[];
}) {
  const palette = useTonePalette();
  return (
    <View
      style={{
        borderWidth: hairline,
        borderColor: palette.rule,
        borderRadius: radii.card,
      }}
    >
      {rows.map((row, index) => (
        <View
          key={row.label}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 12,
            padding: 14,
            borderTopWidth: index > 0 ? hairline : 0,
            borderTopColor: palette.rule,
          }}
        >
          <Text tone="muted">{row.label}</Text>
          <Text style={{ flexShrink: 1, textAlign: "right" }}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

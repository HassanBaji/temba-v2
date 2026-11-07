import { radii, sizes } from "@repo/design-tokens";
import { Pressable, View } from "react-native";

import { Hatch } from "../primitives/hatch";
import { hairline } from "../primitives/hairline-width";
import { SurfaceToneContext } from "../primitives/surface-context";
import { tonePalette } from "../primitives/tone-palette";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";

/** A section title with a muted note at the far end: "Partners  most played". */
export function SectionHead({ title, meta }: { title: string; meta?: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <Text size="title" weight="semibold" accessibilityRole="header">
        {title}
      </Text>
      {meta ? (
        <Text
          size="meta"
          tone="muted"
          numberOfLines={1}
          style={{ flexShrink: 1 }}
        >
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * A pill chip: ink when selected, hairline otherwise, dashed when it offers
 * something not set up yet.
 */
export function Chip({
  label,
  meta,
  selected = false,
  dashed = false,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  meta?: string;
  selected?: boolean;
  dashed?: boolean;
  accessibilityLabel?: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const tone = selected ? "ink" : "paper";
  const palette = tonePalette(tone, colors);
  return (
    <SurfaceToneContext.Provider value={tone}>
      <Pressable
        accessibilityRole={dashed ? "button" : "tab"}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={dashed ? undefined : { selected }}
        onPress={onPress}
        hitSlop={(sizes.touchTarget - 36) / 2}
        style={({ pressed }) => ({
          height: 36,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          borderRadius: radii.lg,
          borderWidth: hairline,
          borderStyle: dashed ? "dashed" : "solid",
          borderColor: selected ? colors.ink : palette.rule,
          backgroundColor: selected
            ? colors.control
            : pressed
              ? palette.wash
              : palette.background,
        })}
      >
        <Text
          size="meta"
          weight={selected ? "semibold" : "regular"}
          tone={dashed ? "muted" : "default"}
        >
          {label}
        </Text>
        {meta ? (
          <Text size="eyebrow" tone="muted">
            {meta}
          </Text>
        ) : null}
      </Pressable>
    </SurfaceToneContext.Provider>
  );
}

/** A Group's initials square: solid ink, or hatched while its Level is Provisional. */
export function GroupTile({
  initials,
  hatched,
  size = 30,
}: {
  initials: string;
  hatched: boolean;
  size?: number;
}) {
  const colors = useColors();
  const tone = hatched ? "paper" : "ink";
  const palette = tonePalette(tone, colors);
  return (
    <SurfaceToneContext.Provider value={tone}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: size,
          height: size,
          borderRadius: radii.sm,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: hatched ? palette.background : colors.control,
          borderWidth: hatched ? hairline : 0,
          borderColor: palette.rule,
        }}
      >
        {hatched ? <Hatch radius={radii.sm} bordered={false} /> : null}
        <Text size="eyebrow" weight="semibold">
          {initials}
        </Text>
      </View>
    </SurfaceToneContext.Provider>
  );
}

/** A boxed signed difference: ink border when above General, rule when at or below. */
export function DifferenceBox({
  label,
  above,
}: {
  label: string;
  above: boolean;
}) {
  const palette = tonePalette("paper", useColors());
  return (
    <View
      style={{
        paddingHorizontal: 5,
        borderRadius: radii.slot - 1,
        borderWidth: hairline,
        borderColor: above ? palette.foreground : palette.rule,
      }}
    >
      <Text size="eyebrow" mono tone={above ? "default" : "muted"}>
        {label}
      </Text>
    </View>
  );
}

/** A thin win-share bar under a partner's name. */
export function ShareBar({ percent }: { percent: number }) {
  const palette = tonePalette("paper", useColors());
  return (
    <View
      style={{
        height: 3,
        borderRadius: 2,
        backgroundColor: palette.rule,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${Math.max(0, Math.min(100, percent))}%`,
          height: 3,
          backgroundColor: palette.foreground,
        }}
      />
    </View>
  );
}

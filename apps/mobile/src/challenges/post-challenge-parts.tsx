import { radii, sizes } from "@repo/design-tokens";
import { ArrowLeft, type LucideProps } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { gridRows } from "../create-game/grid-rows";
import { useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
import { hairline } from "../primitives/hairline-width";
import { InitialsTile } from "../primitives/initials-tile";
import { useLeaveScreen } from "../primitives/screen-header";
import { SurfaceToneContext } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { CHALLENGES_PATH } from "./challenges-model";

const SECTION_HEADING_GAP = 12;
const CHIP_GAP = 6;
const DISABLED_OPACITY = 0.4;

function BackArrow(props: LucideProps) {
  return <ArrowLeft {...props} style={mirrorInRtl} />;
}

/** Back arrow and the step's title on one line; back leaves the flow unless a step handles it. */
export function PostChallengeHeader({
  title,
  onBack,
}: {
  title: string;
  onBack?: () => void;
}) {
  const m = useMessages();
  const colors = useColors();
  const leave = useLeaveScreen(CHALLENGES_PATH);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={m.common.back}
        onPress={onBack ?? leave}
        style={({ pressed }) => ({
          width: sizes.touchTarget,
          height: sizes.touchTarget,
          marginStart: -12,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <BackArrow size={sizes.iconAction} color={colors.ink} />
      </Pressable>
      <Text
        size="h2"
        weight="bold"
        accessibilityRole="header"
        numberOfLines={1}
        style={{ flexShrink: 1 }}
      >
        {title}
      </Text>
    </View>
  );
}

/** A form section: expanded heading, a muted note at its end, then the controls. */
export function PostChallengeSection({
  title,
  hint,
  error,
  children,
}: {
  title: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: SECTION_HEADING_GAP }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text
          size="title"
          weight="bold"
          width="expanded"
          accessibilityRole="header"
        >
          {title}
        </Text>
        {hint ? (
          <Text
            size="eyebrow"
            tone="muted"
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
      {error ? (
        <Text size="meta" weight="medium" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** The 44px boxes every choice here uses: 13px semibold, ink when picked. */
export function PostChallengeChip({
  label,
  selected,
  multiple = false,
  disabled = false,
  ltr = false,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  selected: boolean;
  multiple?: boolean;
  disabled?: boolean;
  ltr?: boolean;
  accessibilityLabel?: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <SurfaceToneContext.Provider value={selected ? "ink" : "paper"}>
      <Pressable
        accessibilityRole={multiple ? "checkbox" : "radio"}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ checked: selected, disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => ({
          height: sizes.touchTarget,
          paddingHorizontal: 8,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radii.md,
          borderWidth: hairline,
          borderColor: selected ? colors.ink : colors.rule,
          backgroundColor: selected
            ? colors.control
            : pressed
              ? colors.wash
              : colors.paper,
          opacity: disabled ? DISABLED_OPACITY : 1,
        })}
      >
        <Text
          size="meta"
          weight="semibold"
          numberOfLines={1}
          ltr={ltr}
          style={{ color: selected ? colors.onControl : colors.ink }}
        >
          {label}
        </Text>
      </Pressable>
    </SurfaceToneContext.Provider>
  );
}

/** Equal columns with the design's 6px gutters. */
export function PostChallengeGrid({
  label,
  columns,
  multiple = false,
  children,
}: {
  label: string;
  columns: number;
  multiple?: boolean;
  children: React.ReactElement[];
}) {
  return (
    <View
      accessibilityRole={multiple ? undefined : "radiogroup"}
      accessibilityLabel={label}
      style={{ gap: CHIP_GAP }}
    >
      {gridRows(children, columns).map((row, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: "row", gap: CHIP_GAP }}>
          {row.map((cell, cellIndex) => (
            <View
              key={cell?.key ?? `empty-${cellIndex}`}
              style={{ flex: 1, minWidth: 0 }}
            >
              {cell}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** A Team to post as: initials tile, name, sport and Roster; ink when picked. */
export function PostChallengeTeamCard({
  title,
  detail,
  accessibilityLabel,
  selected,
  onPress,
}: {
  title: string;
  detail: string;
  accessibilityLabel: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <SurfaceToneContext.Provider value={selected ? "ink" : "paper"}>
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ checked: selected }}
        onPress={onPress}
        style={({ pressed }) => ({
          flex: 1,
          minHeight: 64,
          paddingVertical: 12,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          borderRadius: radii.lg,
          borderWidth: hairline,
          borderColor: selected ? colors.ink : colors.rule,
          backgroundColor: selected
            ? colors.control
            : pressed
              ? colors.wash
              : colors.paper,
        })}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <InitialsTile
            name={title}
            size="md"
            tone={selected ? "inverse" : "control"}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text
            weight="semibold"
            numberOfLines={2}
            style={{ color: selected ? colors.onControl : colors.ink }}
          >
            {title}
          </Text>
          <Text
            size="eyebrow"
            style={{ color: selected ? colors.onControlMuted : colors.muted }}
          >
            {detail}
          </Text>
        </View>
      </Pressable>
    </SurfaceToneContext.Provider>
  );
}

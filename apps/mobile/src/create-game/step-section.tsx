import { sizes } from "@repo/design-tokens";
import { Info } from "lucide-react-native";
import type { ComponentType } from "react";
import { Pressable, View, type ColorValue } from "react-native";

import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

export type StepSectionLink = {
  label: string;
  onPress: () => void;
  icon?: ComponentType<{ size: number; color: ColorValue }>;
  accessibilityLabel?: string;
};

export type StepSectionProps = {
  title: string;
  note?: string;
  link?: StepSectionLink;
  locked?: boolean;
  children: React.ReactNode;
};

export function StepSection({
  title,
  note,
  link,
  locked = false,
  children,
}: StepSectionProps) {
  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text
          size="title"
          width="expanded"
          tone={locked ? "muted" : "default"}
          accessibilityRole="header"
          style={{ flexShrink: 1 }}
        >
          {title}
        </Text>
        {link ? (
          <SectionLink {...link} />
        ) : note ? (
          <Text size="meta" tone="muted">
            {note}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function SectionLink({
  label,
  onPress,
  icon: Icon,
  accessibilityLabel,
}: StepSectionLink) {
  const palette = useTonePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {Icon ? <Icon size={sizes.iconRow} color={palette.muted} /> : null}
      <Text
        size="meta"
        tone="muted"
        style={Icon ? undefined : { textDecorationLine: "underline" }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function HelperNote({ children }: { children: React.ReactNode }) {
  const palette = useTonePalette();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
      <View style={{ paddingTop: 1 }}>
        <Info size={sizes.iconRow} color={palette.muted} />
      </View>
      <Text size="meta" tone="muted" style={{ flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}

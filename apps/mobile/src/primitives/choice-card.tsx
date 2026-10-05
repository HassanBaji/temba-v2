import { radii, sizes } from "@repo/design-tokens";
import { Check, ChevronRight } from "lucide-react-native";
import type { ComponentType } from "react";
import { Pressable, View, type ColorValue } from "react-native";

import { hairline } from "./hairline-width";
import { SurfaceToneContext } from "./surface-context";
import { tonePalette } from "./tone-palette";
import { Text } from "./text";

export type ChoiceCardProps = {
  selected: boolean;
  role: "radio" | "checkbox";
  title: string;
  description?: string;
  leading?: ComponentType<{ size: number; color: ColorValue }>;
  trailing?: "check" | "chevron";
  layout?: "card" | "row";
  accessibilityLabel?: string;
  onPress: () => void;
  children?: React.ReactNode;
};

const CARD_PADDING = { paddingVertical: 18, paddingHorizontal: 20 } as const;
const ROW_PADDING = { paddingVertical: 16, paddingHorizontal: 18 } as const;

export function ChoiceCard({
  selected,
  role,
  title,
  description,
  leading: Leading,
  trailing = "check",
  layout = "card",
  accessibilityLabel,
  onPress,
  children,
}: ChoiceCardProps) {
  const tone = selected ? "ink" : "paper";
  const palette = tonePalette(tone);
  const card = layout === "card";

  return (
    <SurfaceToneContext.Provider value={tone}>
      <Pressable
        accessibilityRole={role}
        accessibilityLabel={
          accessibilityLabel ??
          (description ? `${title}, ${description}` : title)
        }
        accessibilityState={{ checked: selected }}
        onPress={onPress}
        style={({ pressed }) => [
          {
            minHeight: sizes.touchTarget,
            gap: 12,
            backgroundColor:
              pressed && !selected ? palette.wash : palette.background,
          },
          card
            ? {
                ...CARD_PADDING,
                borderRadius: radii.card,
                borderWidth: hairline,
                borderColor: selected ? palette.background : palette.rule,
              }
            : ROW_PADDING,
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {Leading ? (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              aria-hidden
              style={{
                width: sizes.touchTarget,
                height: sizes.touchTarget,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: radii.sm,
                borderWidth: hairline,
                borderColor: palette.rule,
                backgroundColor: selected ? palette.wash : palette.background,
              }}
            >
              <Leading size={sizes.iconAction} color={palette.foreground} />
            </View>
          ) : null}
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              size={card ? "lead" : "body"}
              weight={selected || card ? "semibold" : "regular"}
              numberOfLines={card ? undefined : 1}
            >
              {title}
            </Text>
            {description ? (
              <Text size={card ? "eyebrow" : "meta"} tone="muted">
                {description}
              </Text>
            ) : null}
          </View>
          {selected ? (
            <Check size={sizes.iconAction} color={palette.foreground} />
          ) : trailing === "chevron" ? (
            <ChevronRight size={sizes.iconAction} color={palette.muted} />
          ) : null}
        </View>
        {children}
      </Pressable>
    </SurfaceToneContext.Provider>
  );
}

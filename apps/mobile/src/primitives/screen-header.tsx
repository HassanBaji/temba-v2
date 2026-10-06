import { colors, radii, sizes } from "@repo/design-tokens";
import { useRouter, type Href } from "expo-router";
import { ChevronLeft, X } from "lucide-react-native";
import type { ComponentType } from "react";
import { Pressable, View, type ColorValue } from "react-native";

import { backTarget } from "./back-target";
import { hairline } from "./hairline-width";
import { useSurfaceTone } from "./surface-context";
import { Text } from "./text";

const NAV_BUTTON = 40;
const NAV_HIT_SLOP = (sizes.touchTarget - NAV_BUTTON) / 2;
const TITLE_GAP = 20;
const ACTION_GAP = 4;

type HeaderNav =
  | { nav?: undefined; fallback?: undefined; onNav?: undefined }
  | { nav: "back" | "close"; fallback: Href; onNav?: () => void };

export type ScreenHeaderProps = HeaderNav & {
  title?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
};

export function ScreenHeader({
  title,
  nav,
  fallback,
  onNav,
  actions,
  children,
}: ScreenHeaderProps) {
  const heading = title ? (
    <Text
      size="h1"
      weight="bold"
      accessibilityRole="header"
      numberOfLines={2}
      style={{ flexShrink: 1 }}
    >
      {title}
    </Text>
  ) : null;
  const actionRow = actions ? (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: ACTION_GAP }}
    >
      {actions}
    </View>
  ) : null;

  if (!nav) {
    return (
      <View style={{ gap: TITLE_GAP }}>
        <View
          style={{
            minHeight: sizes.touchTarget,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {heading}
          {actionRow}
        </View>
        {children}
      </View>
    );
  }

  return (
    <View style={{ gap: TITLE_GAP }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <NavButton nav={nav} fallback={fallback} onNav={onNav} />
        {actionRow}
      </View>
      {heading}
      {children}
    </View>
  );
}

function NavButton({
  nav,
  fallback,
  onNav,
}: {
  nav: "back" | "close";
  fallback: Href;
  onNav?: () => void;
}) {
  const router = useRouter();
  const onInk = useSurfaceTone() === "ink";
  const Icon = nav === "back" ? ChevronLeft : X;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={nav === "back" ? "Back" : "Close"}
      hitSlop={NAV_HIT_SLOP}
      onPress={() => {
        if (onNav) {
          onNav();
          return;
        }
        const target = backTarget(router.canGoBack(), fallback);
        if (target.kind === "back") {
          router.back();
        } else {
          router.replace(target.href);
        }
      }}
      style={({ pressed }) => ({
        width: NAV_BUTTON,
        height: NAV_BUTTON,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radii.md,
        borderWidth: hairline,
        borderColor: onInk ? colors.dimrule : colors.rule,
        backgroundColor: onInk ? colors.ink : colors.paper,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon size={sizes.iconAction} color={onInk ? colors.paper : colors.ink} />
    </Pressable>
  );
}

export function HeaderIconButton({
  icon: Icon,
  accessibilityLabel,
  onPress,
}: {
  icon: ComponentType<{ size: number; color: ColorValue }>;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({
        width: sizes.touchTarget,
        height: sizes.touchTarget,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon size={sizes.iconAction} color={colors.ink} />
    </Pressable>
  );
}

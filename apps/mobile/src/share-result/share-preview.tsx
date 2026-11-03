import { colors, radii, sizes } from "@repo/design-tokens";
import { stickerPlacement } from "@repo/domain/result-share-frame";
import { Image } from "expo-image";
import { Image as ImageIcon } from "lucide-react-native";
import type { ComponentType } from "react";
import { Pressable, StyleSheet, View, type ColorValue } from "react-native";

import { Text } from "../primitives/text";

/** The card's width in the fitted preview: the whole screen stays above the fold. */
export const FITTED_WIDTH = 236;
const PREVIEW_PADDING = 22;
const PLACEMENT = stickerPlacement();

/** The wash well a preview sits in, fitted to a small frame or opened to full width. */
export function PreviewWell({
  full,
  children,
}: {
  full: boolean;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        padding: PREVIEW_PADDING,
        borderRadius: radii.surface,
        backgroundColor: colors.wash,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: full ? "100%" : FITTED_WIDTH,
          borderRadius: radii.md,
          overflow: "hidden",
        }}
      >
        {children}
      </View>
    </View>
  );
}

/**
 * A 9:16 photo with the sticker where the story editor would put it. The
 * sticker inside is the capture; the photo only shows how it reads.
 */
export function PhotoFrame({
  photoUri,
  children,
}: {
  photoUri: string | null;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        width: "100%",
        aspectRatio: 9 / 16,
        backgroundColor: colors.raised,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          contentFit="cover"
          style={StyleSheet.absoluteFill}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={{ alignItems: "center", gap: 8 }}>
          <ImageIcon size={28} color={colors.dim} />
          <Text size="eyebrow" style={{ color: colors.dim }}>
            Your photo
          </Text>
        </View>
      )}
      <View
        style={{
          position: "absolute",
          left: `${PLACEMENT.insetPercent}%`,
          right: `${PLACEMENT.insetPercent}%`,
          bottom: `${PLACEMENT.bottomPercent}%`,
        }}
      >
        {children}
      </View>
    </View>
  );
}

/** The line under the preview: the file's format, and one quiet door on the right. */
export function PreviewMeta({
  format,
  action,
}: {
  format: string;
  action: {
    label: string;
    icon: ComponentType<{ size: number; color: ColorValue }>;
    onPress: () => void;
  };
}) {
  const Icon = action.icon;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingHorizontal: 2,
      }}
    >
      <Text
        size="eyebrow"
        mono
        tone="muted"
        numberOfLines={1}
        style={{ flexShrink: 1, letterSpacing: 0.08 * 12 }}
      >
        {format}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={action.onPress}
        hitSlop={(sizes.touchTarget - 20) / 2}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Icon size={13} color={colors.muted} />
        <Text size="meta" tone="muted">
          {action.label}
        </Text>
      </Pressable>
    </View>
  );
}

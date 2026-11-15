import { useState } from "react";
import { View } from "react-native";

import { CachedImage } from "./cached-image";
import { hairline } from "./hairline-width";
import { initialsFor } from "./initials";
import { useTonePalette } from "./surface-context";
import { Text } from "./text";

const SIZES = { sm: 24, default: 32, lg: 40, court: 52, xl: 72 } as const;

export type AvatarProps = {
  name: string;
  uri?: string | null;
  size?: keyof typeof SIZES;
  /** Defaults to a circle. */
  radius?: number;
  /** A Guest player: a dashed outline, since no account stands behind it. */
  guest?: boolean;
};

export function Avatar({
  name,
  uri,
  size = "default",
  radius,
  guest = false,
}: AvatarProps) {
  const palette = useTonePalette();
  const [failed, setFailed] = useState(false);
  const dimension = SIZES[size];

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={name}
      style={{
        width: dimension,
        height: dimension,
        borderRadius: radius ?? dimension / 2,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: guest ? palette.background : palette.wash,
        borderWidth: hairline,
        borderStyle: guest ? "dashed" : "solid",
        borderColor: guest ? palette.foreground : palette.rule,
      }}
    >
      {uri && !failed ? (
        <CachedImage
          uri={uri}
          style={{ width: dimension, height: dimension }}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text
          size={size === "xl" ? "title" : size === "court" ? "body" : "eyebrow"}
          weight="semibold"
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {initialsFor(name)}
        </Text>
      )}
    </View>
  );
}

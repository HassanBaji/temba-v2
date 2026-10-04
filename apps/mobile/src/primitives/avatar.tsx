import { useState } from "react";
import { Image, View } from "react-native";

import { hairline } from "./hairline-width";
import { initialsFor } from "./initials";
import { useTonePalette } from "./surface-context";
import { Text } from "./text";

const SIZES = { sm: 24, default: 32, lg: 40, xl: 72 } as const;

export type AvatarProps = {
  name: string;
  uri?: string | null;
  size?: keyof typeof SIZES;
};

export function Avatar({ name, uri, size = "default" }: AvatarProps) {
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
        borderRadius: dimension / 2,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: palette.wash,
        borderWidth: hairline,
        borderColor: palette.rule,
      }}
    >
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={{ width: dimension, height: dimension }}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text
          size={size === "xl" ? "title" : "eyebrow"}
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

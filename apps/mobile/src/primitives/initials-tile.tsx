import { colors, radii } from "@repo/design-tokens";
import { View } from "react-native";

import { initialsFor } from "./initials";
import { SurfaceToneContext } from "./surface-context";
import { Text } from "./text";

const SIZES = { default: 40, lg: 56 } as const;

/** A solid ink square with the User's initials: the design's "initials tile". */
export function InitialsTile({
  name,
  size = "default",
}: {
  name: string;
  size?: keyof typeof SIZES;
}) {
  const dimension = SIZES[size];
  return (
    <SurfaceToneContext.Provider value="ink">
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={name}
        style={{
          width: dimension,
          height: dimension,
          borderRadius: radii.md,
          backgroundColor: colors.ink,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          size={size === "lg" ? "title" : "meta"}
          weight="semibold"
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {initialsFor(name)}
        </Text>
      </View>
    </SurfaceToneContext.Provider>
  );
}

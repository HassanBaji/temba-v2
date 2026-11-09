import { View } from "react-native";

import { hairline } from "../primitives/hairline-width";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

/**
 * A square initials tile for a Team crest or a Roster row: solid in the
 * tone's control colour, or outlined on the surface.
 */
export function ChallengeInitials({
  initials,
  size,
  radius,
  variant = "solid",
  expanded = false,
}: {
  initials: string;
  size: number;
  radius: number;
  variant?: "solid" | "outline";
  expanded?: boolean;
}) {
  const palette = useTonePalette();
  const solid = variant === "solid";
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        borderWidth: solid ? 0 : hairline,
        borderColor: palette.rule,
        backgroundColor: solid ? palette.control : palette.background,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        size="eyebrow"
        weight={expanded ? "bold" : "semibold"}
        width={expanded ? "expanded" : "normal"}
        style={{ color: solid ? palette.onControl : palette.foreground }}
      >
        {initials}
      </Text>
    </View>
  );
}

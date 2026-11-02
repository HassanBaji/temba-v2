import { radii } from "@repo/design-tokens";
import { View } from "react-native";

import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

export function FormErrorSummary({ message }: { message?: string | null }) {
  const palette = useTonePalette();
  if (!message) {
    return null;
  }
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={{
        borderWidth: 2,
        borderColor: palette.foreground,
        borderRadius: radii.md,
        padding: 12,
      }}
    >
      <Text weight="medium">{message}</Text>
    </View>
  );
}

import { colors, radii } from "@repo/design-tokens";
import { View } from "react-native";

import { Text } from "../primitives/text";

export function FormErrorSummary({ message }: { message?: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={{
        borderWidth: 2,
        borderColor: colors.ink,
        borderRadius: radii.md,
        padding: 12,
      }}
    >
      <Text weight="medium">{message}</Text>
    </View>
  );
}

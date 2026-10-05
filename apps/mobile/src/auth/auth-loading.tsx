import { colors } from "@repo/design-tokens";
import { ActivityIndicator, View } from "react-native";

import { Screen } from "../primitives/screen";
import { Text } from "../primitives/text";

export function AuthLoading({ label }: { label?: string }) {
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.ink} />
        {label ? (
          <Text tone="muted" accessibilityRole="text">
            {label}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

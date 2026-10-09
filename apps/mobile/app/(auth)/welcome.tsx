import { colors, spacing } from "@repo/design-tokens";
import { router } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../../src/primitives/button";
import { SurfaceToneContext } from "../../src/primitives/surface-context";
import { Text } from "../../src/primitives/text";

export default function Welcome() {
  const insets = useSafeAreaInsets();

  return (
    <SurfaceToneContext.Provider value="ink">
      <View
        style={{
          flex: 1,
          backgroundColor: colors.ink,
          paddingTop: insets.top + spacing.section,
          paddingBottom: insets.bottom + spacing.section,
          paddingHorizontal: spacing.section,
        }}
      >
        <Text size="title" width="expanded" weight="bold">
          Temba
        </Text>
        <View style={{ marginTop: 72, gap: 18 }}>
          <Text size="hero" width="expanded" weight="bold">
            Every match counts. Fill the court, keep the score.
          </Text>
          <Text tone="muted">
            Open games near you, your regular groups, and a level that follows
            your results.
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <View style={{ gap: 10 }}>
          <Button
            label="Create account"
            size="lg"
            onPress={() => router.push("/sign-up")}
          />
          <Button
            label="Sign in"
            size="lg"
            variant="outline-inverse"
            onPress={() => router.push("/sign-in")}
          />
        </View>
      </View>
    </SurfaceToneContext.Provider>
  );
}

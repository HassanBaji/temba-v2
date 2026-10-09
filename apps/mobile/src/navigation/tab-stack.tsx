import { colors } from "@repo/design-tokens";
import { Stack } from "expo-router";

export function TabStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
      }}
    />
  );
}

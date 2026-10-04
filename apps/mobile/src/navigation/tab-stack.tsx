import { colors } from "@repo/design-tokens";
import { Stack } from "expo-router";

import { Text } from "../primitives/text";

export function TabStack({ title }: { title: string }) {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerStyle: { backgroundColor: colors.paper },
        contentStyle: { backgroundColor: colors.paper },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title,
          headerTitle: () => <Text weight="semibold">{title}</Text>,
        }}
      />
    </Stack>
  );
}

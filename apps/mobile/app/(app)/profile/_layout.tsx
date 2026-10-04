import { Stack } from "expo-router";

import { TabStack } from "../../../src/navigation/tab-stack";

export default function ProfileLayout() {
  return (
    <TabStack title="Profile">
      <Stack.Screen name="teams" options={{ title: "Teams" }} />
      <Stack.Screen name="invites" options={{ title: "Invites" }} />
    </TabStack>
  );
}

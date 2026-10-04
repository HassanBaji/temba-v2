import { Stack } from "expo-router";

import { TabStack } from "../../../src/navigation/tab-stack";

export default function ProfileLayout() {
  return (
    <TabStack title="Profile">
      <Stack.Screen name="teams/index" options={{ title: "Teams" }} />
      <Stack.Screen name="teams/new" options={{ title: "Create Team" }} />
      <Stack.Screen name="teams/[id]" options={{ title: "Team" }} />
      <Stack.Screen name="invites" options={{ title: "Invites" }} />
      <Stack.Screen name="invite-link" options={{ title: "Invite" }} />
    </TabStack>
  );
}

import { useLocalSearchParams } from "expo-router";

import { SetLevelScreen } from "../../../src/groups/set-level-screen";

export default function SetLevel() {
  const { groupId, userId } = useLocalSearchParams<{
    groupId: string;
    userId: string;
  }>();
  return <SetLevelScreen groupId={groupId} userId={userId} />;
}

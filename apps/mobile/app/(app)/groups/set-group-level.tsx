import { useLocalSearchParams } from "expo-router";

import { SetGroupLevelScreen } from "../../../src/groups/set-group-level-screen";

export default function SetGroupLevel() {
  const { groupId, userId } = useLocalSearchParams<{
    groupId: string;
    userId: string;
  }>();
  return <SetGroupLevelScreen groupId={groupId} userId={userId} />;
}

import { useLocalSearchParams } from "expo-router";

import { SeasonsScreen } from "../../../src/groups/seasons-screen";

export default function GroupSeasons() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  return <SeasonsScreen groupId={groupId} />;
}

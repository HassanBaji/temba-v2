import { useLocalSearchParams } from "expo-router";

import { GroupHomeScreen } from "../../../src/groups/group-home-screen";

export default function GroupHome() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <GroupHomeScreen groupId={id} />;
}

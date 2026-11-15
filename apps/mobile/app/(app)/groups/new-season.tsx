import { useLocalSearchParams } from "expo-router";

import { NewSeasonScreen } from "../../../src/groups/new-season-screen";

export default function NewGroupSeason() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  return <NewSeasonScreen groupId={groupId} />;
}

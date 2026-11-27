import { useLocalSearchParams } from "expo-router";

import { GroupSeriesScreen } from "../../../../src/series/group-series-screen";

export default function GroupSeries() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  return <GroupSeriesScreen groupId={groupId} />;
}

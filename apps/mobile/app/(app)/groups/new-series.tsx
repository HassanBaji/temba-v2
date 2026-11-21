import { useLocalSearchParams } from "expo-router";

import { NewSeriesScreen } from "../../../src/series/new-series-screen";

export default function NewGroupSeries() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  return <NewSeriesScreen groupId={groupId} />;
}

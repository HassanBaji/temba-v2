import { Redirect, useLocalSearchParams } from "expo-router";

import { teamPath } from "../../../../src/teams/teams-model";

// Kept so links into the old Profile path still land on the Team.
export default function TeamHome() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={teamPath(id)} />;
}

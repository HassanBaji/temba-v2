import { Redirect, useLocalSearchParams } from "expo-router";

import { newTeamPath } from "../../../../src/teams/teams-model";

export default function NewTeam() {
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  return <Redirect href={newTeamPath(groupId)} />;
}

import { useLocalSearchParams } from "expo-router";

import { CreateTeamScreen } from "../../../../src/teams/create-team-screen";

export default function NewTeam() {
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  return <CreateTeamScreen groupId={groupId ?? null} />;
}

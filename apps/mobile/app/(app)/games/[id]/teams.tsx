import { useLocalSearchParams } from "expo-router";

import { MakeTeamsScreen } from "../../../../src/football/make-teams-screen";

export default function MakeTeams() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MakeTeamsScreen gameId={id} />;
}

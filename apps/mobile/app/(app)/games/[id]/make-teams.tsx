import { useLocalSearchParams } from "expo-router";

import { AloneMakeTeamsScreen } from "../../../../src/tournament/make-teams-screen";

export default function AloneMakeTeams() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AloneMakeTeamsScreen gameId={id} />;
}

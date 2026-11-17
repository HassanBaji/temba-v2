import { useLocalSearchParams } from "expo-router";

import { ShareTeamsScreen } from "../../../../src/tournament/share-teams-screen";

export default function ShareTeams() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ShareTeamsScreen gameId={id} />;
}

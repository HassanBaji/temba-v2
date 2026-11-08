import { useLocalSearchParams } from "expo-router";

import { TeamHomeScreen } from "../../../../src/teams/team-home-screen";

export default function TeamHome() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TeamHomeScreen teamId={id} />;
}

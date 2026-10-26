import { useLocalSearchParams } from "expo-router";

import { FootballScoreScreen } from "../../../../src/football/score-screen";

export default function FootballScore() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <FootballScoreScreen gameId={id} />;
}

import { useLocalSearchParams } from "expo-router";

import { GameDetailsScreen } from "../../../../src/game-details/details-screen";

export default function GameDetails() {
  const { id, intent } = useLocalSearchParams<{
    id: string;
    intent?: string;
  }>();
  return <GameDetailsScreen gameId={id} intent={intent} />;
}

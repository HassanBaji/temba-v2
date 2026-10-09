import { useLocalSearchParams } from "expo-router";

import { GameDetailsScreen } from "../../../src/game-details/details-screen";

export default function GameDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <GameDetailsScreen gameId={id} />;
}

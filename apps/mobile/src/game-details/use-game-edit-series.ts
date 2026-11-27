import { useSeriesAttachOptions } from "../series/use-series-attach-options";
import { gameEditSeries, type GameEditSeriesGame } from "./game-edit-series";
import type { GameEditSeriesContext } from "./game-edit-sheet";

export function useGameEditSeries(
  game: GameEditSeriesGame | null | undefined,
): { shown: boolean; context: GameEditSeriesContext | undefined } {
  const attach = useSeriesAttachOptions({
    groupId: game?.groupId,
    windowStart: game?.windowStart,
    gameId: game?.id,
    enabled: game?.canChangeSeries === true,
  });
  if (!game) {
    return { shown: false, context: undefined };
  }
  return gameEditSeries(game, attach.options);
}

"use client";

import type { GameEditSeriesContext } from "~/components/games/game-edit-dialog";
import {
  gameEditSeries,
  type GameEditSeriesGame,
} from "~/components/games/game-edit-series";
import { useSeriesAttachOptions } from "~/components/series/use-series-attach-options";

export function useGameEditSeries(game: GameEditSeriesGame | undefined): {
  shown: boolean;
  context: GameEditSeriesContext | undefined;
} {
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

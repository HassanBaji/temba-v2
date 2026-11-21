import type { SeriesAttachOption } from "../series/series-attach";
import { useSeriesAttachOptions } from "../series/use-series-attach-options";
import type { GameEditSeriesContext } from "./game-edit-sheet";

/**
 * Edit game's Series section: shown when the Game has a Series, or when it
 * may join one and its Group runs at least one.
 */
export function useGameEditSeries(
  game:
    | {
        id: string;
        groupId: string | null;
        windowStart: Date | null;
        series: SeriesAttachOption | null;
        canChangeSeries: boolean;
      }
    | null
    | undefined,
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
  return {
    shown: game.series != null || attach.options.length > 0,
    context: {
      gameId: game.id,
      groupId: game.groupId,
      windowStart: game.windowStart,
      current: game.series,
      canChange: game.canChangeSeries,
    },
  };
}

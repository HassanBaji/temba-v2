import type { SeriesAttachOption } from "../series/series-attach";
import type { GameEditSeriesContext } from "./game-edit-sheet";

export type GameEditSeriesGame = {
  id: string;
  groupId: string | null;
  windowStart: Date | null;
  series: SeriesAttachOption | null;
  canChangeSeries: boolean;
  seriesScoreLocked: boolean;
};

/**
 * Edit game's Series section: shown when the Game has a Series, or when it
 * may join one and its Group runs at least one. Only the score locks the row:
 * a Game whose Group is no longer Verified joins no Series and can still
 * leave the one it has.
 */
export function gameEditSeries(
  game: GameEditSeriesGame,
  running: readonly SeriesAttachOption[],
): { shown: boolean; context: GameEditSeriesContext } {
  return {
    shown: game.series != null || running.length > 0,
    context: {
      gameId: game.id,
      groupId: game.groupId,
      windowStart: game.windowStart,
      current: game.series,
      canChange: game.canChangeSeries,
      scoreLocked: game.seriesScoreLocked,
    },
  };
}

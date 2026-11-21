"use client";

import type { GameEditSeriesContext } from "~/components/games/game-edit-dialog";
import type { SeriesAttachOption } from "~/components/series/series-field";
import { useSeriesAttachOptions } from "~/components/series/use-series-attach-options";

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

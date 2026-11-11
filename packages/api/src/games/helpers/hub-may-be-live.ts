import type { DbClient } from "@repo/db";
import { and, gte, inArray, isNull, notInArray, or } from "drizzle-orm";

import { MatchStatusEnum, games, matches } from "@repo/db";

/**
 * A SQL superset of `isGameLive`, so hub lists stop loading every past Game:
 * the window has not ended (or ended within `endedWithinMs`), or a Match is
 * still to be played. The exact rule still runs in memory on what this keeps.
 */
export function hubGameMayBeLive(
  database: DbClient,
  now: Date,
  endedWithinMs = 0,
) {
  const liveMatchGameIds = database
    .select({ gameId: matches.gameId })
    .from(matches)
    .where(
      and(
        or(
          isNull(matches.status),
          notInArray(matches.status, [
            MatchStatusEnum.COMPLETED,
            MatchStatusEnum.CANCELLED,
          ]),
        ),
        or(isNull(matches.startTime), gte(matches.startTime, now)),
      ),
    );
  return or(
    isNull(games.windowEnd),
    gte(games.windowEnd, new Date(now.getTime() - endedWithinMs)),
    inArray(games.id, liveMatchGameIds),
  );
}

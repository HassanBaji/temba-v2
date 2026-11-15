import { and, eq } from "drizzle-orm";

import { MatchStatusEnum, matchDisputes } from "@repo/db";

import { gameRatingScope } from "@repo/domain/game-rating-scope";
import { MATCH_DISPUTE_DAYS } from "@repo/domain/match-dispute";

import { type db } from "#src/db";
import { type GameRow } from "#src/games/access";
import { userIsOnMatchSlots } from "#src/games/user-is-on-match-slots";
import { type MatchRow } from "#src/games/utils";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type MatchDisputeRefusal =
  | "not_counted"
  | "not_seated"
  | "not_completed"
  | "too_late"
  | "already_open";

export async function openMatchDisputeOf(database: DbClient, matchId: string) {
  return database.query.matchDisputes.findFirst({
    where: and(
      eq(matchDisputes.matchId, matchId),
      eq(matchDisputes.status, "open"),
    ),
    columns: { id: true, raisedByUserId: true, createdAt: true },
  });
}

/**
 * Why the User may not dispute the Match now, or `null` when they may: a
 * seated player of a completed Match that counted for Temba Level, within
 * seven days of its completion, while no other dispute on it is open. A Match
 * on an Unrated or tier Game, and a Public Game's score that stood without
 * the other side, never counted.
 */
export async function matchDisputeRefusal(
  database: DbClient,
  args: {
    game: Pick<GameRow, "rated" | "groupRated">;
    match: MatchRow;
    userId: string;
    now: Date;
  },
): Promise<MatchDisputeRefusal | null> {
  if (
    gameRatingScope(args.game) !== "temba" ||
    args.match.stoodUnconfirmedAt != null
  ) {
    return "not_counted";
  }
  if (!(await userIsOnMatchSlots(database, args.match, args.userId))) {
    return "not_seated";
  }
  if (
    args.match.status !== MatchStatusEnum.COMPLETED ||
    args.match.completedAt == null
  ) {
    return "not_completed";
  }
  if (
    args.now.getTime() - args.match.completedAt.getTime() >
    MATCH_DISPUTE_DAYS * MS_PER_DAY
  ) {
    return "too_late";
  }
  if (await openMatchDisputeOf(database, args.match.id)) {
    return "already_open";
  }
  return null;
}

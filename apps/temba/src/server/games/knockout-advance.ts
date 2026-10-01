import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { MatchStatusEnum, matches, matchSets } from "@repo/db";

import { knockoutFeeds } from "~/lib/tournament-knockout";
import { KNOCKOUT_DECIDING_SET_COPY } from "~/lib/tournament-knockout-view";
import { type db } from "~/server/db";
import { type MatchRow } from "~/server/games/utils";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

type MatchResult = "slot1" | "slot2" | "draw" | "none";

export const KNOCKOUT_LEVEL_MESSAGE = KNOCKOUT_DECIDING_SET_COPY;
export const KNOCKOUT_EMPTY_SIDE_MESSAGE =
  "This Knockout Match has an empty side. Sets open once both teams are in.";
export const KNOCKOUT_TAKE_BACK_REFUSED_MESSAGE =
  "The Match this result feeds has started, so this result can no longer be reversed";

export function isKnockoutMatch(match: Pick<MatchRow, "knockoutRound">) {
  return match.knockoutRound != null;
}

/** A Knockout Match must have a winner: level Sets are no result yet. */
export function knockoutMatchIsLevel(
  match: Pick<MatchRow, "knockoutRound">,
  result: MatchResult,
) {
  return isKnockoutMatch(match) && result === "draw";
}

export function assertKnockoutMatchHasBothSides(
  match: Pick<
    MatchRow,
    "knockoutRound" | "slot1GameTeamId" | "slot2GameTeamId"
  >,
) {
  if (
    isKnockoutMatch(match) &&
    (!match.slot1GameTeamId || !match.slot2GameTeamId)
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: KNOCKOUT_EMPTY_SIDE_MESSAGE,
    });
  }
}

async function lockFedMatch(database: DbClient, match: MatchRow) {
  if (match.knockoutRound == null || match.knockoutPosition == null) {
    return null;
  }
  const fed = knockoutFeeds(match.knockoutRound, match.knockoutPosition);
  const [row] = await database
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.gameId, match.gameId),
        eq(matches.knockoutRound, fed.round),
        eq(matches.knockoutPosition, fed.position),
      ),
    )
    .for("update");
  return row ? { row, slot: fed.slot } : null;
}

/**
 * Writes a completed Knockout Match's winner into the slot of the Match it
 * feeds. Runs inside the completion transaction, after the Match row lock,
 * so a duplicate completion never reaches it twice. The Final feeds nothing.
 */
export async function advanceKnockoutWinner(
  database: DbClient,
  match: MatchRow,
  result: MatchResult,
) {
  if (result !== "slot1" && result !== "slot2") {
    return;
  }
  const winnerGameTeamId =
    result === "slot1" ? match.slot1GameTeamId : match.slot2GameTeamId;
  const fed = await lockFedMatch(database, match);
  if (!fed || !winnerGameTeamId) {
    return;
  }
  await database
    .update(matches)
    .set(
      fed.slot === 1
        ? { slot1GameTeamId: winnerGameTeamId, updatedAt: new Date() }
        : { slot2GameTeamId: winnerGameTeamId, updatedAt: new Date() },
    )
    .where(eq(matches.id, fed.row.id));
}

/**
 * Takes a reopened Knockout Match's winner back out of the Match it feeds.
 * Refused once that Match has a Set or is settled, so a correction never
 * rewrites a Match already under way.
 */
export async function takeBackKnockoutWinner(
  database: DbClient,
  match: MatchRow,
) {
  const fed = await lockFedMatch(database, match);
  if (!fed) {
    return;
  }
  const settled =
    fed.row.status === MatchStatusEnum.COMPLETED ||
    fed.row.status === MatchStatusEnum.CANCELLED;
  const fedSet = await database.query.matchSets.findFirst({
    where: eq(matchSets.matchId, fed.row.id),
    columns: { id: true },
  });
  if (settled || fedSet) {
    throw new TRPCError({
      code: "CONFLICT",
      message: KNOCKOUT_TAKE_BACK_REFUSED_MESSAGE,
    });
  }
  await database
    .update(matches)
    .set(
      fed.slot === 1
        ? { slot1GameTeamId: null, updatedAt: new Date() }
        : { slot2GameTeamId: null, updatedAt: new Date() },
    )
    .where(eq(matches.id, fed.row.id));
}

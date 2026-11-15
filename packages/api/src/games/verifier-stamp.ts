import { and, eq } from "drizzle-orm";

import { MatchStatusEnum, matchSets, venueVerifiers } from "@repo/db";

import { matchOutcome } from "@repo/domain/match-outcome";

import { type db } from "#src/db";
import { canViewGame, type GameRow } from "#src/games/access";
import { knockoutMatchIsLevel } from "#src/games/knockout-advance";
import { publicGameConfirmWindowClosed } from "#src/games/match-result-confirmations";
import { userIsOnMatchSlots } from "#src/games/user-is-on-match-slots";
import { type MatchRow } from "#src/games/utils";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function isVerifierOfVenue(
  database: DbClient,
  venueId: string | null,
  userId: string,
): Promise<boolean> {
  if (!venueId) {
    return false;
  }
  const grant = await database.query.venueVerifiers.findFirst({
    where: and(
      eq(venueVerifiers.venueId, venueId),
      eq(venueVerifiers.userId, userId),
    ),
    columns: { id: true },
  });
  return Boolean(grant);
}

export type GameReach = "view" | "stamp_only";

/**
 * How far the User reaches into the Game's read doors: `view` for everyone
 * `canViewGame` admits, `stamp_only` for a Verifier of its Venue it does not
 * admit, who opens the Game to stamp its Matches (ADR-0072), `null` for
 * nobody else. Every write door keeps its own check.
 */
export async function gameReach(
  database: DbClient,
  game: GameRow,
  userId: string,
): Promise<GameReach | null> {
  if (await canViewGame(database, game, userId)) {
    return "view";
  }
  return (await isVerifierOfVenue(database, game.venueId, userId))
    ? "stamp_only"
    : null;
}

export type VerifierStampRefusal =
  | "not_verifier"
  | "seated"
  | "cancelled"
  | "completed"
  | "no_result"
  | "knockout_level";

/**
 * Why the User may not stamp the Match now, or `null` when they may
 * (ADR-0072): a Verifier of the Game's Venue who is not seated in the Match,
 * on a Match still waiting for its result to be agreed, with a score entered.
 */
export async function verifierStampRefusal(
  database: DbClient,
  args: { game: GameRow; match: MatchRow; userId: string },
): Promise<VerifierStampRefusal | null> {
  if (!(await isVerifierOfVenue(database, args.game.venueId, args.userId))) {
    return "not_verifier";
  }
  if (await userIsOnMatchSlots(database, args.match, args.userId)) {
    return "seated";
  }
  if (args.match.status === MatchStatusEnum.CANCELLED) {
    return "cancelled";
  }
  if (args.match.status === MatchStatusEnum.COMPLETED) {
    return "completed";
  }
  const sets = await database.query.matchSets.findMany({
    where: eq(matchSets.matchId, args.match.id),
    columns: { slot1GamesWon: true, slot2GamesWon: true },
  });
  const outcome = matchOutcome(sets);
  if (outcome.result === "none") {
    return "no_result";
  }
  if (knockoutMatchIsLevel(args.match, outcome.result)) {
    return "knockout_level";
  }
  return null;
}

/**
 * Whether the User may stamp the Match now: nothing refuses it, and on a
 * Public Game its 24-hour confirm window is still open (ADR-0071).
 */
export async function mayStampNow(
  database: DbClient,
  args: { game: GameRow; match: MatchRow; userId: string; now: Date },
): Promise<boolean> {
  if ((await verifierStampRefusal(database, args)) != null) {
    return false;
  }
  return !(await publicGameConfirmWindowClosed(
    database,
    args.game,
    args.match.id,
    args.now,
  ));
}

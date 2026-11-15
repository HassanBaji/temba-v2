import { eq } from "drizzle-orm";

import {
  MatchStatusEnum,
  gameMvpVotes,
  games,
  matchRatingWindows,
  matches,
} from "@repo/db";

import {
  mvpOutcome,
  mvpWindow,
  type MvpPick,
  type MvpQuestion,
  type MvpVote,
} from "@repo/domain/marks";

import { type db } from "#src/db";
import { gameAdminUserIds, type GameRow } from "#src/games/access";
import { type MatchRow } from "#src/games/utils";
import { enqueueAt, removeJob } from "#src/jobs/enqueue";
import { settleMvpJob, settleMvpJobKey } from "#src/jobs/specs";
import {
  loadMatchParticipants,
  marksMatch,
  type MatchParticipant,
} from "#src/marks/match-participants";
import { notify } from "#src/notifications/notify";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function storedPick(
  game: Pick<GameRow, "mvpUserId" | "mvpDecidedBy">,
): MvpPick | null {
  return game.mvpUserId && game.mvpDecidedBy
    ? { userId: game.mvpUserId, decidedBy: game.mvpDecidedBy }
    : null;
}

/**
 * The Game's MVP when a settled vote chose them. Only a voted MVP moves OVR
 * (ADR-0069); an Organizer's pick does not.
 */
export function votedMvpUserId(
  game:
    | Pick<GameRow, "mvpUserId" | "mvpDecidedBy" | "mvpSettledAt">
    | null
    | undefined,
) {
  return game?.mvpSettledAt && game.mvpDecidedBy === "vote"
    ? game.mvpUserId
    : null;
}

/**
 * The Match's Rating window, when it has one that a wrong score has not
 * suspended. The MVP closes with it (ADR-0068): the player's result card and
 * OVR's MVP part both need the MVP known when the window's move is written.
 */
async function ratingWindowOf(database: DbClient, matchId: string) {
  const window = await database.query.matchRatingWindows.findFirst({
    where: eq(matchRatingWindows.matchId, matchId),
    columns: {
      mode: true,
      closesAt: true,
      settledAt: true,
      suspendedAt: true,
    },
  });
  return window && window.mode !== "off" && !window.suspendedAt ? window : null;
}

async function gameMvpWindow(
  database: DbClient,
  match: Pick<MatchRow, "id" | "status" | "completedAt"> | null,
  now: Date,
) {
  return match?.status === MatchStatusEnum.COMPLETED
    ? mvpWindow(
        match.completedAt,
        now,
        await ratingWindowOf(database, match.id),
      )
    : null;
}

/** A Game's MVP question on its Match, judged by the server clock at `now`. */
export async function mvpQuestion(
  database: DbClient,
  args: {
    game: Pick<GameRow, "id" | "mvpMode" | "mvpUserId" | "mvpDecidedBy">;
    match: MatchRow | null;
    participants: MatchParticipant[];
    now: Date;
  },
): Promise<MvpQuestion> {
  const votes: MvpVote[] =
    args.game.mvpMode === "vote"
      ? await database
          .select({
            voterUserId: gameMvpVotes.voterUserId,
            candidateUserId: gameMvpVotes.candidateUserId,
          })
          .from(gameMvpVotes)
          .where(eq(gameMvpVotes.gameId, args.game.id))
      : [];
  return {
    mode: args.game.mvpMode,
    window: await gameMvpWindow(database, args.match, args.now),
    participants: args.participants,
    votes,
    pick: storedPick(args.game),
  };
}

/**
 * Settles a Game's MVP once the question is final: writes the decision and
 * `mvp_settled_at`, and tells the players who won. A vote that tied while the
 * window is open asks the Organizers instead, once. Idempotent on
 * `mvp_settled_at`, so the Job, the vote, the tie-break and the read door may
 * all call it. Locks the Match row, then the Game row, like the other doors.
 * Returns whether this call settled it.
 */
export async function settleMvp(
  tx: DbClient,
  gameId: string,
  now: Date,
): Promise<boolean> {
  const game = await tx.query.games.findFirst({ where: eq(games.id, gameId) });
  if (!game || game.mvpMode === "none") {
    return false;
  }
  const match = await marksMatch(tx, game);
  if (!match) {
    return false;
  }
  const [lockedMatch] = await tx
    .select()
    .from(matches)
    .where(eq(matches.id, match.id))
    .for("update");
  const [current] = await tx
    .select()
    .from(games)
    .where(eq(games.id, gameId))
    .for("update");
  if (!lockedMatch || !current || current.mvpSettledAt) {
    return false;
  }

  const participants = await loadMatchParticipants(tx, lockedMatch, current);
  const outcome = mvpOutcome(
    await mvpQuestion(tx, {
      game: current,
      match: lockedMatch,
      participants,
      now,
    }),
  );

  if (outcome.state === "tie") {
    const adminIds = await gameAdminUserIds(tx, current);
    await notify(tx, {
      type: "mvp_tie_break",
      recipients: adminIds.map((userId) => ({ userId, audience: "admin" })),
      excludeUserIds: [],
      groupId: current.groupId,
      gameId: current.id,
      dedupeKey: `mvp_tie_break:${current.id}`,
    });
    return false;
  }
  if (!outcome.final) {
    return false;
  }

  const keepsPick =
    outcome.userId !== null &&
    current.mvpUserId === outcome.userId &&
    current.mvpDecidedBy === outcome.decidedBy;
  await tx
    .update(games)
    .set({
      mvpUserId: outcome.userId,
      mvpDecidedBy: outcome.decidedBy,
      mvpDecidedAt: keepsPick
        ? current.mvpDecidedAt
        : outcome.userId
          ? now
          : null,
      mvpSettledAt: now,
    })
    .where(eq(games.id, current.id));

  if (outcome.userId) {
    await notify(tx, {
      type: "mvp_decided",
      recipients: participants.map((participant) => ({
        userId: participant.userId,
        audience: "player",
      })),
      excludeUserIds: [],
      actorUserId: outcome.userId,
      groupId: current.groupId,
      gameId: current.id,
      dedupeKey: `mvp_decided:${current.id}`,
    });
  }
  return true;
}

/**
 * The read-time fallback for a late or failed Job: once the MVP's window has
 * closed, a read settles the MVP so nobody sees "pending" past the close.
 */
export async function settleMvpIfDue(
  database: DbClient,
  game: Pick<GameRow, "id" | "mvpMode" | "mvpSettledAt">,
  match: MatchRow | null,
  now: Date,
): Promise<boolean> {
  if (
    game.mvpMode === "none" ||
    game.mvpSettledAt ||
    (await gameMvpWindow(database, match, now))?.state !== "closed"
  ) {
    return false;
  }
  return database.transaction((tx) => settleMvp(tx, game.id, now));
}

/**
 * Called by both completion paths, after the Match's Rating window has
 * opened if it has one: the Job settles the MVP when its window closes. A
 * Match completing again after a wrong score may find that everyone has
 * already voted, and then the vote settles at once as it would have.
 */
export async function scheduleMvpSettle(
  tx: DbClient,
  args: { gameId: string; matchId: string; completedAt: Date },
): Promise<void> {
  const game = await tx.query.games.findFirst({
    where: eq(games.id, args.gameId),
    columns: { format: true, mvpMode: true },
  });
  if (game?.format !== "friendly_game" || game.mvpMode === "none") {
    return;
  }
  const window = mvpWindow(
    args.completedAt,
    args.completedAt,
    await ratingWindowOf(tx, args.matchId),
  );
  if (!window) {
    return;
  }
  if (await settleMvp(tx, args.gameId, args.completedAt)) {
    return;
  }
  await enqueueAt(tx, settleMvpJob(args.gameId), window.closesAt);
}

/**
 * A wrong-score report suspends the window: the decision and its settlement
 * are cleared and the Job removed. Votes stay for when the Match completes again.
 */
export async function suspendMvp(
  tx: DbClient,
  game: Pick<GameRow, "id" | "format">,
): Promise<void> {
  if (game.format !== "friendly_game") {
    return;
  }
  await tx
    .update(games)
    .set({
      mvpUserId: null,
      mvpDecidedBy: null,
      mvpDecidedAt: null,
      mvpSettledAt: null,
    })
    .where(eq(games.id, game.id));
  await removeJob(tx, settleMvpJobKey(game.id));
}

import { eq } from "drizzle-orm";

import { MatchStatusEnum, gameMvpVotes, games, matches } from "@repo/db";

import {
  marksWindow,
  mvpOutcome,
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
    window:
      args.match?.status === MatchStatusEnum.COMPLETED
        ? marksWindow(args.match.completedAt, args.now)
        : null,
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
 * The read-time fallback for a late or failed Job: once the window has closed,
 * a read settles the MVP so nobody sees "pending" past the close.
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
    match?.status !== MatchStatusEnum.COMPLETED ||
    marksWindow(match.completedAt, now)?.state !== "closed"
  ) {
    return false;
  }
  return database.transaction((tx) => settleMvp(tx, game.id, now));
}

/**
 * Called by both completion paths: the Job settles the MVP when the window
 * closes. A Match completing again after a wrong score may find that everyone
 * has already voted, and then the vote settles at once as it would have.
 */
export async function scheduleMvpSettle(
  tx: DbClient,
  gameId: string,
  completedAt: Date,
): Promise<void> {
  const game = await tx.query.games.findFirst({
    where: eq(games.id, gameId),
    columns: { format: true, mvpMode: true },
  });
  const window = marksWindow(completedAt, completedAt);
  if (
    !game ||
    !window ||
    game.format !== "friendly_game" ||
    game.mvpMode === "none"
  ) {
    return;
  }
  if (await settleMvp(tx, gameId, completedAt)) {
    return;
  }
  await enqueueAt(tx, settleMvpJob(gameId), window.closesAt);
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

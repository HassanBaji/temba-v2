import { createHash } from "node:crypto";

import type { DbClient, DbTx } from "@repo/db";
import type { FootballDraftAnswer } from "@repo/domain/football-lineup";

import { gameAdminUserIds, type GameRow } from "#src/games/access";
import { notify } from "#src/notifications/notify";

type DbOrTx = DbClient | DbTx;

/** A side as it stands, short enough for a dedupe key. */
function sideKey(gamePlayerIds: readonly string[]) {
  return createHash("sha256")
    .update([...gamePlayerIds].sort().join(","))
    .digest("hex")
    .slice(0, 32);
}

/**
 * Side captains first named on a saved Draft line-up hear, once per draft,
 * except the Organizer who saved it (ADR-0108).
 */
export async function notifyFootballDraftShared(
  database: DbOrTx,
  args: {
    gameId: string;
    draftId: string;
    sideCaptainUserIds: string[];
    savedBy: string;
  },
) {
  return notify(database, {
    type: "football_draft_shared",
    recipients: args.sideCaptainUserIds.map((userId) => ({
      userId,
      audience: "player",
    })),
    excludeUserIds: [args.savedBy],
    actorUserId: args.savedBy,
    gameId: args.gameId,
    dedupeKey: `football_draft_shared:${args.draftId}`,
  });
}

/**
 * A save changed the side of Side captains who had answered: they hear, so
 * they look again. Each save is its own event.
 */
export async function notifyFootballDraftChanged(
  database: DbOrTx,
  args: {
    gameId: string;
    draftId: string;
    sideCaptainUserIds: string[];
    savedBy: string;
    savedAt: Date;
  },
) {
  return notify(database, {
    type: "football_draft_changed",
    recipients: args.sideCaptainUserIds.map((userId) => ({
      userId,
      audience: "player",
    })),
    excludeUserIds: [args.savedBy],
    actorUserId: args.savedBy,
    gameId: args.gameId,
    dedupeKey: `football_draft_changed:${args.draftId}:${args.savedAt.getTime()}`,
  });
}

/**
 * A Side captain approved their side or asked for a change: the Game admins
 * hear, except the captain, once per answer for the side as it stands.
 */
export async function notifyFootballDraftAnswered(
  database: DbOrTx,
  args: {
    game: GameRow;
    draftId: string;
    sideIndex: 1 | 2;
    sideGamePlayerIds: readonly string[];
    answer: FootballDraftAnswer;
    sideCaptainUserId: string;
  },
) {
  const type =
    args.answer === "approved"
      ? "football_draft_approved"
      : "football_draft_change_asked";
  const admins = await gameAdminUserIds(database, args.game);
  return notify(database, {
    type,
    recipients: admins.map((userId) => ({ userId, audience: "admin" })),
    excludeUserIds: [args.sideCaptainUserId],
    actorUserId: args.sideCaptainUserId,
    gameId: args.game.id,
    dedupeKey: `${type}:${args.draftId}:${args.sideIndex}:${sideKey(args.sideGamePlayerIds)}`,
  });
}

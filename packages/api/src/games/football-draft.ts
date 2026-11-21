import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";

import {
  footballLineupDraftPlayers,
  footballLineupDrafts,
  gamePlayers,
  user,
} from "@repo/db";
import { isFootballGame } from "@repo/domain/game-shape";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { type db } from "#src/db";
import {
  isGameOrganizer,
  requireNotChallengeGame,
  type GameRow,
} from "#src/games/access";
import {
  assertFootballGame,
  assertGameNotCancelled,
  footballMatch,
  footballSides,
} from "#src/games/football-lineup";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The Football sides are published: both sides and the one Match exist. */
export async function footballTeamsPublished(
  database: DbClient,
  gameId: string,
) {
  const sides = await footballSides(database, gameId);
  return (
    sides.slot1 != null &&
    sides.slot2 != null &&
    (await footballMatch(database, gameId)) != null
  );
}

/**
 * The guards every Draft line-up door shares: a football Friendly game that
 * is not a Challenge Game, not cancelled, and whose teams are not published.
 */
export async function assertFootballDraftOpen(
  database: DbClient,
  game: GameRow,
  locale: Locale = DEFAULT_LOCALE,
) {
  requireNotChallengeGame(game, locale);
  assertFootballGame(game, locale);
  assertGameNotCancelled(game, locale);
  if (await footballTeamsPublished(database, game.id)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).football.errors.draftTeamsPublished,
    });
  }
}

/** Who may see a Game's Draft line-up: its Organizers (ADR-0107). */
export async function mayViewFootballDraft(
  database: DbClient,
  game: GameRow,
  userId: string,
) {
  if (
    game.challengeId ||
    game.cancelledAt ||
    !isFootballGame(game) ||
    game.format !== "friendly_game"
  ) {
    return false;
  }
  return isGameOrganizer(database, game, userId);
}

/**
 * A Game's Draft line-up with each side's players by User, in roster order.
 * Null when there is none, and for a viewer who may not see it: every read
 * of a draft goes through here. `lock` holds the draft row until the
 * transaction ends.
 */
export async function loadFootballDraft(
  database: DbClient,
  game: GameRow,
  viewerUserId: string,
  options: { lock?: boolean } = {},
) {
  if (!(await mayViewFootballDraft(database, game, viewerUserId))) {
    return null;
  }
  const query = database
    .select()
    .from(footballLineupDrafts)
    .where(eq(footballLineupDrafts.gameId, game.id));
  const [row] = options.lock ? await query.for("update") : await query;
  if (!row) {
    return null;
  }
  const placements = await database
    .select({
      sideIndex: footballLineupDraftPlayers.sideIndex,
      userId: gamePlayers.userId,
    })
    .from(footballLineupDraftPlayers)
    .innerJoin(
      gamePlayers,
      eq(gamePlayers.id, footballLineupDraftPlayers.gamePlayerId),
    )
    .where(eq(footballLineupDraftPlayers.draftId, row.id))
    .orderBy(asc(gamePlayers.createdAt), asc(gamePlayers.id));
  const savedBy = await database.query.user.findFirst({
    where: eq(user.id, row.savedBy),
    columns: { name: true },
  });
  const side = (index: 1 | 2) =>
    placements.flatMap((placement) =>
      placement.sideIndex === index && placement.userId
        ? [placement.userId]
        : [],
    );
  return {
    id: row.id,
    updatedAt: row.updatedAt,
    savedAt: row.savedAt,
    savedByName: savedBy?.name ?? "",
    method: row.method,
    bibs: { slot1: row.slot1Bib, slot2: row.slot2Bib },
    sides: { slot1: side(1), slot2: side(2) },
  };
}

/**
 * A save or a publish names the draft it was made from. One that names a
 * draft since changed, or gone, is refused so two Organizers do not
 * overwrite each other.
 */
export function assertFootballDraftCurrent(
  draft: { updatedAt: Date } | null,
  draftUpdatedAt: Date | undefined,
  locale: Locale = DEFAULT_LOCALE,
) {
  if (!draftUpdatedAt) {
    return;
  }
  if (!draft || draft.updatedAt.getTime() > draftUpdatedAt.getTime()) {
    throw new TRPCError({
      code: "CONFLICT",
      message: messagesFor(locale).football.errors.draftChanged,
    });
  }
}

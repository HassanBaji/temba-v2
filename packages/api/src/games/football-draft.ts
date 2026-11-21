import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray } from "drizzle-orm";

import {
  footballLineupDraftAnswers,
  footballLineupDraftPlayers,
  footballLineupDrafts,
  gamePlayers,
  user,
} from "@repo/db";
import type { SideCaptains } from "@repo/domain/football-board";
import { captainAnswerState } from "@repo/domain/football-draft";
import type { FootballPickStatus } from "@repo/domain/football-lineup";
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

/**
 * A Captain pick runs while it waits or is live with both Side captains on
 * their sides. One that lost a captain, who left or was kicked, has
 * stopped (ADR-0109), though only a read of the Pick room clears it.
 */
export function footballPickRunning(
  pickStatus: FootballPickStatus | null,
  captains: SideCaptains,
) {
  return (
    (pickStatus === "waiting" || pickStatus === "live") &&
    captains.slot1 != null &&
    captains.slot2 != null
  );
}

/**
 * A Game's Draft line-up with each side's players by User, in roster order,
 * its Side captains and their answers. Null when there is none, and for a
 * viewer who may not see it: only the Game's Organizers and the draft's Side
 * captains do (ADR-0107, ADR-0108). Every read of a draft goes through here.
 * A note goes to the Organizers and to the captain who wrote it. `lock`
 * holds the draft row until the transaction ends.
 */
export async function loadFootballDraft(
  database: DbClient,
  game: GameRow,
  viewerUserId: string,
  options: { lock?: boolean } = {},
) {
  if (
    game.challengeId ||
    game.cancelledAt ||
    !isFootballGame(game) ||
    game.format !== "friendly_game"
  ) {
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
      gamePlayerId: footballLineupDraftPlayers.gamePlayerId,
      userId: gamePlayers.userId,
    })
    .from(footballLineupDraftPlayers)
    .innerJoin(
      gamePlayers,
      eq(gamePlayers.id, footballLineupDraftPlayers.gamePlayerId),
    )
    .where(eq(footballLineupDraftPlayers.draftId, row.id))
    .orderBy(asc(gamePlayers.createdAt), asc(gamePlayers.id));
  const captainOn = (index: 1 | 2, gamePlayerId: string | null) =>
    placements.find(
      (placement) =>
        placement.sideIndex === index &&
        placement.gamePlayerId === gamePlayerId,
    )?.userId ?? null;
  const captains = {
    slot1: captainOn(1, row.slot1CaptainGamePlayerId),
    slot2: captainOn(2, row.slot2CaptainGamePlayerId),
  };
  const organizer = await isGameOrganizer(database, game, viewerUserId);
  const sideCaptainOf =
    captains.slot1 === viewerUserId
      ? (1 as const)
      : captains.slot2 === viewerUserId
        ? (2 as const)
        : null;
  if (!organizer && sideCaptainOf == null) {
    return null;
  }

  const savedBy = await database.query.user.findFirst({
    where: eq(user.id, row.savedBy),
    columns: { name: true },
  });
  const answerRows = await database.query.footballLineupDraftAnswers.findMany({
    where: eq(footballLineupDraftAnswers.draftId, row.id),
  });
  const side = (index: 1 | 2) =>
    placements.flatMap((placement) =>
      placement.sideIndex === index && placement.userId
        ? [placement.userId]
        : [],
    );
  const sideGamePlayerIds = (index: 1 | 2) =>
    placements.flatMap((placement) =>
      placement.sideIndex === index ? [placement.gamePlayerId] : [],
    );
  const answerOf = async (index: 1 | 2) => {
    const captain = index === 1 ? captains.slot1 : captains.slot2;
    const answer =
      answerRows.find(
        (answerRow) =>
          answerRow.sideIndex === index && answerRow.captainUserId === captain,
      ) ?? null;
    const state = captainAnswerState(
      answer,
      sideGamePlayerIds(index),
      captain
        ? { isOrganizer: await isGameOrganizer(database, game, captain) }
        : null,
    );
    const counts =
      answer != null && (state === "approved" || state === "change_asked");
    return {
      state,
      answeredAt: counts ? answer.answeredAt : null,
      note:
        counts && (organizer || answer.captainUserId === viewerUserId)
          ? answer.note
          : null,
    };
  };
  const running = footballPickRunning(row.pickStatus, captains);
  const stopped =
    row.pickStatus != null && row.pickStatus !== "done" && !running;
  return {
    id: row.id,
    updatedAt: row.updatedAt,
    savedAt: row.savedAt,
    savedByName: savedBy?.name ?? "",
    method: stopped ? ("manual" as const) : row.method,
    bibs: { slot1: row.slot1Bib, slot2: row.slot2Bib },
    sides: { slot1: side(1), slot2: side(2) },
    sideGamePlayerIds: {
      slot1: sideGamePlayerIds(1),
      slot2: sideGamePlayerIds(2),
    },
    captains,
    answers: { slot1: await answerOf(1), slot2: await answerOf(2) },
    pick:
      running || row.pickStatus === "done"
        ? {
            status: row.pickStatus!,
            firstPick: row.firstPick,
            firstPickSide: row.firstPickSide,
          }
        : null,
    viewer: { organizer, sideCaptainOf },
  };
}

/** Save draft and a Captain's answer wait while a Captain pick runs. */
export function assertFootballPickNotRunning(
  draft: { pick: { status: FootballPickStatus } | null } | null,
  locale: Locale = DEFAULT_LOCALE,
) {
  if (draft?.pick && draft.pick.status !== "done") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).football.errors.pickRunning,
    });
  }
}

/**
 * Ends a Captain pick that waits or is live, as Stop the pick does: the
 * draft keeps its sides and Side captains and becomes a Manual one.
 */
export async function clearFootballPick(
  database: DbClient,
  draftId: string,
  now: Date,
) {
  await database
    .update(footballLineupDrafts)
    .set({
      method: "manual",
      pickStatus: null,
      firstPick: null,
      firstPickSide: null,
      slot1CaptainSeenAt: null,
      slot2CaptainSeenAt: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(footballLineupDrafts.id, draftId),
        inArray(footballLineupDrafts.pickStatus, ["waiting", "live"]),
      ),
    );
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

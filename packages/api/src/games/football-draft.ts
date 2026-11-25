import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray } from "drizzle-orm";

import {
  footballLineupDraftAnswers,
  footballLineupDraftPlayers,
  footballLineupDrafts,
  gamePlayers,
  user,
} from "@repo/db";
import {
  ofSide,
  type Side,
  type SideCaptains,
} from "@repo/domain/football-board";
import type { FootballDraftAnswerState } from "@repo/domain/football-draft";
import type {
  FootballDraftAnswer,
  FootballPickStatus,
} from "@repo/domain/football-lineup";
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
import { notifyFootballPickDone } from "#src/notifications/notify-football-draft";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";

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
 * Only a football Friendly game that is not a Challenge Game has a Draft
 * line-up.
 */
export function mayHaveFootballDraft(game: GameRow) {
  return (
    !game.challengeId && isFootballGame(game) && game.format === "friendly_game"
  );
}

/** The side a User captains, or null when they captain neither. */
export function sideCaptainOf(
  captains: SideCaptains,
  userId: string,
): Side | null {
  return captains.slot1 === userId ? 1 : captains.slot2 === userId ? 2 : null;
}

export function samePlayers(a: readonly string[], b: readonly string[]) {
  const set = new Set(a);
  return set.size === new Set(b).size && b.every((id) => set.has(id));
}

/**
 * A side's Captain's answer as it reads now. Nobody to ask without a Side
 * captain, or when the captain is an Organizer of the Game. An answer counts
 * only for the exact players it was given for; otherwise the side waits.
 */
export function captainAnswerState(
  answer: {
    answer: FootballDraftAnswer;
    answeredPlayerIds: readonly string[];
  } | null,
  sidePlayerIds: readonly string[],
  sideCaptain: { isOrganizer: boolean } | null,
): FootballDraftAnswerState {
  if (!sideCaptain || sideCaptain.isOrganizer) {
    return "none";
  }
  if (!answer || !samePlayers(answer.answeredPlayerIds, sidePlayerIds)) {
    return "waiting";
  }
  return answer.answer;
}

/**
 * The Game's roster as the doors that write sides read it: each registered
 * User's Game player, and the Users with an account, who alone may be a Side
 * captain (ADR-0108).
 */
export async function footballDraftRoster(database: DbClient, gameId: string) {
  const roster = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.gameId, gameId),
    columns: { id: true, userId: true },
    with: {
      user: { columns: { clerkId: true, addedAt: true, guestAt: true } },
    },
  });
  const registered = roster.flatMap((row) =>
    row.userId ? [{ userId: row.userId, gamePlayerId: row.id }] : [],
  );
  return {
    registeredUserIds: registered.map((row) => row.userId),
    gamePlayerIdByUser: new Map(
      registered.map((row) => [row.userId, row.gamePlayerId]),
    ),
    userByGamePlayerId: new Map(
      registered.map((row) => [row.gamePlayerId, row.userId]),
    ),
    accountUserIds: roster.flatMap((row) =>
      row.userId && row.user?.guestAt === null && !isUnclaimed(row.user)
        ? [row.userId]
        : [],
    ),
  };
}

function firstPickSideOf(value: number | null): Side | null {
  return value === 1 || value === 2 ? value : null;
}

/**
 * A Game's Draft line-up without its Captain's answers: each side's
 * placements in roster order, its Side captains, and the Captain pick with
 * each captain's last-seen time. Null when there is none, and for a viewer
 * who may not see it: only the Game's Organizers and the draft's Side
 * captains do (ADR-0107, ADR-0108). Every read of a draft goes through here.
 * It reads a cancelled Game's draft too, so the Pick room can tell its Side
 * captains the Game is cancelled. `pickLostCaptain` marks a pick that
 * stopped by losing a Side captain and is not cleared yet. `lock` holds the
 * draft row until the transaction ends.
 */
export async function loadFootballDraftSides(
  database: DbClient,
  game: GameRow,
  viewerUserId: string,
  options: { lock?: boolean } = {},
) {
  if (!mayHaveFootballDraft(game)) {
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
      pickNumber: footballLineupDraftPlayers.pickNumber,
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
  const viewerSide = sideCaptainOf(captains, viewerUserId);
  if (!organizer && viewerSide == null) {
    return null;
  }

  const side = (index: Side) =>
    placements.flatMap((placement) =>
      placement.sideIndex === index && placement.userId
        ? [placement.userId]
        : [],
    );
  const sideGamePlayerIds = (index: Side) =>
    placements.flatMap((placement) =>
      placement.sideIndex === index ? [placement.gamePlayerId] : [],
    );
  const running = footballPickRunning(row.pickStatus, captains);
  const pickLostCaptain =
    row.pickStatus != null && row.pickStatus !== "done" && !running;
  return {
    id: row.id,
    updatedAt: row.updatedAt,
    savedAt: row.savedAt,
    savedBy: row.savedBy,
    method: pickLostCaptain ? ("manual" as const) : row.method,
    bibs: { slot1: row.slot1Bib, slot2: row.slot2Bib },
    placements,
    sides: { slot1: side(1), slot2: side(2) },
    sideGamePlayerIds: {
      slot1: sideGamePlayerIds(1),
      slot2: sideGamePlayerIds(2),
    },
    captains,
    captainSeenAt: {
      slot1: row.slot1CaptainSeenAt,
      slot2: row.slot2CaptainSeenAt,
    },
    pick:
      running || row.pickStatus === "done"
        ? {
            status: row.pickStatus!,
            firstPick: row.firstPick,
            firstPickSide: firstPickSideOf(row.firstPickSide),
          }
        : null,
    pickLostCaptain,
    viewer: { organizer, sideCaptainOf: viewerSide },
  };
}

/**
 * A Game's Draft line-up as `loadFootballDraftSides` reads it, with who
 * saved it and each side's Captain's answer. Null for a cancelled Game too.
 * A note goes to the Organizers and to the captain who wrote it.
 */
export async function loadFootballDraft(
  database: DbClient,
  game: GameRow,
  viewerUserId: string,
  options: { lock?: boolean } = {},
) {
  if (game.cancelledAt) {
    return null;
  }
  const draft = await loadFootballDraftSides(
    database,
    game,
    viewerUserId,
    options,
  );
  if (!draft) {
    return null;
  }
  const savedBy = await database.query.user.findFirst({
    where: eq(user.id, draft.savedBy),
    columns: { name: true },
  });
  const answerRows = await database.query.footballLineupDraftAnswers.findMany({
    where: eq(footballLineupDraftAnswers.draftId, draft.id),
  });
  const answerOf = async (index: Side) => {
    const captain = ofSide(draft.captains, index);
    const answer =
      answerRows.find(
        (answerRow) =>
          answerRow.sideIndex === index && answerRow.captainUserId === captain,
      ) ?? null;
    const state = captainAnswerState(
      answer,
      ofSide(draft.sideGamePlayerIds, index),
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
        counts &&
        (draft.viewer.organizer || answer.captainUserId === viewerUserId)
          ? answer.note
          : null,
    };
  };
  return {
    ...draft,
    savedByName: savedBy?.name ?? "",
    answers: { slot1: await answerOf(1), slot2: await answerOf(2) },
  };
}

/**
 * Where a Captain pick stands: who is still to be picked, in roster order,
 * how many picks were made and the number the next one takes.
 */
export async function footballPickProgress(
  database: DbClient,
  gameId: string,
  draft: {
    placements: readonly { gamePlayerId: string; pickNumber: number | null }[];
  },
) {
  const roster = await database
    .select({ id: gamePlayers.id, userId: gamePlayers.userId })
    .from(gamePlayers)
    .where(eq(gamePlayers.gameId, gameId))
    .orderBy(asc(gamePlayers.createdAt), asc(gamePlayers.id));
  const placed = new Set(
    draft.placements.map((placement) => placement.gamePlayerId),
  );
  const pickNumbers = draft.placements.flatMap((placement) =>
    placement.pickNumber == null ? [] : [placement.pickNumber],
  );
  return {
    pool: roster.flatMap((row) =>
      row.userId && !placed.has(row.id)
        ? [{ gamePlayerId: row.id, userId: row.userId }]
        : [],
    ),
    made: pickNumbers.length,
    next: Math.max(0, ...pickNumbers) + 1,
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
 * Finishes a live Captain pick whose pool is empty: the draft is saved with
 * both Captain's answers approved for the sides as they stand, and the Game
 * admins hear once (ADR-0109). `pickedBy` is null when the pool emptied
 * because its last player left, not by a pick.
 */
export async function finishFootballPick(
  database: DbClient,
  args: {
    game: GameRow;
    draftId: string;
    openedAt: Date;
    captains: { slot1: string | null; slot2: string | null };
    sideGamePlayerIds: { slot1: string[]; slot2: string[] };
    pickedBy: string | null;
    now: Date;
  },
) {
  await database
    .update(footballLineupDrafts)
    .set({ pickStatus: "done", savedAt: args.now, updatedAt: args.now })
    .where(eq(footballLineupDrafts.id, args.draftId));
  const answers = ([1, 2] as const).flatMap((side) => {
    const captainUserId = ofSide(args.captains, side);
    return captainUserId
      ? [
          {
            draftId: args.draftId,
            sideIndex: side,
            captainUserId,
            answer: "approved" as const,
            note: null,
            answeredPlayerIds: ofSide(args.sideGamePlayerIds, side),
            answeredAt: args.now,
          },
        ]
      : [];
  });
  await database
    .delete(footballLineupDraftAnswers)
    .where(eq(footballLineupDraftAnswers.draftId, args.draftId));
  if (answers.length > 0) {
    await database.insert(footballLineupDraftAnswers).values(answers);
  }
  await notifyFootballPickDone(database, {
    game: args.game,
    draftId: args.draftId,
    openedAt: args.openedAt,
    pickedBy: args.pickedBy,
  });
}

/**
 * A save or a publish names the draft it was made from, or says with
 * `null` that there was none. One that names a draft since changed, or
 * gone, or that saw none where there is one now, is refused so two
 * Organizers do not overwrite each other. Leaving it out skips the check.
 */
export function assertFootballDraftCurrent(
  draft: { updatedAt: Date } | null,
  draftUpdatedAt: Date | null | undefined,
  locale: Locale = DEFAULT_LOCALE,
) {
  if (draftUpdatedAt === undefined) {
    return;
  }
  const current =
    draftUpdatedAt === null
      ? draft === null
      : draft != null && draft.updatedAt.getTime() <= draftUpdatedAt.getTime();
  if (!current) {
    throw new TRPCError({
      code: "CONFLICT",
      message: messagesFor(locale).football.errors.draftChanged,
    });
  }
}

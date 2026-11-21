import { TRPCError } from "@trpc/server";
import { and, asc, eq, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";

import {
  footballLineupDraftPlayers,
  footballLineupDrafts,
  gamePlayers,
} from "@repo/db";
import type { Side } from "@repo/domain/football-board";
import { firstPickSide } from "@repo/domain/football-captain-pick";
import { PICK_ROOM_PRESENCE_MS } from "@repo/domain/football-lineup";
import { isFootballGame } from "@repo/domain/game-shape";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isGameOrganizer, requireGame } from "#src/games/access";
import {
  clearFootballPick,
  footballPickRunning,
} from "#src/games/football-draft";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

type DraftRow = typeof footballLineupDrafts.$inferSelect;

/** How stale a Side captain's last-seen time may get before a read writes it again. */
const PRESENCE_WRITE_EVERY_MS = 3_000;

function seenAtOf(draft: DraftRow, side: Side) {
  return side === 1 ? draft.slot1CaptainSeenAt : draft.slot2CaptainSeenAt;
}

function inRoom(seenAt: Date | null, now: Date) {
  return (
    seenAt != null && now.getTime() - seenAt.getTime() <= PICK_ROOM_PRESENCE_MS
  );
}

function asSide(value: number | null): Side | null {
  return value === 1 || value === 2 ? value : null;
}

/**
 * Marks the calling Side captain as in the room, writing at most once every
 * three seconds.
 */
async function recordPresence(
  database: DbClient,
  draft: DraftRow,
  side: Side,
  now: Date,
) {
  const column =
    side === 1
      ? footballLineupDrafts.slot1CaptainSeenAt
      : footballLineupDrafts.slot2CaptainSeenAt;
  const seenAt = seenAtOf(draft, side);
  if (
    seenAt != null &&
    now.getTime() - seenAt.getTime() < PRESENCE_WRITE_EVERY_MS
  ) {
    return draft;
  }
  await database
    .update(footballLineupDrafts)
    .set(side === 1 ? { slot1CaptainSeenAt: now } : { slot2CaptainSeenAt: now })
    .where(
      and(
        eq(footballLineupDrafts.id, draft.id),
        or(
          isNull(column),
          lte(column, new Date(now.getTime() - PRESENCE_WRITE_EVERY_MS)),
        ),
      ),
    );
  return side === 1
    ? { ...draft, slot1CaptainSeenAt: now }
    : { ...draft, slot2CaptainSeenAt: now };
}

/**
 * Starts a waiting pick once both Side captains are in the room, under the
 * draft row's lock so concurrent reads start it once: the toss, when the
 * first pick is one, is made here and only here.
 */
async function startWhenBothIn(
  database: DbClient,
  draftId: string,
  now: Date,
  random: () => number,
) {
  return database.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(footballLineupDrafts)
      .where(eq(footballLineupDrafts.id, draftId))
      .for("update");
    if (
      locked?.pickStatus !== "waiting" ||
      !inRoom(locked.slot1CaptainSeenAt, now) ||
      !inRoom(locked.slot2CaptainSeenAt, now)
    ) {
      return locked;
    }
    const [live] = await tx
      .update(footballLineupDrafts)
      .set({
        pickStatus: "live",
        firstPickSide: firstPickSide(locked.firstPick ?? "toss", random),
        updatedAt: now,
      })
      .where(eq(footballLineupDrafts.id, draftId))
      .returning();
    return live;
  });
}

/**
 * The Pick room, read every two seconds by the Organizers of the Game and
 * the two Side captains of the pick (ADR-0109); anyone else is told it is
 * not found. A pick that ended, was stopped or lost a Side captain reads
 * stopped, and a pick that lost a captain is cleared here as Stop the pick
 * clears it. Reading records the calling captain's presence and starts the
 * pick, toss included, on the read that finds both captains in the room.
 *
 * User ids only, and no ratings: names, positions, OVR and Group Tier come
 * from `games.footballBoard` under its rules.
 */
export async function footballPickRoom(
  database: DbClient,
  args: { gameId: string; userId: string; locale?: Locale },
  now: Date = new Date(),
  random: () => number = Math.random,
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const notFound = () =>
    new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).game.errors.notFound,
    });
  const game = await requireGame(database, args.gameId, locale);
  if (
    game.challengeId ||
    !isFootballGame(game) ||
    game.format !== "friendly_game"
  ) {
    throw notFound();
  }
  const organizer = await isGameOrganizer(database, game, args.userId);
  const [found] = await database
    .select()
    .from(footballLineupDrafts)
    .where(eq(footballLineupDrafts.gameId, game.id));
  const roster = await database
    .select({ id: gamePlayers.id, userId: gamePlayers.userId })
    .from(gamePlayers)
    .where(eq(gamePlayers.gameId, game.id))
    .orderBy(asc(gamePlayers.createdAt), asc(gamePlayers.id));
  const placements = found
    ? await database
        .select({
          gamePlayerId: footballLineupDraftPlayers.gamePlayerId,
          sideIndex: footballLineupDraftPlayers.sideIndex,
          pickNumber: footballLineupDraftPlayers.pickNumber,
        })
        .from(footballLineupDraftPlayers)
        .where(eq(footballLineupDraftPlayers.draftId, found.id))
    : [];

  const userByGamePlayer = new Map(
    roster.flatMap((row) => (row.userId ? [[row.id, row.userId]] : [])),
  );
  const captainOn = (side: Side) => {
    const gamePlayerId =
      side === 1
        ? found?.slot1CaptainGamePlayerId
        : found?.slot2CaptainGamePlayerId;
    const seated = placements.some(
      (placement) =>
        placement.sideIndex === side && placement.gamePlayerId === gamePlayerId,
    );
    return seated && gamePlayerId
      ? (userByGamePlayer.get(gamePlayerId) ?? null)
      : null;
  };
  const captains = { slot1: captainOn(1), slot2: captainOn(2) };
  const viewerSide: Side | null =
    captains.slot1 === args.userId
      ? 1
      : captains.slot2 === args.userId
        ? 2
        : null;
  if (!organizer && viewerSide == null) {
    throw notFound();
  }

  const stopped = { status: "stopped" as const, serverNow: now };
  if (!found || game.cancelledAt || found.pickStatus == null) {
    return stopped;
  }
  if (
    found.pickStatus !== "done" &&
    !footballPickRunning(found.pickStatus, captains)
  ) {
    await clearFootballPick(database, found.id, now);
    return stopped;
  }

  let draft: DraftRow = found;
  if (viewerSide != null && draft.pickStatus !== "done") {
    draft = await recordPresence(database, draft, viewerSide, now);
  }
  if (
    draft.pickStatus === "waiting" &&
    inRoom(draft.slot1CaptainSeenAt, now) &&
    inRoom(draft.slot2CaptainSeenAt, now)
  ) {
    draft = (await startWhenBothIn(database, draft.id, now, random)) ?? draft;
  }

  const status = draft.pickStatus;
  if (status == null) {
    return stopped;
  }
  const placed = new Set(placements.map((placement) => placement.gamePlayerId));
  const rosterOrder = new Map(roster.map((row, index) => [row.id, index]));
  const side = (index: Side) =>
    placements
      .filter((placement) => placement.sideIndex === index)
      .flatMap((placement) => {
        const userId = userByGamePlayer.get(placement.gamePlayerId);
        return userId
          ? [
              {
                userId,
                pickNumber: placement.pickNumber,
                order: rosterOrder.get(placement.gamePlayerId) ?? 0,
              },
            ]
          : [];
      })
      .sort(
        (a, b) =>
          (a.pickNumber ?? 0) - (b.pickNumber ?? 0) || a.order - b.order,
      )
      .map(({ userId, pickNumber }) => ({ userId, pickNumber }));
  const pool = roster.flatMap((row) =>
    row.userId && !placed.has(row.id) ? [row.userId] : [],
  );
  const pickNumbers = placements.flatMap((placement) =>
    placement.pickNumber == null ? [] : [placement.pickNumber],
  );
  const captain = (index: Side) => {
    const userId = index === 1 ? captains.slot1 : captains.slot2;
    return userId
      ? {
          userId,
          inRoom: status !== "done" && inRoom(seenAtOf(draft, index), now),
        }
      : null;
  };

  return {
    status,
    serverNow: now,
    viewer: {
      role: viewerSide != null ? ("captain" as const) : ("organizer" as const),
      side: viewerSide,
      isOrganizer: organizer,
    },
    bibs: { slot1: draft.slot1Bib, slot2: draft.slot2Bib },
    captains: { slot1: captain(1), slot2: captain(2) },
    firstPick: draft.firstPick,
    firstPickSide: asSide(draft.firstPickSide),
    sides: { slot1: side(1), slot2: side(2) },
    pool,
    picks: {
      made: pickNumbers.length,
      total: pickNumbers.length + pool.length,
      next: Math.max(0, ...pickNumbers) + 1,
    },
  };
}

export const footballPickRoomProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return footballPickRoom(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });

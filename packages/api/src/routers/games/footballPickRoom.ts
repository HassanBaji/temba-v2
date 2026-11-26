import { TRPCError } from "@trpc/server";
import { and, eq, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";

import { footballLineupDrafts } from "@repo/db";
import { ofSide, type Side } from "@repo/domain/football-board";
import { firstPickSide, pickTurn } from "@repo/domain/football-captain-pick";
import { PICK_ROOM_PRESENCE_MS } from "@repo/domain/football-lineup";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isGameOrganizer, requireGame, type GameRow } from "#src/games/access";
import {
  clearFootballPick,
  finishFootballPick,
  footballPickProgress,
  loadFootballDraftSides,
  mayHaveFootballDraft,
} from "#src/games/football-draft";
import { assertGameNotCancelled } from "#src/games/football-lineup";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

type RoomDraft = NonNullable<
  Awaited<ReturnType<typeof loadFootballDraftSides>>
>;

/** How stale a Side captain's last-seen time may get before a read writes it again. */
const PRESENCE_WRITE_EVERY_MS = 3_000;

function inRoom(seenAt: Date | null, now: Date) {
  return (
    seenAt != null && now.getTime() - seenAt.getTime() <= PICK_ROOM_PRESENCE_MS
  );
}

function bothInRoom(draft: RoomDraft, now: Date) {
  return (
    inRoom(draft.captainSeenAt.slot1, now) &&
    inRoom(draft.captainSeenAt.slot2, now)
  );
}

/**
 * Marks the calling Side captain as in the room, writing at most once every
 * three seconds.
 */
async function recordPresence(
  database: DbClient,
  draft: RoomDraft,
  side: Side,
  now: Date,
): Promise<RoomDraft> {
  const seenAt = ofSide(draft.captainSeenAt, side);
  if (
    seenAt != null &&
    now.getTime() - seenAt.getTime() < PRESENCE_WRITE_EVERY_MS
  ) {
    return draft;
  }
  const slot = side === 1 ? "slot1" : "slot2";
  const column = footballLineupDrafts[`${slot}CaptainSeenAt`];
  await database
    .update(footballLineupDrafts)
    .set({ [`${slot}CaptainSeenAt`]: now })
    .where(
      and(
        eq(footballLineupDrafts.id, draft.id),
        or(
          isNull(column),
          lte(column, new Date(now.getTime() - PRESENCE_WRITE_EVERY_MS)),
        ),
      ),
    );
  return { ...draft, captainSeenAt: { ...draft.captainSeenAt, [slot]: now } };
}

/**
 * Starts a waiting pick once both Side captains are in the room, under the
 * draft row's lock so concurrent reads start it once: the toss, when the
 * first pick is one, is made here and only here.
 */
async function startWhenBothIn(
  database: DbClient,
  game: GameRow,
  viewerUserId: string,
  now: Date,
  random: () => number,
): Promise<RoomDraft | null> {
  return database.transaction(async (tx) => {
    const locked = await loadFootballDraftSides(tx, game, viewerUserId, {
      lock: true,
    });
    if (locked?.pick?.status !== "waiting" || !bothInRoom(locked, now)) {
      return locked;
    }
    const side = firstPickSide(locked.pick.firstPick ?? "toss", random);
    await tx
      .update(footballLineupDrafts)
      .set({ pickStatus: "live", firstPickSide: side, updatedAt: now })
      .where(eq(footballLineupDrafts.id, locked.id));
    return {
      ...locked,
      updatedAt: now,
      pick: { ...locked.pick, status: "live", firstPickSide: side },
    };
  });
}

/**
 * Finishes a live pick whose pool emptied without a pick, because its last
 * player left, under the draft row's lock so concurrent reads finish it once.
 */
async function finishWhenPoolEmpty(
  database: DbClient,
  game: GameRow,
  viewerUserId: string,
  now: Date,
): Promise<RoomDraft | null> {
  return database.transaction(async (tx) => {
    const locked = await loadFootballDraftSides(tx, game, viewerUserId, {
      lock: true,
    });
    if (locked?.pick?.status !== "live") {
      return locked;
    }
    const { pool } = await footballPickProgress(tx, game.id, locked);
    if (pool.length > 0) {
      return locked;
    }
    await finishFootballPick(tx, {
      game,
      draftId: locked.id,
      openedAt: locked.savedAt,
      captains: locked.captains,
      sideGamePlayerIds: locked.sideGamePlayerIds,
      pickedBy: null,
      now,
    });
    return {
      ...locked,
      savedAt: now,
      updatedAt: now,
      pick: { ...locked.pick, status: "done" },
    };
  });
}

/**
 * The Pick room, read every two seconds by the Organizers of the Game and
 * the two Side captains of the pick (ADR-0109); anyone else is told it is
 * not found, and a cancelled Game refuses them as every draft door does. A
 * pick an Organizer stopped, or that lost a Side captain, reads stopped
 * until a new room opens, and a pick that lost a captain is cleared here
 * as Stop the pick clears it. Any other Game without a pick reads closed:
 * a pick that finished and was then edited or published, or a draft that
 * was never one. With the draft gone only the Organizers still read the
 * room. `pickId` names the opening of the room that is read, so a client
 * tells a new pick from the one it watched. A live pick whose pool emptied
 * because its last player left is finished here as the last pick would
 * finish it. Reading records the calling captain's presence and starts the
 * pick, toss included, on the read that finds both captains in the room.
 * The side on turn is read from the sides by `pickTurn`, never stored.
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
  if (!mayHaveFootballDraft(game)) {
    throw notFound();
  }
  const loaded = await loadFootballDraftSides(database, game, args.userId);
  if (!loaded && !(await isGameOrganizer(database, game, args.userId))) {
    throw notFound();
  }
  assertGameNotCancelled(game, locale);

  const closed = { status: "closed" as const, serverNow: now };
  const ended = async (draft: RoomDraft) => {
    if (draft.pickLostCaptain) {
      await clearFootballPick(database, draft.id, now);
    }
    return draft.pickLostCaptain || draft.pickStoppedAt != null
      ? { status: "stopped" as const, pickId: draft.pickId, serverNow: now }
      : closed;
  };
  if (!loaded) {
    return closed;
  }
  if (!loaded.pick) {
    return ended(loaded);
  }

  const viewerSide = loaded.viewer.sideCaptainOf;
  let draft = loaded;
  if (viewerSide != null && draft.pick && draft.pick.status !== "done") {
    draft = await recordPresence(database, draft, viewerSide, now);
  }
  if (draft.pick?.status === "waiting" && bothInRoom(draft, now)) {
    draft =
      (await startWhenBothIn(database, game, args.userId, now, random)) ??
      draft;
  }
  const progress = await footballPickProgress(database, game.id, draft);
  if (draft.pick?.status === "live" && progress.pool.length === 0) {
    draft =
      (await finishWhenPoolEmpty(database, game, args.userId, now)) ?? draft;
  }
  if (!draft.pick) {
    return ended(draft);
  }

  const { status, firstPick, firstPickSide: startedSide } = draft.pick;
  const side = (index: Side) =>
    draft.placements
      .flatMap((placement) =>
        placement.sideIndex === index && placement.userId
          ? [{ userId: placement.userId, pickNumber: placement.pickNumber }]
          : [],
      )
      .sort((a, b) => (a.pickNumber ?? 0) - (b.pickNumber ?? 0));
  const captain = (index: Side) => {
    const userId = ofSide(draft.captains, index);
    return userId
      ? {
          userId,
          inRoom:
            status !== "done" &&
            inRoom(ofSide(draft.captainSeenAt, index), now),
        }
      : null;
  };
  const sides = { slot1: side(1), slot2: side(2) };
  const turn =
    status === "live" && startedSide != null
      ? pickTurn({
          slot1: sides.slot1.length,
          slot2: sides.slot2.length,
          firstPickSide: startedSide,
        })
      : null;

  return {
    status,
    pickId: draft.pickId,
    serverNow: now,
    viewer: {
      role: viewerSide != null ? ("captain" as const) : ("organizer" as const),
      side: viewerSide,
      isOrganizer: loaded.viewer.organizer,
    },
    bibs: draft.bibs,
    captains: { slot1: captain(1), slot2: captain(2) },
    firstPick,
    firstPickSide: startedSide,
    sides,
    turn,
    pool: progress.pool.map((row) => row.userId),
    picks: {
      made: progress.made,
      total: progress.made + progress.pool.length,
      next: progress.next,
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

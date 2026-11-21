import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  footballLineupDraftPlayers,
  footballLineupDrafts,
  gamePlayers,
} from "@repo/db";
import type { Side } from "@repo/domain/football-board";
import { captainPickDone, pickTurn } from "@repo/domain/football-captain-pick";
import { messagesFor } from "@repo/i18n/messages";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireGame } from "#src/games/access";
import {
  assertFootballDraftOpen,
  finishFootballPick,
  loadFootballDraft,
} from "#src/games/football-draft";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * A pick in a live Captain pick (ADR-0109). The Side captain on turn picks
 * for their side; an Organizer of the Game picks for the side on turn by
 * naming it in `forSide`, whether or not its captain is in the room. The
 * pick names the pick number it expects and locks the draft row, so of two
 * picks sent at once one lands and the other hears "The pick moved on".
 *
 * The pick that empties the pool finishes it: the draft is saved with both
 * Captain's answers approved for the sides as they stand, and the Game
 * admins hear once.
 */
export async function pickFootballPlayer(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    pickUserId: string;
    pickNumber: number;
    forSide?: Side;
    locale?: Locale;
  },
  now: Date = new Date(),
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const m = messagesFor(locale);
  const errors = m.football.errors;
  const game = await requireGame(database, args.gameId, locale);
  await assertFootballDraftOpen(database, game, locale);

  return database.transaction(async (tx) => {
    const draft = await loadFootballDraft(tx, game, args.userId, {
      lock: true,
    });
    if (!draft) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: m.game.errors.notFound,
      });
    }
    if (draft.pick?.status !== "live") {
      throw new TRPCError({ code: "BAD_REQUEST", message: errors.pickNotLive });
    }
    const pickingFor: Side | null =
      args.forSide != null
        ? draft.viewer.organizer
          ? args.forSide
          : null
        : draft.viewer.sideCaptainOf;
    if (pickingFor == null) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: errors.pickOnTurnOnly,
      });
    }

    const placements = await tx
      .select({ pickNumber: footballLineupDraftPlayers.pickNumber })
      .from(footballLineupDraftPlayers)
      .where(eq(footballLineupDraftPlayers.draftId, draft.id));
    const next =
      Math.max(
        0,
        ...placements.flatMap((placement) =>
          placement.pickNumber == null ? [] : [placement.pickNumber],
        ),
      ) + 1;
    if (args.pickNumber !== next) {
      throw new TRPCError({ code: "CONFLICT", message: errors.pickMovedOn });
    }
    const firstPickSide = draft.pick.firstPickSide === 2 ? 2 : 1;
    const turn = pickTurn({
      slot1: draft.sides.slot1.length,
      slot2: draft.sides.slot2.length,
      firstPickSide,
    });
    if (pickingFor !== turn) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: errors.pickNotYourTurn,
      });
    }

    const roster = await tx
      .select({ id: gamePlayers.id, userId: gamePlayers.userId })
      .from(gamePlayers)
      .where(eq(gamePlayers.gameId, game.id))
      .orderBy(asc(gamePlayers.createdAt), asc(gamePlayers.id));
    const placed = new Set([
      ...draft.sideGamePlayerIds.slot1,
      ...draft.sideGamePlayerIds.slot2,
    ]);
    const pool = roster.filter((row) => row.userId && !placed.has(row.id));
    const picked = pool.find((row) => row.userId === args.pickUserId);
    if (!picked) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: errors.pickNotInPool,
      });
    }

    await tx.insert(footballLineupDraftPlayers).values({
      draftId: draft.id,
      gamePlayerId: picked.id,
      sideIndex: turn,
      pickNumber: next,
    });
    const done = captainPickDone(pool.length - 1);
    if (!done) {
      await tx
        .update(footballLineupDrafts)
        .set({ updatedAt: now })
        .where(eq(footballLineupDrafts.id, draft.id));
      return { ok: true as const, pickNumber: next, side: turn, done };
    }

    const withPick = (side: Side, ids: string[]) =>
      side === turn ? [...ids, picked.id] : ids;
    await finishFootballPick(tx, {
      game,
      draftId: draft.id,
      openedAt: draft.savedAt,
      captains: draft.captains,
      sideGamePlayerIds: {
        slot1: withPick(1, draft.sideGamePlayerIds.slot1),
        slot2: withPick(2, draft.sideGamePlayerIds.slot2),
      },
      pickedBy: args.userId,
      now,
    });
    return { ok: true as const, pickNumber: next, side: turn, done };
  });
}

export const pickFootballPlayerProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      userId: z.string().uuid(),
      pickNumber: z.number().int().positive(),
      forSide: z.union([z.literal(1), z.literal(2)]).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return pickFootballPlayer(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      pickUserId: input.userId,
      pickNumber: input.pickNumber,
      forSide: input.forSide,
      locale: ctx.locale,
    });
  });

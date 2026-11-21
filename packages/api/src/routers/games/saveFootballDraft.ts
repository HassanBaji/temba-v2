import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  footballLineupDraftPlayers,
  footballLineupDrafts,
  gamePlayers,
} from "@repo/db";
import { footballDraftSaveProblem } from "@repo/domain/football-draft";
import {
  FOOTBALL_TEAMS_METHODS,
  type FootballBib,
  type FootballTeamsMethod,
} from "@repo/domain/football-lineup";
import { footballSidesInputSchema } from "@repo/validators/football";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import {
  assertFootballDraftCurrent,
  assertFootballDraftOpen,
  loadFootballDraft,
} from "#src/games/football-draft";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The Organizer saves the two sides as the Game's Draft line-up, creating it
 * or replacing it (ADR-0107). Nothing reaches the players: no Game team, no
 * Match. A draft may leave players on neither side.
 */
export async function saveFootballDraft(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    method: FootballTeamsMethod;
    bibs: { slot1: FootballBib; slot2: FootballBib };
    slot1: string[];
    slot2: string[];
    draftUpdatedAt?: Date;
    locale?: Locale;
  },
  now: Date = new Date(),
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  await assertFootballDraftOpen(database, game, locale);
  await assertGameOrganizer(database, game, args.userId, locale);

  const roster = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.gameId, game.id),
    columns: { id: true, userId: true },
  });
  const gamePlayerIdByUser = new Map(
    roster.flatMap((row) => (row.userId ? [[row.userId, row.id]] : [])),
  );
  const problem = footballDraftSaveProblem(
    args,
    [...gamePlayerIdByUser.keys()],
    locale,
  );
  if (problem) {
    throw new TRPCError({ code: "BAD_REQUEST", message: problem });
  }

  return database.transaction(async (tx) => {
    const current = await loadFootballDraft(tx, game, args.userId, {
      lock: true,
    });
    assertFootballDraftCurrent(current, args.draftUpdatedAt, locale);

    const values = {
      method: args.method,
      slot1Bib: args.bibs.slot1,
      slot2Bib: args.bibs.slot2,
      savedBy: args.userId,
      savedAt: now,
      updatedAt: now,
    };
    const [draft] = await tx
      .insert(footballLineupDrafts)
      .values({ gameId: game.id, createdAt: now, ...values })
      .onConflictDoUpdate({ target: footballLineupDrafts.gameId, set: values })
      .returning({
        id: footballLineupDrafts.id,
        updatedAt: footballLineupDrafts.updatedAt,
      });
    if (!draft) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to save the draft",
      });
    }
    await tx
      .delete(footballLineupDraftPlayers)
      .where(eq(footballLineupDraftPlayers.draftId, draft.id));
    await tx.insert(footballLineupDraftPlayers).values(
      [
        ...args.slot1.map((userId) => ({ userId, sideIndex: 1 })),
        ...args.slot2.map((userId) => ({ userId, sideIndex: 2 })),
      ].map((placement) => ({
        draftId: draft.id,
        gamePlayerId: gamePlayerIdByUser.get(placement.userId)!,
        sideIndex: placement.sideIndex,
      })),
    );
    return { ok: true as const, updatedAt: draft.updatedAt };
  });
}

export const saveFootballDraftProcedure = protectedProcedure
  .input(
    footballSidesInputSchema.extend({
      gameId: z.string().uuid(),
      method: z.enum(FOOTBALL_TEAMS_METHODS),
      draftUpdatedAt: z.date().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return saveFootballDraft(ctx.db, {
      ...input,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });

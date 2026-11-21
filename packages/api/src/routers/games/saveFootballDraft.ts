import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  footballLineupDraftAnswers,
  footballLineupDraftPlayers,
  footballLineupDrafts,
  gamePlayers,
} from "@repo/db";
import type { SideCaptains } from "@repo/domain/football-board";
import {
  footballDraftSaveProblem,
  footballSideCaptainProblem,
} from "@repo/domain/football-draft";
import {
  FOOTBALL_TEAMS_METHODS,
  type FootballBib,
  type FootballTeamsMethod,
} from "@repo/domain/football-lineup";
import {
  footballSideCaptainsInputSchema,
  footballSidesInputSchema,
} from "@repo/validators/football";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  assertGameOrganizer,
  isGameOrganizer,
  requireGame,
} from "#src/games/access";
import {
  assertFootballDraftCurrent,
  assertFootballDraftOpen,
  loadFootballDraft,
} from "#src/games/football-draft";
import {
  notifyFootballDraftChanged,
  notifyFootballDraftShared,
} from "#src/notifications/notify-football-draft";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function samePlayers(a: readonly string[], b: readonly string[]) {
  const set = new Set(a);
  return set.size === new Set(b).size && b.every((id) => set.has(id));
}

/**
 * The Organizer saves the two sides as the Game's Draft line-up, creating it
 * or replacing it (ADR-0107), with a Side captain for each side or none
 * (ADR-0108). Nothing reaches the players: no Game team, no Match. A draft
 * may leave players on neither side. Without `captains` each saved captain
 * stays while they are still on their side.
 *
 * A captain newly named is told; one whose side this save changed after
 * they answered is told again. Changing a side's captain drops its answer.
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
    captains?: SideCaptains;
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
    with: {
      user: { columns: { clerkId: true, addedAt: true, guestAt: true } },
    },
  });
  const gamePlayerIdByUser = new Map(
    roster.flatMap((row) => (row.userId ? [[row.userId, row.id]] : [])),
  );
  const accountUserIds = roster.flatMap((row) =>
    row.userId && row.user?.guestAt === null && !isUnclaimed(row.user)
      ? [row.userId]
      : [],
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

    const kept = (captain: string | null | undefined, side: string[]) =>
      captain != null && side.includes(captain) ? captain : null;
    const captains = args.captains ?? {
      slot1: kept(current?.captains.slot1, args.slot1),
      slot2: kept(current?.captains.slot2, args.slot2),
    };
    const captainProblem = footballSideCaptainProblem(
      captains,
      args,
      accountUserIds,
      locale,
    );
    if (captainProblem) {
      throw new TRPCError({ code: "BAD_REQUEST", message: captainProblem });
    }
    const captainGamePlayerId = (captain: string | null) =>
      captain == null ? null : gamePlayerIdByUser.get(captain)!;
    const answersBefore = current
      ? await tx.query.footballLineupDraftAnswers.findMany({
          where: eq(footballLineupDraftAnswers.draftId, current.id),
          columns: { sideIndex: true, captainUserId: true },
        })
      : [];

    const values = {
      method: args.method,
      slot1Bib: args.bibs.slot1,
      slot2Bib: args.bibs.slot2,
      slot1CaptainGamePlayerId: captainGamePlayerId(captains.slot1),
      slot2CaptainGamePlayerId: captainGamePlayerId(captains.slot2),
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

    const named: string[] = [];
    const changed: string[] = [];
    for (const index of [1, 2] as const) {
      const before =
        (index === 1 ? current?.captains.slot1 : current?.captains.slot2) ??
        null;
      const after = index === 1 ? captains.slot1 : captains.slot2;
      if (before !== after) {
        await tx
          .delete(footballLineupDraftAnswers)
          .where(
            and(
              eq(footballLineupDraftAnswers.draftId, draft.id),
              eq(footballLineupDraftAnswers.sideIndex, index),
            ),
          );
      }
      if (after == null || (await isGameOrganizer(tx, game, after))) {
        continue;
      }
      if (before !== after) {
        named.push(after);
        continue;
      }
      const answered = answersBefore.some(
        (answer) =>
          answer.sideIndex === index && answer.captainUserId === after,
      );
      const sideBefore =
        (index === 1
          ? current?.sideGamePlayerIds.slot1
          : current?.sideGamePlayerIds.slot2) ?? [];
      const sideAfter = (index === 1 ? args.slot1 : args.slot2).map(
        (userId) => gamePlayerIdByUser.get(userId)!,
      );
      if (answered && !samePlayers(sideBefore, sideAfter)) {
        changed.push(after);
      }
    }
    await notifyFootballDraftShared(tx, {
      gameId: game.id,
      draftId: draft.id,
      sideCaptainUserIds: named,
      savedBy: args.userId,
    });
    await notifyFootballDraftChanged(tx, {
      gameId: game.id,
      draftId: draft.id,
      sideCaptainUserIds: changed,
      savedBy: args.userId,
      savedAt: now,
    });
    return { ok: true as const, updatedAt: draft.updatedAt };
  });
}

export const saveFootballDraftProcedure = protectedProcedure
  .input(
    footballSidesInputSchema.extend({
      gameId: z.string().uuid(),
      method: z.enum(FOOTBALL_TEAMS_METHODS),
      captains: footballSideCaptainsInputSchema.optional(),
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

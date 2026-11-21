import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  footballLineupDraftAnswers,
  footballLineupDraftPlayers,
  footballLineupDrafts,
  gamePlayers,
} from "@repo/db";
import { captainPickSetupProblem } from "@repo/domain/football-captain-pick";
import {
  FOOTBALL_FIRST_PICKS,
  type FootballBib,
  type FootballFirstPick,
} from "@repo/domain/football-lineup";
import { messagesFor } from "@repo/i18n/messages";
import { footballBibsInputSchema } from "@repo/validators/football";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import {
  assertFootballDraftOpen,
  assertFootballPickNotRunning,
  loadFootballDraft,
} from "#src/games/football-draft";
import { notifyFootballPickRoomOpened } from "#src/notifications/notify-football-draft";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The Organizer opens the Pick room for a Captain pick (ADR-0109): the two
 * Side captains, who picks first and the bibs. It replaces any Draft
 * line-up with one that seats each captain on their side, leaves everyone
 * else to be picked and has no answers, and tells both captains. It is
 * refused while a pick already runs.
 */
export async function openFootballPickRoom(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    bibs: { slot1: FootballBib; slot2: FootballBib };
    captains: { slot1: string; slot2: string };
    firstPick: FootballFirstPick;
    locale?: Locale;
  },
  now: Date = new Date(),
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  await assertFootballDraftOpen(database, game, locale);
  await assertGameOrganizer(database, game, args.userId, locale);
  if (args.bibs.slot1 === args.bibs.slot2) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).football.errors.differentBibs,
    });
  }

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
  const problem = captainPickSetupProblem(
    args.captains,
    [...gamePlayerIdByUser.keys()],
    accountUserIds,
    locale,
  );
  if (problem) {
    throw new TRPCError({ code: "BAD_REQUEST", message: problem });
  }
  const slot1Captain = gamePlayerIdByUser.get(args.captains.slot1)!;
  const slot2Captain = gamePlayerIdByUser.get(args.captains.slot2)!;

  return database.transaction(async (tx) => {
    const current = await loadFootballDraft(tx, game, args.userId, {
      lock: true,
    });
    assertFootballPickNotRunning(current, locale);

    const values = {
      method: "captain_pick" as const,
      slot1Bib: args.bibs.slot1,
      slot2Bib: args.bibs.slot2,
      slot1CaptainGamePlayerId: slot1Captain,
      slot2CaptainGamePlayerId: slot2Captain,
      pickStatus: "waiting" as const,
      firstPick: args.firstPick,
      firstPickSide: null,
      slot1CaptainSeenAt: null,
      slot2CaptainSeenAt: null,
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
        message: "Failed to open the pick room",
      });
    }
    await tx
      .delete(footballLineupDraftPlayers)
      .where(eq(footballLineupDraftPlayers.draftId, draft.id));
    await tx.insert(footballLineupDraftPlayers).values([
      { draftId: draft.id, gamePlayerId: slot1Captain, sideIndex: 1 },
      { draftId: draft.id, gamePlayerId: slot2Captain, sideIndex: 2 },
    ]);
    await tx
      .delete(footballLineupDraftAnswers)
      .where(eq(footballLineupDraftAnswers.draftId, draft.id));

    await notifyFootballPickRoomOpened(tx, {
      gameId: game.id,
      draftId: draft.id,
      sideCaptainUserIds: [args.captains.slot1, args.captains.slot2],
      openedBy: args.userId,
      openedAt: now,
    });
    return { ok: true as const, updatedAt: draft.updatedAt };
  });
}

export const openFootballPickRoomProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      bibs: footballBibsInputSchema,
      captains: z.object({
        slot1: z.string().uuid(),
        slot2: z.string().uuid(),
      }),
      firstPick: z.enum(FOOTBALL_FIRST_PICKS),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return openFootballPickRoom(ctx.db, {
      ...input,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });

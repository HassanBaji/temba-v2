import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  MatchStatusEnum,
  footballLineupDrafts,
  gameCourts,
  gameTeamPlayers,
  gameTeams,
  games,
  matchResultConfirmations,
  matches,
} from "@repo/db";

import {
  captainsOnTheirSides,
  sidesFromSplit,
  type SideCaptains,
} from "@repo/domain/football-board";
import { footballSideCaptainProblem } from "@repo/domain/football-draft";
import {
  FOOTBALL_TEAMS_METHODS,
  type FootballBib,
  type FootballTeamsMethod,
  footballBibName,
  footballSidesProblem,
} from "@repo/domain/football-lineup";
import { messagesFor } from "@repo/i18n/messages";
import {
  footballSideCaptainsInputSchema,
  footballSidesInputSchema,
} from "@repo/validators/football";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  assertGameOrganizer,
  requireGame,
  requireNotChallengeGame,
} from "#src/games/access";
import {
  assertFootballGame,
  assertGameNotCancelled,
  footballMatch,
  footballScoreOf,
  footballScoreSet,
  footballSides,
} from "#src/games/football-lineup";
import {
  assertFootballDraftCurrent,
  footballDraftRoster,
  loadFootballDraft,
} from "#src/games/football-draft";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function refuse(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

function assertCoversRoster(
  registered: readonly string[],
  slot1: readonly string[],
  slot2: readonly string[],
  locale: Locale = DEFAULT_LOCALE,
) {
  const placed = [...slot1, ...slot2];
  if (new Set(placed).size !== placed.length) {
    refuse(messagesFor(locale).football.errors.oneTeamOnly);
  }
  const roster = new Set(registered);
  if (placed.some((userId) => !roster.has(userId))) {
    refuse(messagesFor(locale).football.errors.registeredOnly);
  }
}

async function upsertSide(
  tx: Tx,
  args: {
    gameId: string;
    sideIndex: 1 | 2;
    existingId: string | null;
    bib: FootballBib;
    captainGamePlayerId: string | null;
  },
) {
  const now = new Date();
  if (args.existingId) {
    await tx
      .update(gameTeams)
      .set({
        bib: args.bib,
        captainGamePlayerId: args.captainGamePlayerId,
        updatedAt: now,
      })
      .where(eq(gameTeams.id, args.existingId));
    await tx
      .delete(gameTeamPlayers)
      .where(eq(gameTeamPlayers.gameTeamId, args.existingId));
    return args.existingId;
  }
  const [inserted] = await tx
    .insert(gameTeams)
    .values({
      gameId: args.gameId,
      sideIndex: args.sideIndex,
      bib: args.bib,
      captainGamePlayerId: args.captainGamePlayerId,
    })
    .returning({ id: gameTeams.id });
  if (!inserted) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create the team",
    });
  }
  return inserted.id;
}

/**
 * The Organizer publishes the two football teams: every registered player on
 * exactly one side, each side in its bib colour. Publishing again replaces the
 * split until a Score is in. The first publish creates the Game's one Match.
 * It removes the Game's Draft line-up; one made from a draft names it by
 * `draftUpdatedAt`, or says with `null` that there was none, and is refused
 * when the draft has changed since or one has been saved meanwhile. Each
 * side carries its Side captain (ADR-0108), never waiting on an answer.
 * Without `captains` it keeps the draft's, or the published teams', while
 * they are still on their side.
 */
export async function publishFootballTeams(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    method: FootballTeamsMethod;
    bibs: { slot1: FootballBib; slot2: FootballBib };
    slot1: string[];
    slot2: string[];
    captains?: SideCaptains;
    draftUpdatedAt?: Date | null;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  requireNotChallengeGame(game, locale);
  assertFootballGame(game, locale);
  assertGameNotCancelled(game, locale);
  await assertGameOrganizer(database, game, args.userId, locale);
  if (args.bibs.slot1 === args.bibs.slot2) {
    refuse(messagesFor(locale).football.errors.differentBibs);
  }

  const {
    registeredUserIds: registered,
    gamePlayerIdByUser,
    userByGamePlayerId,
    accountUserIds,
  } = await footballDraftRoster(database, game.id);
  assertCoversRoster(registered, args.slot1, args.slot2, locale);
  const problem = footballSidesProblem(
    {
      slot1: args.slot1,
      slot2: args.slot2,
      unplaced: registered.length - args.slot1.length - args.slot2.length,
    },
    {
      slot1: footballBibName(args.bibs.slot1, 1, locale),
      slot2: footballBibName(args.bibs.slot2, 2, locale),
    },
    locale,
  );
  if (problem) {
    refuse(problem);
  }

  const existingMatch = await footballMatch(database, game.id);
  if (existingMatch) {
    const scored =
      existingMatch.status === MatchStatusEnum.COMPLETED ||
      footballScoreOf(await footballScoreSet(database, existingMatch.id)) !=
        null;
    if (scored) {
      refuse(messagesFor(locale).football.errors.teamsFixed);
    }
  }

  const sides = await footballSides(database, game.id);
  const publishedCaptain = (
    side: { captainGamePlayerId: string | null } | null,
  ) =>
    side?.captainGamePlayerId
      ? (userByGamePlayerId.get(side.captainGamePlayerId) ?? null)
      : null;

  await database.transaction(async (tx) => {
    const draft = await loadFootballDraft(tx, game, args.userId, {
      lock: true,
    });
    assertFootballDraftCurrent(draft, args.draftUpdatedAt, locale);
    const carried = draft?.captains ?? {
      slot1: publishedCaptain(sides.slot1),
      slot2: publishedCaptain(sides.slot2),
    };
    const captains =
      args.captains ?? captainsOnTheirSides(carried, sidesFromSplit(args));
    const captainProblem = footballSideCaptainProblem(
      captains,
      args,
      accountUserIds,
      locale,
    );
    if (captainProblem) {
      refuse(captainProblem);
    }
    const captainGamePlayerId = (captain: string | null) =>
      captain == null ? null : gamePlayerIdByUser.get(captain)!;
    if (draft) {
      await tx
        .delete(footballLineupDrafts)
        .where(eq(footballLineupDrafts.id, draft.id));
    }

    const slot1Id = await upsertSide(tx, {
      gameId: game.id,
      sideIndex: 1,
      existingId: sides.slot1?.id ?? null,
      bib: args.bibs.slot1,
      captainGamePlayerId: captainGamePlayerId(captains.slot1),
    });
    const slot2Id = await upsertSide(tx, {
      gameId: game.id,
      sideIndex: 2,
      existingId: sides.slot2?.id ?? null,
      bib: args.bibs.slot2,
      captainGamePlayerId: captainGamePlayerId(captains.slot2),
    });
    const links = [
      ...args.slot1.map((userId) => ({ userId, gameTeamId: slot1Id })),
      ...args.slot2.map((userId) => ({ userId, gameTeamId: slot2Id })),
    ].map((link) => ({
      gameTeamId: link.gameTeamId,
      gamePlayerId: gamePlayerIdByUser.get(link.userId)!,
    }));
    if (links.length > 0) {
      await tx.insert(gameTeamPlayers).values(links);
    }

    const now = new Date();
    await tx
      .update(games)
      .set({ footballTeamsMethod: args.method, updatedAt: now })
      .where(eq(games.id, game.id));

    if (existingMatch) {
      await tx
        .update(matches)
        .set({
          slot1GameTeamId: slot1Id,
          slot2GameTeamId: slot2Id,
          updatedAt: now,
        })
        .where(eq(matches.id, existingMatch.id));
      await tx
        .delete(matchResultConfirmations)
        .where(eq(matchResultConfirmations.matchId, existingMatch.id));
      return;
    }
    const pitch = await tx.query.gameCourts.findFirst({
      where: eq(gameCourts.gameId, game.id),
      columns: { courtId: true },
      orderBy: asc(gameCourts.createdAt),
    });
    const durationInMinutes =
      game.windowStart && game.windowEnd
        ? Math.round(
            (game.windowEnd.getTime() - game.windowStart.getTime()) / 60_000,
          )
        : null;
    await tx.insert(matches).values({
      gameId: game.id,
      courtId: pitch?.courtId ?? null,
      startTime: game.windowStart,
      endTime: game.windowEnd,
      durationInMinutes,
      slot1GameTeamId: slot1Id,
      slot2GameTeamId: slot2Id,
    });
  });

  return { ok: true as const };
}

export const publishFootballTeamsProcedure = protectedProcedure
  .input(
    footballSidesInputSchema.extend({
      gameId: z.string().uuid(),
      method: z.enum(FOOTBALL_TEAMS_METHODS),
      captains: footballSideCaptainsInputSchema.optional(),
      draftUpdatedAt: z.date().nullable().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return publishFootballTeams(ctx.db, {
      ...input,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });

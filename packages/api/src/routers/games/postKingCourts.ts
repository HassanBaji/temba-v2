import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { gameTeams, gameWaitlist, games } from "@repo/db";

import {
  isKingOfTheCourt,
  kingCourtOfPosition,
  startingOrderIssue,
} from "@repo/domain/tournament-king";
import { TOURNAMENT_TEAM_MIN } from "@repo/domain/tournament-sizing";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import { lockGame } from "#src/games/lock-rows";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function occupantName(
  team: {
    sideIndex: number | null;
    players: readonly {
      gamePlayer: { user: { name: string } | null } | null;
    }[];
  },
  locale: Locale,
) {
  const name = team.players[0]?.gamePlayer?.user?.name;
  if (name) {
    return name;
  }
  if (team.sideIndex != null) {
    return messagesFor(locale).tournament.errors.teamNumber(team.sideIndex);
  }
  return messagesFor(locale).tournament.gameTeam;
}

/**
 * Posts the King of the court starting courts: `gameTeamIds` in court order,
 * two a court from Court 1 down. Posting again replaces them, until the
 * final order is posted. The first post closes the seats.
 */
export async function postKingCourts(
  database: DbClient,
  args: {
    gameId: string;
    organizerUserId: string;
    gameTeamIds: readonly string[];
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const m = messagesFor(locale).tournamentKing.errors;
  const game = await requireGame(database, args.gameId, locale);
  await assertGameOrganizer(database, game, args.organizerUserId, locale);

  if (!isKingOfTheCourt(game.format, game.tournamentShape)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: m.notKing });
  }
  if (game.cancelledAt) {
    throw new TRPCError({ code: "BAD_REQUEST", message: m.cancelled });
  }
  if (game.finalOrderPostedAt) {
    throw new TRPCError({ code: "FORBIDDEN", message: m.finalOrderPosted });
  }

  const teamRows = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, game.id),
    with: {
      players: {
        with: {
          gamePlayer: { with: { user: { columns: { name: true } } } },
        },
      },
    },
  });
  const halfTeams = teamRows
    .filter((team) => team.players.length === 1)
    .sort(
      (left, right) =>
        (left.sideIndex ?? Number.MAX_SAFE_INTEGER) -
          (right.sideIndex ?? Number.MAX_SAFE_INTEGER) ||
        left.id.localeCompare(right.id),
    );
  if (halfTeams.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: m.halfTeams(
        halfTeams.map((team) => occupantName(team, locale)).join(", "),
      ),
    });
  }
  const completeIds = teamRows
    .filter((team) => team.players.length === 2)
    .map((team) => team.id);
  if (completeIds.length < TOURNAMENT_TEAM_MIN) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: m.belowMinimum(TOURNAMENT_TEAM_MIN),
    });
  }
  if (startingOrderIssue(args.gameTeamIds, completeIds)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: m.wrongTeams });
  }

  const now = new Date();
  await database.transaction(async (tx) => {
    const locked = await lockGame(tx, game.id, locale);
    if (locked.cancelledAt) {
      throw new TRPCError({ code: "BAD_REQUEST", message: m.cancelled });
    }
    if (locked.finalOrderPostedAt) {
      throw new TRPCError({ code: "FORBIDDEN", message: m.finalOrderPosted });
    }
    await tx
      .update(gameTeams)
      .set({ startCourt: null, updatedAt: now })
      .where(eq(gameTeams.gameId, game.id));
    for (const [position, gameTeamId] of args.gameTeamIds.entries()) {
      await tx
        .update(gameTeams)
        .set({ startCourt: kingCourtOfPosition(position), updatedAt: now })
        .where(eq(gameTeams.id, gameTeamId));
    }
    await tx
      .update(games)
      .set({
        drawPostedAt: locked.drawPostedAt ?? now,
        registrationClosedAt: locked.registrationClosedAt ?? now,
        updatedAt: now,
      })
      .where(eq(games.id, game.id));
    await tx.delete(gameWaitlist).where(eq(gameWaitlist.gameId, game.id));
  });

  return { ok: true as const };
}

export const postKingCourtsInputSchema = z.object({
  gameId: z.string().uuid(),
  gameTeamIds: z.array(z.string().uuid()).min(1).max(64),
});

export const postKingCourtsProcedure = protectedProcedure
  .input(postKingCourtsInputSchema)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return postKingCourts(ctx.db, {
      gameId: input.gameId,
      organizerUserId: appUser.id,
      gameTeamIds: input.gameTeamIds,
      locale: ctx.locale,
    });
  });

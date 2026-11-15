import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { gameTeams, gameWaitlist, games } from "@repo/db";

import {
  isKingOfTheCourt,
  KING_TEAMS_PER_COURT,
  kingCourtOfPosition,
} from "@repo/domain/tournament-king";
import { TOURNAMENT_TEAM_MIN } from "@repo/domain/tournament-sizing";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import { drawOccupantName } from "#src/games/helpers/draw-occupant-name";
import { lockGame } from "#src/games/lock-rows";
import { notify } from "#src/notifications/notify";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function sameTeamsOnce(order: readonly string[], expected: readonly string[]) {
  const known = new Set(expected);
  return (
    order.length === known.size &&
    new Set(order).size === order.length &&
    order.every((id) => known.has(id))
  );
}

/**
 * Posts the King of the court starting courts: `gameTeamIds` in court order,
 * two a court from Court 1 down. The first post takes every complete Game
 * team, an even number of them, and closes the seats. Posting again moves
 * the teams already on a court, until the final order is posted.
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

  const now = new Date();
  return database.transaction(async (tx) => {
    // The field is read under the Game lock, so a seat taken or a line-up
    // edited while the Organizer was drawing is seen before the courts post.
    const locked = await lockGame(tx, game.id, locale);
    if (locked.cancelledAt) {
      throw new TRPCError({ code: "BAD_REQUEST", message: m.cancelled });
    }
    if (locked.finalOrderPostedAt) {
      throw new TRPCError({ code: "FORBIDDEN", message: m.finalOrderPosted });
    }

    const teamRows = await tx.query.gameTeams.findMany({
      where: eq(gameTeams.gameId, game.id),
      with: {
        players: {
          with: {
            gamePlayer: { with: { user: { columns: { name: true } } } },
          },
        },
      },
    });
    const onCourt = teamRows.filter(
      (team) => team.startCourt != null && team.players.length > 0,
    );
    const firstPost = locked.drawPostedAt == null || onCourt.length === 0;
    if (firstPost) {
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
            halfTeams.map((team) => drawOccupantName(team, locale)).join(", "),
          ),
        });
      }
    }
    // A team that lost a player after the draw keeps its court, so a later
    // post moves the teams already on a court instead of the complete ones.
    const field = firstPost
      ? teamRows.filter((team) => team.players.length === 2)
      : onCourt;
    if (firstPost && field.length < TOURNAMENT_TEAM_MIN) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: m.belowMinimum(TOURNAMENT_TEAM_MIN),
      });
    }
    if (firstPost && field.length % KING_TEAMS_PER_COURT !== 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: m.oddTeams });
    }
    if (
      !sameTeamsOnce(
        args.gameTeamIds,
        field.map((team) => team.id),
      )
    ) {
      throw new TRPCError({ code: "BAD_REQUEST", message: m.wrongTeams });
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

    if (firstPost) {
      await notify(tx, {
        type: "king_courts_posted",
        recipients: field.flatMap((team) =>
          team.players.flatMap((link) =>
            link.gamePlayer?.userId
              ? [
                  {
                    userId: link.gamePlayer.userId,
                    audience: "player" as const,
                  },
                ]
              : [],
          ),
        ),
        excludeUserIds: [args.organizerUserId],
        actorUserId: args.organizerUserId,
        groupId: game.groupId,
        gameId: game.id,
      });
    }

    return { ok: true as const, firstPost };
  });
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

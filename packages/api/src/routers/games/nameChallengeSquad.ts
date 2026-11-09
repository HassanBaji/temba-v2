import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  gamePlayers,
  games,
  gameTeamPlayers,
  teamMembers,
  teams,
  user,
} from "@repo/db";
import { isFootballGame } from "@repo/domain/game-shape";
import { squadSeatCount, squadState } from "@repo/domain/matchday-squad";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { loadChallengeSides } from "#src/games/challenge-squad";
import { notifySquadNamed } from "#src/notifications/notify-challenge";
import { userActsForTeam } from "#src/teams/acts-for-team";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

/** Far above any squad (`7 + 3`); the door's own cap speaks first. */
const MAX_NAMES_IN_INPUT = 40;

function refuse(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

/**
 * Replaces one side's Matchday squad on a football Challenge Game with
 * `userIds`, in naming order: the first `side` are the side, the rest
 * Reserves. Only whoever acts for that side's Team may name it, from its
 * Roster, up to `side + 3`, never a User named for the other side, and only
 * until the Score is entered. Added Users get a seat and are told; removed
 * Users lose their seat silently.
 */
export async function nameChallengeSquad(
  database: DbClient,
  args: {
    gameId: string;
    teamId: string;
    userIds: readonly string[];
    userId: string;
    locale?: Locale;
    now?: Date;
  },
) {
  const errors = messagesFor(args.locale ?? DEFAULT_LOCALE).challenge.errors;
  const now = args.now ?? new Date();
  if (new Set(args.userIds).size !== args.userIds.length) {
    refuse(errors.squad.duplicate);
  }

  return database.transaction(async (tx) => {
    const [game] = await tx
      .select()
      .from(games)
      .where(eq(games.id, args.gameId))
      .for("update");
    if (!game) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
    }
    if (!game.challengeId) {
      refuse(errors.squad.notFootball);
    }
    if (!isFootballGame(game)) {
      refuse(errors.squad.padel);
    }
    if (game.cancelledAt) {
      refuse(errors.squad.cancelled);
    }

    const sides = (await loadChallengeSides(tx, game)) ?? [];
    const side = sides.find((candidate) => candidate.teamId === args.teamId);
    const team = side
      ? await tx.query.teams.findFirst({ where: eq(teams.id, args.teamId) })
      : undefined;
    if (!side || !team) {
      refuse(errors.squad.notOnGame);
    }
    if (!(await userActsForTeam(tx, team, args.userId))) {
      throw new TRPCError({ code: "FORBIDDEN", message: errors.notActing });
    }
    if (side.squadState === "locked") {
      refuse(errors.squad.locked);
    }
    const seats = squadSeatCount(side.sideSize);
    if (args.userIds.length > seats) {
      refuse(errors.squad.tooMany(seats));
    }

    const roster = new Set(
      (
        await tx.query.teamMembers.findMany({
          where: eq(teamMembers.teamId, team.id),
          columns: { userId: true },
        })
      ).map((row) => row.userId),
    );
    if (args.userIds.some((userId) => !roster.has(userId))) {
      refuse(errors.squad.notOnRoster);
    }
    const otherSide = sides
      .filter((candidate) => candidate.gameTeamId !== side.gameTeamId)
      .flatMap((candidate) => candidate.named);
    const clash = otherSide.find((player) =>
      args.userIds.includes(player.userId),
    );
    if (clash) {
      refuse(errors.squad.otherSide(clash.name));
    }

    const current = side.named.map((player) => player.userId);
    const removed = current.filter((userId) => !args.userIds.includes(userId));
    const added = args.userIds.filter((userId) => !current.includes(userId));

    if (removed.length > 0) {
      await tx
        .delete(gamePlayers)
        .where(
          and(
            eq(gamePlayers.gameId, game.id),
            inArray(gamePlayers.userId, removed),
          ),
        );
    }
    if (added.length > 0) {
      const preferences = await tx.query.user.findMany({
        where: inArray(user.id, added),
        columns: {
          id: true,
          preferredFootballRole: true,
          preferredFootballPosition: true,
        },
      });
      for (const [index, userId] of added.entries()) {
        const preferred = preferences.find((row) => row.id === userId);
        // Seat order is naming order, so each seat is stamped after the last.
        const seatedAt = new Date(now.getTime() + index);
        const [player] = await tx
          .insert(gamePlayers)
          .values({
            gameId: game.id,
            userId,
            footballRole: preferred?.preferredFootballRole ?? null,
            footballPosition: preferred?.preferredFootballPosition ?? null,
            createdAt: seatedAt,
            updatedAt: seatedAt,
          })
          .returning({ id: gamePlayers.id });
        await tx.insert(gameTeamPlayers).values({
          gameTeamId: side.gameTeamId,
          gamePlayerId: player!.id,
          createdAt: seatedAt,
          updatedAt: seatedAt,
        });
      }
      await notifySquadNamed(tx, {
        challengeId: game.challengeId,
        gameId: game.id,
        namedUserIds: added,
        namedBy: args.userId,
        opponentTeamId:
          sides.find((candidate) => candidate.gameTeamId !== side.gameTeamId)
            ?.teamId ?? null,
      });
    }

    return {
      teamId: team.id,
      namedCount: args.userIds.length,
      squadState: squadState(args.userIds.length, side.sideSize),
    };
  });
}

export const nameChallengeSquadProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      teamId: z.string().uuid(),
      userIds: z.array(z.string().uuid()).max(MAX_NAMES_IN_INPUT),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return nameChallengeSquad(ctx.db, {
      ...input,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });

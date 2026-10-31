import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { gameInviteLinks, gamePlayers } from "@repo/db";

import {
  type FootballPosition,
  type FootballRole,
} from "@repo/domain/football-lineup";
import { isFootballGame } from "@repo/domain/game-shape";
import {
  footballPositionSchema,
  footballRoleSchema,
} from "@repo/validators/football";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireGame } from "#src/games/access";
import { assertPoolDrawNotPosted } from "#src/games/assert-pool-draw-not-posted";
import { assertKeeperSeatOpen } from "#src/games/football-lineup";
import { userAlreadyOnGame } from "#src/games/helpers/user-already-on-game";
import {
  admitInviteeToGroup,
  assertGameInviteDoorsOpen,
} from "#src/games/invites";
import { userAllowedByLevelRange } from "#src/games/user-allowed-by-level-range";
import { acceptLink, throwInviteFrozen } from "#src/invites/doors";
import { LEVEL_RANGE_OUTSIDE_MESSAGE } from "@repo/domain/level-range";
import {
  isPartnerRequiredGame,
  PARTNER_REQUIRED_REFUSAL_MESSAGE,
} from "@repo/domain/tournament-rounds";

type DbClient = typeof db;

export async function acceptInviteLink(
  database: DbClient,
  args: {
    token: string;
    userId: string;
    sideIndex?: number;
    position?: "left" | "right";
    football?: { role: FootballRole; position: FootballPosition };
  },
) {
  const link = await database.query.gameInviteLinks.findFirst({
    where: eq(gameInviteLinks.token, args.token),
  });
  if (!link) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Invite link is invalid or expired",
    });
  }
  const game = await requireGame(database, link.gameId);
  assertPoolDrawNotPosted(game);
  await assertGameInviteDoorsOpen(database, game);

  if (args.football && !isFootballGame(game)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only a football Game takes a role and position",
    });
  }

  if (await userAlreadyOnGame(database, game.id, args.userId)) {
    return {
      gameId: game.id,
      outcome: "already" as const,
      waitlisted: false as const,
      joinedGroup: false,
    };
  }

  if (!(await userAllowedByLevelRange(database, game, args.userId))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: LEVEL_RANGE_OUTSIDE_MESSAGE,
    });
  }

  if (isPartnerRequiredGame(game)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: PARTNER_REQUIRED_REFUSAL_MESSAGE,
    });
  }

  if (args.football?.role === "keeper") {
    await assertKeeperSeatOpen(database, game.id);
  }

  const { accepted, joinedGroup } = await database.transaction(async (tx) => {
    const group = await admitInviteeToGroup(tx, game, args.userId);
    const accepted = await acceptLink(tx, "game", {
      token: args.token,
      userId: args.userId,
      seat:
        args.sideIndex != null && args.position
          ? { sideIndex: args.sideIndex, position: args.position }
          : undefined,
    });
    if (!accepted.ok) {
      if (accepted.reason === "seat_required") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pick a vacant Position",
        });
      }
      if (accepted.reason === "frozen") {
        throwInviteFrozen({ kind: "game", id: game.id }, "accept", "frozen");
      }
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invite link is invalid or expired",
      });
    }
    if (args.football && !accepted.waitingForPartner && !accepted.waitlisted) {
      await tx
        .update(gamePlayers)
        .set({
          footballRole: args.football.role,
          footballPosition: args.football.position,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(gamePlayers.gameId, game.id),
            eq(gamePlayers.userId, args.userId),
          ),
        );
    }
    return { accepted, joinedGroup: group.joined };
  });
  if (accepted.waitingForPartner) {
    return {
      gameId: game.id,
      outcome: "waiting_for_partner" as const,
      waitlisted: false as const,
      joinedGroup,
    };
  }
  return {
    gameId: game.id,
    outcome: accepted.waitlisted
      ? ("waitlisted" as const)
      : ("registered" as const),
    waitlisted: accepted.waitlisted ?? false,
    joinedGroup,
  };
}

export const acceptInviteLinkProcedure = protectedProcedure
  .input(
    z.object({
      token: z.string().min(1).max(64),
      sideIndex: z.number().int().min(1).optional(),
      position: z.enum(["left", "right"]).optional(),
      football: z
        .object({
          role: footballRoleSchema,
          position: footballPositionSchema,
        })
        .optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return acceptInviteLink(ctx.db, {
      token: input.token,
      userId: appUser.id,
      sideIndex: input.sideIndex,
      position: input.position,
      football: input.football,
    });
  });

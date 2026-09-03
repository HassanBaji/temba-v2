import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { gameInviteLinks } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { requireGame } from "~/server/games/access";
import { userAlreadyOnGame } from "~/server/games/helpers/user-already-on-game";
import {
  assertGameInviteDoorsOpen,
  assertInviteeAllowedOnGame,
} from "~/server/games/invites";
import { userAllowedByLevelRange } from "~/server/games/user-allowed-by-level-range";
import { acceptLink, throwInviteFrozen } from "~/server/invites/doors";
import { isInviteLinkLive } from "~/server/invites/invite-link-expiry";
import { LEVEL_RANGE_OUTSIDE_MESSAGE } from "~/lib/level-range";

type DbClient = typeof db;

export async function acceptInviteLink(
  database: DbClient,
  args: {
    token: string;
    userId: string;
    sideIndex?: number;
    position?: "left" | "right";
  },
) {
  const link = await database.query.gameInviteLinks.findFirst({
    where: eq(gameInviteLinks.token, args.token),
  });
  if (!link || !isInviteLinkLive(link.expiresAt)) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Invite link is invalid or expired",
    });
  }
  const game = await requireGame(database, link.gameId);
  await assertGameInviteDoorsOpen(database, game);
  await assertInviteeAllowedOnGame(database, game, args.userId);

  if (await userAlreadyOnGame(database, game.id, args.userId)) {
    return {
      gameId: game.id,
      outcome: "already" as const,
      waitlisted: false as const,
    };
  }

  if (!(await userAllowedByLevelRange(database, game, args.userId))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: LEVEL_RANGE_OUTSIDE_MESSAGE,
    });
  }

  const accepted = await acceptLink(database, "game", {
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
  if (accepted.waitingForPartner) {
    return {
      gameId: game.id,
      outcome: "waiting_for_partner" as const,
      waitlisted: false as const,
    };
  }
  return {
    gameId: game.id,
    outcome: accepted.waitlisted
      ? ("waitlisted" as const)
      : ("registered" as const),
    waitlisted: accepted.waitlisted ?? false,
  };
}

export const acceptInviteLinkProcedure = protectedProcedure
  .input(
    z.object({
      token: z.string().min(1).max(64),
      sideIndex: z.number().int().min(1).optional(),
      position: z.enum(["left", "right"]).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return acceptInviteLink(ctx.db, {
      token: input.token,
      userId: appUser.id,
      sideIndex: input.sideIndex,
      position: input.position,
    });
  });

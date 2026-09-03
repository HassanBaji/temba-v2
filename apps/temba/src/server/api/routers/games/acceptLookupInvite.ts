import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { gameMemberInvites } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { requireGame } from "~/server/games/access";
import {
  assertGameInviteDoorsOpen,
  assertInviteeAllowedOnGame,
} from "~/server/games/invites";
import { acceptLookup, throwInviteFrozen } from "~/server/invites/doors";

type DbClient = typeof db;

export async function acceptLookupInvite(
  database: DbClient,
  args: {
    inviteId: string;
    userId: string;
    sideIndex?: number;
    position?: "left" | "right";
  },
) {
  const invite = await database.query.gameMemberInvites.findFirst({
    where: eq(gameMemberInvites.id, args.inviteId),
  });
  if (!invite || invite.acceptedAt || invite.revokedAt) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Lookup invite is not available",
    });
  }
  if (invite.userId !== args.userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This invite is for a different User",
    });
  }
  const game = await requireGame(database, invite.gameId);
  await assertGameInviteDoorsOpen(database, game);
  await assertInviteeAllowedOnGame(database, game, args.userId);

  const accepted = await acceptLookup(
    database,
    { kind: "game", id: game.id },
    {
      inviteId: invite.id,
      userId: args.userId,
      seat:
        args.sideIndex != null && args.position
          ? { sideIndex: args.sideIndex, position: args.position }
          : undefined,
    },
  );
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
      message: "Lookup invite is not available",
    });
  }

  return {
    ok: true as const,
    gameId: game.id,
    waitlisted: accepted.waitlisted ?? false,
  };
}

export const acceptLookupInviteProcedure = protectedProcedure
  .input(
    z.object({
      inviteId: z.string().uuid(),
      sideIndex: z.number().int().min(1).optional(),
      position: z.enum(["left", "right"]).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return acceptLookupInvite(ctx.db, {
      inviteId: input.inviteId,
      userId: appUser.id,
      sideIndex: input.sideIndex,
      position: input.position,
    });
  });

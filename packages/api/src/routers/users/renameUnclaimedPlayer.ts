import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { user } from "@repo/db";

import { UNCLAIMED_PLAYER_NAME_MAX_LENGTH } from "@repo/domain/add-player-by-phone";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  isUnclaimed,
  unclaimedUserSql,
} from "#src/unclaimed-players/is-unclaimed";
import { mayRenameUnclaimedPlayer } from "#src/unclaimed-players/may-rename-unclaimed-player";

type DbClient = typeof db;

export const RENAME_NOT_ALLOWED_MESSAGE =
  "Only an Organizer or Group approver where they were added can edit their name";

export const ONLY_UNCLAIMED_RENAMABLE_MESSAGE =
  "Only players not on Temba yet can have their name edited";

export const renameUnclaimedPlayerInput = z.object({
  userId: z.string().uuid(),
  name: z
    .string()
    .trim()
    .min(1, "Enter their name")
    .max(UNCLAIMED_PLAYER_NAME_MAX_LENGTH),
});

export async function renameUnclaimedPlayer(
  database: DbClient,
  args: { callerUserId: string; userId: string; name: string },
) {
  const name = args.name.trim();
  if (name.length === 0 || name.length > UNCLAIMED_PLAYER_NAME_MAX_LENGTH) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Enter their name" });
  }

  const player = await database.query.user.findFirst({
    where: eq(user.id, args.userId),
    columns: {
      id: true,
      clerkId: true,
      addedAt: true,
      addedByUserId: true,
      claimedAt: true,
    },
  });
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Player not found" });
  }

  if (!isUnclaimed(player) || player.claimedAt) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: ONLY_UNCLAIMED_RENAMABLE_MESSAGE,
    });
  }

  const allowed = await mayRenameUnclaimedPlayer(database, {
    playerId: player.id,
    adderId: player.addedByUserId,
    callerId: args.callerUserId,
  });
  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: RENAME_NOT_ALLOWED_MESSAGE,
    });
  }

  const [updated] = await database
    .update(user)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(user.id, player.id), unclaimedUserSql))
    .returning({ id: user.id, name: user.name });
  if (!updated) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: ONLY_UNCLAIMED_RENAMABLE_MESSAGE,
    });
  }

  return { userId: updated.id, name: updated.name };
}

export const renameUnclaimedPlayerProcedure = protectedProcedure
  .input(renameUnclaimedPlayerInput)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return renameUnclaimedPlayer(ctx.db, {
      callerUserId: appUser.id,
      userId: input.userId,
      name: input.name,
    });
  });

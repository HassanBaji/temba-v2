import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { gamePlayers, games, gameWaitlist, groupMembers, user } from "@repo/db";

import { UNCLAIMED_PLAYER_NAME_MAX_LENGTH } from "@repo/domain/add-player-by-phone";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isGameOrganizer } from "#src/games/access";
import { isGroupApprover } from "#src/groups/helpers/is-group-approver";
import {
  isUnclaimed,
  unclaimedUserSql,
} from "#src/unclaimed-players/is-unclaimed";

type DbClient = typeof db;

export const RENAME_NOT_ALLOWED_MESSAGE =
  "Only an Organizer or Group approver where they play can edit their name";

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

async function organizesAGameTheyAreOn(
  database: DbClient,
  playerId: string,
  callerId: string,
) {
  const [seated, waitlisted] = await Promise.all([
    database
      .select({ gameId: gamePlayers.gameId })
      .from(gamePlayers)
      .where(eq(gamePlayers.userId, playerId)),
    database
      .select({ gameId: gameWaitlist.gameId })
      .from(gameWaitlist)
      .where(eq(gameWaitlist.userId, playerId)),
  ]);
  const gameIds = [
    ...new Set([...seated, ...waitlisted].map((row) => row.gameId)),
  ];
  if (gameIds.length === 0) {
    return false;
  }
  const gameRows = await database
    .select({ createdBy: games.createdBy, groupId: games.groupId })
    .from(games)
    .where(inArray(games.id, gameIds));
  for (const game of gameRows) {
    if (await isGameOrganizer(database, game, callerId)) {
      return true;
    }
  }
  return false;
}

async function approvesAGroupTheyAreIn(
  database: DbClient,
  playerId: string,
  callerId: string,
) {
  const memberships = await database.query.groupMembers.findMany({
    where: eq(groupMembers.userId, playerId),
    columns: { id: true },
    with: { group: true },
  });
  for (const { group } of memberships) {
    if (await isGroupApprover(database, group, callerId)) {
      return true;
    }
  }
  return false;
}

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
    columns: { id: true, clerkId: true, addedAt: true, claimedAt: true },
  });
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Player not found" });
  }

  const allowed =
    (await organizesAGameTheyAreOn(database, player.id, args.callerUserId)) ||
    (await approvesAGroupTheyAreIn(database, player.id, args.callerUserId));
  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: RENAME_NOT_ALLOWED_MESSAGE,
    });
  }

  if (!isUnclaimed(player) || player.claimedAt) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: ONLY_UNCLAIMED_RENAMABLE_MESSAGE,
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

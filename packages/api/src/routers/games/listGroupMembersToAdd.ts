import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  gamePlayers,
  gameWaitlist,
  groupMembers,
  groups,
  ratings,
} from "@repo/db";

import type {
  FootballPosition,
  FootballRole,
} from "@repo/domain/football-lineup";
import { isFootballGame } from "@repo/domain/game-shape";
import type { LevelBand } from "@repo/domain/level-bands";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import { assertOrganizerAddFormat } from "#src/games/assert-organizer-add-format";
import { remainingCapacity } from "#src/games/seats";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";

type DbClient = typeof db;

export type GroupMemberToAddStatus = "in_game" | "waitlisted" | null;

export type GroupMemberToAdd = {
  userId: string;
  name: string;
  image: string | null;
  unclaimed: boolean;
  levelBand: LevelBand | null;
  footballRole: FootballRole | null;
  footballPosition: FootballPosition | null;
  status: GroupMemberToAddStatus;
};

export type ListGroupMembersToAddResult = {
  groupName: string;
  openSpots: number;
  members: GroupMemberToAdd[];
} | null;

/** The Game's Group members, for the Organizer's Add player sheet. Null without a Group. */
export async function listGroupMembersToAdd(
  database: DbClient,
  args: { gameId: string; organizerUserId: string },
): Promise<ListGroupMembersToAddResult> {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.organizerUserId);
  assertOrganizerAddFormat(game);
  if (!game.groupId) {
    return null;
  }

  const group = await database.query.groups.findFirst({
    where: eq(groups.id, game.groupId),
    columns: { name: true },
  });
  const rows = await database.query.groupMembers.findMany({
    where: eq(groupMembers.groupId, game.groupId),
    columns: { userId: true },
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          image: true,
          clerkId: true,
          addedAt: true,
          preferredFootballRole: true,
          preferredFootballPosition: true,
        },
      },
    },
  });
  const userIds = rows.map((row) => row.userId);
  const [seated, waitlisted, levels] =
    userIds.length === 0
      ? [[], [], []]
      : await Promise.all([
          database.query.gamePlayers.findMany({
            where: and(
              eq(gamePlayers.gameId, game.id),
              inArray(gamePlayers.userId, userIds),
            ),
            columns: { userId: true },
          }),
          database.query.gameWaitlist.findMany({
            where: and(
              eq(gameWaitlist.gameId, game.id),
              inArray(gameWaitlist.userId, userIds),
            ),
            columns: { userId: true },
          }),
          database.query.ratings.findMany({
            where: and(
              inArray(ratings.userId, userIds),
              eq(ratings.sport, isFootballGame(game) ? "football" : "padel"),
            ),
            columns: { userId: true, levelBand: true },
          }),
        ]);
  const seatedIds = new Set(seated.map((row) => row.userId));
  const waitlistedIds = new Set(waitlisted.map((row) => row.userId));
  const levelByUserId = new Map(
    levels.map((row) => [row.userId, row.levelBand]),
  );

  const members = rows
    .map(
      ({ user }): GroupMemberToAdd => ({
        userId: user.id,
        name: user.name,
        image: user.image ?? null,
        unclaimed: isUnclaimed(user),
        levelBand: levelByUserId.get(user.id) ?? null,
        footballRole: user.preferredFootballRole ?? null,
        footballPosition: user.preferredFootballPosition ?? null,
        status: seatedIds.has(user.id)
          ? "in_game"
          : waitlistedIds.has(user.id)
            ? "waitlisted"
            : null,
      }),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    groupName: group?.name ?? "",
    openSpots: Math.max(0, await remainingCapacity(database, game)),
    members,
  };
}

export const listGroupMembersToAddProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listGroupMembersToAdd(ctx.db, {
      gameId: input.gameId,
      organizerUserId: appUser.id,
    });
  });

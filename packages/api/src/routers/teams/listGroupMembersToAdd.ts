import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { groupMembers, ratings } from "@repo/db";
import type {
  FootballPosition,
  FootballRole,
} from "@repo/domain/football-lineup";
import type { LevelBand } from "@repo/domain/level-bands";
import { sportOrDefault } from "@repo/domain/sport";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { mayOrganizeGroupGames } from "#src/groups/helpers/may-organize-group-games";
import { requireGroup } from "#src/groups/helpers/require-group";
import { listTeamMembers } from "#src/teams/helpers/list-team-members";
import { requireTeam } from "#src/teams/helpers/require-team";
import { unusedLookupInvitesForTeam } from "#src/teams/helpers/unused-invites-for-team";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";

type DbClient = typeof db;

export type TeamGroupMemberToAdd = {
  userId: string;
  name: string;
  image: string | null;
  unclaimed: boolean;
  levelBand: LevelBand | null;
  footballRole: FootballRole | null;
  footballPosition: FootballPosition | null;
  invited: boolean;
};

/**
 * Members of a Group the viewer organizes, for the From a group tab. People
 * already on the Roster are left out; an unused invite is marked.
 */
export async function listGroupMembersToAdd(
  database: DbClient,
  args: { groupId: string; teamId?: string; userId: string },
) {
  const group = await requireGroup(database, args.groupId);
  if (!(await mayOrganizeGroupGames(database, group, args.userId))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the Group's Organizers can add its members",
    });
  }

  const team = args.teamId ? await requireTeam(database, args.teamId) : null;
  if (team && team.createdBy !== args.userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the Captain can add players",
    });
  }
  if (team && team.sport !== group.sport) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Pick a Group of the Team's sport",
    });
  }

  const [rosterIds, invitedIds] = team
    ? await Promise.all([
        listTeamMembers(database, team.id).then(
          (rows) => new Set(rows.map((row) => row.userId)),
        ),
        unusedLookupInvitesForTeam(database, team.id).then(
          (rows) => new Set(rows.map((row) => row.userId)),
        ),
      ])
    : [new Set([args.userId]), new Set<string>()];

  const rows = await database.query.groupMembers.findMany({
    where: eq(groupMembers.groupId, group.id),
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
  const candidates = rows.filter(
    (row) => !rosterIds.has(row.userId) && row.userId !== args.userId,
  );
  const userIds = candidates.map((row) => row.userId);
  const levels =
    userIds.length === 0
      ? []
      : await database.query.ratings.findMany({
          where: and(
            inArray(ratings.userId, userIds),
            eq(ratings.sport, sportOrDefault(group.sport)),
          ),
          columns: { userId: true, levelBand: true },
        });
  const levelByUserId = new Map(
    levels.map((row) => [row.userId, row.levelBand]),
  );

  const members = candidates
    .map(
      ({ user }): TeamGroupMemberToAdd => ({
        userId: user.id,
        name: user.name,
        image: user.image ?? null,
        unclaimed: isUnclaimed(user),
        levelBand: levelByUserId.get(user.id) ?? null,
        footballRole: user.preferredFootballRole ?? null,
        footballPosition: user.preferredFootballPosition ?? null,
        invited: invitedIds.has(user.id),
      }),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    groupId: group.id,
    groupName: group.name,
    members,
  };
}

export const listGroupMembersToAddProcedure = protectedProcedure
  .input(
    z.object({
      groupId: z.string().uuid(),
      teamId: z.string().uuid().optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listGroupMembersToAdd(ctx.db, {
      groupId: input.groupId,
      teamId: input.teamId,
      userId: appUser.id,
    });
  });

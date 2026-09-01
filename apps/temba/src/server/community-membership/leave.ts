import { and, eq, inArray } from "drizzle-orm";

import {
  communityJoinRequests,
  communityMembers,
  CommunityRoleEnum,
  groupMembers,
  groups,
  teamMembers,
  teams,
} from "@repo/db";

import { type db } from "~/server/db";
import type {
  LeaveArgs,
  LeaveResult,
  MembershipDb,
} from "~/server/community-membership/utils";

function writeDb(database: MembershipDb): typeof db {
  return database as typeof db;
}

async function lockOwnersForUpdate(
  database: MembershipDb,
  communityId: string,
) {
  return writeDb(database)
    .select({ id: communityMembers.id })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.role, CommunityRoleEnum.OWNER),
      ),
    )
    .for("update");
}

export async function leave(
  database: MembershipDb,
  args: LeaveArgs,
): Promise<LeaveResult> {
  const membership = await database.query.communityMembers.findFirst({
    where: and(
      eq(communityMembers.communityId, args.communityId),
      eq(communityMembers.userId, args.userId),
    ),
  });
  if (!membership) {
    return { ok: false, reason: "not_a_member" };
  }

  const teamSeats = await database.query.teamMembers.findMany({
    where: eq(teamMembers.userId, args.userId),
    columns: { teamId: true },
  });
  const linkedTeamIds = teamSeats.map((row) => row.teamId);
  if (linkedTeamIds.length > 0) {
    const linkedSeat = await database.query.teams.findFirst({
      where: and(
        eq(teams.communityId, args.communityId),
        inArray(teams.id, linkedTeamIds),
      ),
      columns: { id: true },
    });
    if (linkedSeat) {
      return { ok: false, reason: "linked_team_seat" };
    }
  }

  if (membership.role === "owner") {
    const owners = await lockOwnersForUpdate(database, args.communityId);
    if (owners.length <= 1) {
      return { ok: false, reason: "last_owner" };
    }
  }

  const clubGroups = await database.query.groups.findMany({
    where: eq(groups.communityId, args.communityId),
    columns: { id: true },
  });
  if (clubGroups.length > 0) {
    await writeDb(database)
      .delete(groupMembers)
      .where(
        and(
          eq(groupMembers.userId, args.userId),
          inArray(
            groupMembers.groupId,
            clubGroups.map((group) => group.id),
          ),
        ),
      );
  }

  await writeDb(database)
    .delete(communityMembers)
    .where(eq(communityMembers.id, membership.id));

  await writeDb(database)
    .delete(communityJoinRequests)
    .where(
      and(
        eq(communityJoinRequests.communityId, args.communityId),
        eq(communityJoinRequests.userId, args.userId),
      ),
    );

  return {
    ok: true,
    communityId: args.communityId,
    userId: args.userId,
  };
}

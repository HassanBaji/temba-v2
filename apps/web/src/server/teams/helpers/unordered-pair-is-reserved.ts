import { and, eq, inArray, isNull, or } from "drizzle-orm";

import { teamMemberInvites, teamMembers } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Global unordered pair is reserved when both Users sit on the same Team,
 * or an unused in-app invite targets one User from a Team the other sits on.
 */
export async function unorderedPairIsReserved(
  database: DbClient,
  userIdA: string,
  userIdB: string,
  excludeInviteId?: string,
) {
  if (userIdA === userIdB) {
    return true;
  }

  const aMemberships = await database.query.teamMembers.findMany({
    where: eq(teamMembers.userId, userIdA),
    columns: { teamId: true },
  });
  const aTeamIds = aMemberships.map((row) => row.teamId);

  if (aTeamIds.length > 0) {
    const shared = await database.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.userId, userIdB),
        inArray(teamMembers.teamId, aTeamIds),
      ),
      columns: { id: true },
    });
    if (shared) {
      return true;
    }
  }

  const pending = await database.query.teamMemberInvites.findMany({
    where: and(
      or(
        eq(teamMemberInvites.userId, userIdA),
        eq(teamMemberInvites.userId, userIdB),
      ),
      isNull(teamMemberInvites.acceptedAt),
      isNull(teamMemberInvites.revokedAt),
    ),
    columns: { id: true, teamId: true, userId: true },
  });

  const pendingExceptCurrent = excludeInviteId
    ? pending.filter((row) => row.id !== excludeInviteId)
    : pending;

  if (pendingExceptCurrent.length === 0) {
    return false;
  }

  const pendingTeamIds = [
    ...new Set(pendingExceptCurrent.map((row) => row.teamId)),
  ];
  const pendingMembers = await database.query.teamMembers.findMany({
    where: inArray(teamMembers.teamId, pendingTeamIds),
    columns: { teamId: true, userId: true },
  });

  const membersByTeam = new Map<string, string[]>();
  for (const row of pendingMembers) {
    const list = membersByTeam.get(row.teamId) ?? [];
    list.push(row.userId);
    membersByTeam.set(row.teamId, list);
  }

  for (const invite of pendingExceptCurrent) {
    const members = membersByTeam.get(invite.teamId) ?? [];
    const inviteeIsA = invite.userId === userIdA;
    const otherId = inviteeIsA ? userIdB : userIdA;
    if (members.includes(otherId)) {
      return true;
    }
  }

  return false;
}

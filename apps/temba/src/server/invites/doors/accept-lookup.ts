import { and, eq, isNull } from "drizzle-orm";

import {
  communityMemberInvites,
  communityMembers,
  CommunityRoleEnum,
  gameMemberInvites,
  groupMemberInvites,
  groupMembers,
  groups,
  teamMemberInvites,
  teamMembers,
} from "@repo/db";

import { type db } from "~/server/db";
import { admit as admitCommunityMember } from "~/server/community-membership";
import { isStaffRole, requireGame } from "~/server/games/access";
import { admitIndividualUser } from "~/server/games/invites";
import { isIndividualSeatGame } from "~/server/games/seats";
import { loadLookupInvite } from "~/server/invites/doors/helpers/load-lookup-invite";
import { writeDb } from "~/server/invites/doors/helpers/write-db";
import { assertInviteOpen } from "~/server/invites/doors/consult";
import type {
  AcceptLookupResult,
  AcceptSeat,
  InviteDb,
  InviteHost,
} from "~/server/invites/doors/utils";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function markLookupAccepted(
  database: InviteDb,
  host: InviteHost,
  inviteId: string,
) {
  if (host.kind === "community") {
    const [updated] = await writeDb(database)
      .update(communityMemberInvites)
      .set({ acceptedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(communityMemberInvites.id, inviteId),
          isNull(communityMemberInvites.acceptedAt),
          isNull(communityMemberInvites.revokedAt),
        ),
      )
      .returning({ id: communityMemberInvites.id });
    return Boolean(updated);
  }
  if (host.kind === "group") {
    const [updated] = await writeDb(database)
      .update(groupMemberInvites)
      .set({ acceptedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(groupMemberInvites.id, inviteId),
          isNull(groupMemberInvites.acceptedAt),
          isNull(groupMemberInvites.revokedAt),
        ),
      )
      .returning({ id: groupMemberInvites.id });
    return Boolean(updated);
  }
  if (host.kind === "team") {
    const [updated] = await writeDb(database)
      .update(teamMemberInvites)
      .set({ acceptedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(teamMemberInvites.id, inviteId),
          isNull(teamMemberInvites.acceptedAt),
          isNull(teamMemberInvites.revokedAt),
        ),
      )
      .returning({ id: teamMemberInvites.id });
    return Boolean(updated);
  }
  const [updated] = await writeDb(database)
    .update(gameMemberInvites)
    .set({ acceptedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(gameMemberInvites.id, inviteId),
        isNull(gameMemberInvites.acceptedAt),
        isNull(gameMemberInvites.revokedAt),
      ),
    )
    .returning({ id: gameMemberInvites.id });
  return Boolean(updated);
}

export async function acceptLookup(
  database: InviteDb,
  host: InviteHost,
  args: { inviteId: string; userId: string; seat?: AcceptSeat },
): Promise<AcceptLookupResult> {
  const invite = await loadLookupInvite(database, host, args.inviteId);
  if (!invite || invite.acceptedAt || invite.revokedAt) {
    return { ok: false, reason: "unavailable" };
  }
  if (invite.userId !== args.userId) {
    return { ok: false, reason: "wrong_user" };
  }

  const open = await assertInviteOpen(database, host, "accept");
  if (!open.ok) {
    return open;
  }

  if (host.kind === "community") {
    const admitted = await admitCommunityMember(database, {
      communityId: host.id,
      userId: args.userId,
      role: CommunityRoleEnum.MEMBER,
    });
    if (!admitted.ok && admitted.reason !== "already_member") {
      return { ok: false, reason: "not_found" };
    }
    if (!(await markLookupAccepted(database, host, args.inviteId))) {
      return { ok: false, reason: "unavailable" };
    }
    return {
      ok: true,
      alreadyMember: !admitted.ok,
      hostId: host.id,
    };
  }

  if (host.kind === "group") {
    const group = await database.query.groups.findFirst({
      where: eq(groups.id, host.id),
      columns: { id: true, communityId: true },
    });
    if (!group) {
      return { ok: false, reason: "not_found" };
    }
    const existing = await database.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, host.id),
        eq(groupMembers.userId, args.userId),
      ),
      columns: { id: true },
    });
    if (existing) {
      await markLookupAccepted(database, host, args.inviteId);
      return { ok: true, alreadyMember: true, hostId: host.id };
    }

    if (group.communityId) {
      const inviterMembership = await database.query.communityMembers.findFirst(
        {
          where: and(
            eq(communityMembers.communityId, group.communityId),
            eq(communityMembers.userId, invite.invitedBy),
          ),
          columns: { role: true },
        },
      );
      const inviteeMembership = await database.query.communityMembers.findFirst(
        {
          where: and(
            eq(communityMembers.communityId, group.communityId),
            eq(communityMembers.userId, args.userId),
          ),
          columns: { id: true },
        },
      );
      const canAutoAdmit = isStaffRole(inviterMembership?.role);
      if (!inviteeMembership && !canAutoAdmit) {
        return { ok: false, reason: "must_be_member" };
      }
      if (!inviteeMembership && canAutoAdmit) {
        const admitted = await admitCommunityMember(database, {
          communityId: group.communityId,
          userId: args.userId,
          role: CommunityRoleEnum.MEMBER,
        });
        if (!admitted.ok && admitted.reason !== "already_member") {
          return { ok: false, reason: "not_found" };
        }
      }
    }

    if (!(await markLookupAccepted(database, host, args.inviteId))) {
      return { ok: false, reason: "unavailable" };
    }
    await writeDb(database).insert(groupMembers).values({
      groupId: host.id,
      userId: args.userId,
    });
    return { ok: true, alreadyMember: false, hostId: host.id };
  }

  if (host.kind === "team") {
    const existing = await database.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, host.id),
        eq(teamMembers.userId, args.userId),
      ),
      columns: { id: true },
    });
    if (existing) {
      await markLookupAccepted(database, host, args.inviteId);
      return { ok: true, alreadyMember: true, hostId: host.id };
    }
    if (!(await markLookupAccepted(database, host, args.inviteId))) {
      return { ok: false, reason: "unavailable" };
    }
    await writeDb(database).insert(teamMembers).values({
      teamId: host.id,
      userId: args.userId,
    });
    return { ok: true, alreadyMember: false, hostId: host.id };
  }

  const game = await requireGame(writeDb(database), host.id);
  if (isIndividualSeatGame(game) && !args.seat) {
    return { ok: false, reason: "seat_required" };
  }
  if (!(await markLookupAccepted(database, host, args.inviteId))) {
    return { ok: false, reason: "unavailable" };
  }
  const occupancy = await admitIndividualUser(
    database as Tx,
    game,
    args.userId,
    new Date(),
    args.seat,
  );
  return {
    ok: true,
    alreadyMember: false,
    waitlisted: occupancy.waitlisted,
    hostId: host.id,
  };
}

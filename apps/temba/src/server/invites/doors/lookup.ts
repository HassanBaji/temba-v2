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
import { assertInviteOpen } from "~/server/invites/doors/consult";
import type {
  AcceptLookupResult,
  AcceptSeat,
  InviteDb,
  InviteHost,
  LookupListItem,
  MintLookupResult,
  RevokeLookupResult,
} from "~/server/invites/doors/types";

function writeDb(database: InviteDb): typeof db {
  return database as typeof db;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function mintLookup(
  database: InviteDb,
  host: InviteHost,
  args: { userId: string; invitedBy: string },
): Promise<MintLookupResult> {
  const open = await assertInviteOpen(database, host, "mint");
  if (!open.ok) {
    return open;
  }

  const unused = await findUnusedLookup(database, host, args.userId);
  if (unused) {
    return { ok: false, reason: "unused_exists" };
  }

  if (host.kind === "community") {
    const [created] = await writeDb(database)
      .insert(communityMemberInvites)
      .values({
        communityId: host.id,
        userId: args.userId,
        invitedBy: args.invitedBy,
      })
      .returning();
    if (!created) {
      return { ok: false, reason: "insert_failed" };
    }
    return {
      ok: true,
      invite: {
        id: created.id,
        hostId: created.communityId,
        userId: created.userId,
        createdAt: created.createdAt,
      },
    };
  }

  if (host.kind === "group") {
    const [created] = await writeDb(database)
      .insert(groupMemberInvites)
      .values({
        groupId: host.id,
        userId: args.userId,
        invitedBy: args.invitedBy,
      })
      .returning();
    if (!created) {
      return { ok: false, reason: "insert_failed" };
    }
    return {
      ok: true,
      invite: {
        id: created.id,
        hostId: created.groupId,
        userId: created.userId,
        createdAt: created.createdAt,
      },
    };
  }

  if (host.kind === "team") {
    const [created] = await writeDb(database)
      .insert(teamMemberInvites)
      .values({
        teamId: host.id,
        userId: args.userId,
        invitedBy: args.invitedBy,
      })
      .returning();
    if (!created) {
      return { ok: false, reason: "insert_failed" };
    }
    return {
      ok: true,
      invite: {
        id: created.id,
        hostId: created.teamId,
        userId: created.userId,
        createdAt: created.createdAt,
      },
    };
  }

  const [created] = await writeDb(database)
    .insert(gameMemberInvites)
    .values({
      gameId: host.id,
      userId: args.userId,
      invitedBy: args.invitedBy,
    })
    .returning();
  if (!created) {
    return { ok: false, reason: "insert_failed" };
  }
  return {
    ok: true,
    invite: {
      id: created.id,
      hostId: created.gameId,
      userId: created.userId,
      createdAt: created.createdAt,
    },
  };
}

async function findUnusedLookup(
  database: InviteDb,
  host: InviteHost,
  userId: string,
) {
  if (host.kind === "community") {
    return database.query.communityMemberInvites.findFirst({
      where: and(
        eq(communityMemberInvites.communityId, host.id),
        eq(communityMemberInvites.userId, userId),
        isNull(communityMemberInvites.acceptedAt),
        isNull(communityMemberInvites.revokedAt),
      ),
      columns: { id: true },
    });
  }
  if (host.kind === "group") {
    return database.query.groupMemberInvites.findFirst({
      where: and(
        eq(groupMemberInvites.groupId, host.id),
        eq(groupMemberInvites.userId, userId),
        isNull(groupMemberInvites.acceptedAt),
        isNull(groupMemberInvites.revokedAt),
      ),
      columns: { id: true },
    });
  }
  if (host.kind === "team") {
    return database.query.teamMemberInvites.findFirst({
      where: and(
        eq(teamMemberInvites.teamId, host.id),
        eq(teamMemberInvites.userId, userId),
        isNull(teamMemberInvites.acceptedAt),
        isNull(teamMemberInvites.revokedAt),
      ),
      columns: { id: true },
    });
  }
  return database.query.gameMemberInvites.findFirst({
    where: and(
      eq(gameMemberInvites.gameId, host.id),
      eq(gameMemberInvites.userId, userId),
      isNull(gameMemberInvites.acceptedAt),
      isNull(gameMemberInvites.revokedAt),
    ),
    columns: { id: true },
  });
}

export async function listLookup(
  database: InviteDb,
  host: InviteHost,
): Promise<LookupListItem[]> {
  if (host.kind === "community") {
    const rows = await database.query.communityMemberInvites.findMany({
      where: and(
        eq(communityMemberInvites.communityId, host.id),
        isNull(communityMemberInvites.acceptedAt),
        isNull(communityMemberInvites.revokedAt),
      ),
      with: { user: true },
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
    return rows.map((row) => mapLookupRow(row));
  }
  if (host.kind === "group") {
    const rows = await database.query.groupMemberInvites.findMany({
      where: and(
        eq(groupMemberInvites.groupId, host.id),
        isNull(groupMemberInvites.acceptedAt),
        isNull(groupMemberInvites.revokedAt),
      ),
      with: { user: true },
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
    return rows.map((row) => mapLookupRow(row));
  }
  if (host.kind === "team") {
    const rows = await database.query.teamMemberInvites.findMany({
      where: and(
        eq(teamMemberInvites.teamId, host.id),
        isNull(teamMemberInvites.acceptedAt),
        isNull(teamMemberInvites.revokedAt),
      ),
      with: { user: true },
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
    return rows.map((row) => mapLookupRow(row));
  }
  const rows = await database.query.gameMemberInvites.findMany({
    where: and(
      eq(gameMemberInvites.gameId, host.id),
      isNull(gameMemberInvites.acceptedAt),
      isNull(gameMemberInvites.revokedAt),
    ),
    with: { user: true },
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });
  return rows.map((row) => mapLookupRow(row));
}

function mapLookupRow(row: {
  id: string;
  createdAt: Date;
  user: { id: string; name: string; email: string };
}): LookupListItem {
  return {
    id: row.id,
    createdAt: row.createdAt,
    user: {
      id: row.user.id,
      name: row.user.name,
      email: row.user.email,
    },
  };
}

export async function revokeLookup(
  database: InviteDb,
  host: InviteHost,
  inviteId: string,
): Promise<RevokeLookupResult> {
  const open = await assertInviteOpen(database, host, "mint");
  if (!open.ok) {
    return { ok: false, reason: "not_found" };
  }

  const invite = await loadLookupInvite(database, host, inviteId);
  if (!invite) {
    return { ok: false, reason: "not_found" };
  }
  if (invite.acceptedAt) {
    return { ok: false, reason: "already_accepted" };
  }
  if (invite.revokedAt) {
    return { ok: true };
  }

  if (host.kind === "community") {
    await writeDb(database)
      .update(communityMemberInvites)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(communityMemberInvites.id, inviteId));
  } else if (host.kind === "group") {
    await writeDb(database)
      .update(groupMemberInvites)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(groupMemberInvites.id, inviteId));
  } else if (host.kind === "team") {
    await writeDb(database)
      .update(teamMemberInvites)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(teamMemberInvites.id, inviteId));
  } else {
    await writeDb(database)
      .update(gameMemberInvites)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(gameMemberInvites.id, inviteId));
  }
  return { ok: true };
}

async function loadLookupInvite(
  database: InviteDb,
  host: InviteHost,
  inviteId: string,
) {
  if (host.kind === "community") {
    return database.query.communityMemberInvites.findFirst({
      where: and(
        eq(communityMemberInvites.id, inviteId),
        eq(communityMemberInvites.communityId, host.id),
      ),
    });
  }
  if (host.kind === "group") {
    return database.query.groupMemberInvites.findFirst({
      where: and(
        eq(groupMemberInvites.id, inviteId),
        eq(groupMemberInvites.groupId, host.id),
      ),
    });
  }
  if (host.kind === "team") {
    return database.query.teamMemberInvites.findFirst({
      where: and(
        eq(teamMemberInvites.id, inviteId),
        eq(teamMemberInvites.teamId, host.id),
      ),
    });
  }
  return database.query.gameMemberInvites.findFirst({
    where: and(
      eq(gameMemberInvites.id, inviteId),
      eq(gameMemberInvites.gameId, host.id),
    ),
  });
}

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

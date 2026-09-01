import { and, eq, isNull } from "drizzle-orm";

import {
  communityMemberInvites,
  gameMemberInvites,
  groupMemberInvites,
  teamMemberInvites,
} from "@repo/db";

import { writeDb } from "~/server/invites/doors/helpers/write-db";
import { assertInviteOpen } from "~/server/invites/doors/consult";
import type {
  InviteDb,
  InviteHost,
  MintLookupResult,
} from "~/server/invites/doors/types";

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

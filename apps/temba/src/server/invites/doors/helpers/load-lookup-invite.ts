import { and, eq } from "drizzle-orm";

import {
  communityMemberInvites,
  gameMemberInvites,
  groupMemberInvites,
  teamMemberInvites,
} from "@repo/db";

import type { InviteDb, InviteHost } from "~/server/invites/doors/types";

export async function loadLookupInvite(
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

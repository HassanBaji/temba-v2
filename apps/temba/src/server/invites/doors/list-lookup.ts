import { and, eq, isNull } from "drizzle-orm";

import {
  communityMemberInvites,
  gameMemberInvites,
  groupMemberInvites,
  teamMemberInvites,
} from "@repo/db";

import type {
  InviteDb,
  InviteHost,
  LookupListItem,
} from "~/server/invites/doors/utils";

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

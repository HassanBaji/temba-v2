import { and, eq, gt } from "drizzle-orm";

import {
  communityInviteLinks,
  gameInviteLinks,
  groupInviteLinks,
  teamInviteLinks,
} from "@repo/db";

import type { InviteDb, InviteHost } from "~/server/invites/doors/types";

export async function getLiveLink(database: InviteDb, host: InviteHost) {
  const now = new Date();
  if (host.kind === "community") {
    return database.query.communityInviteLinks.findFirst({
      where: and(
        eq(communityInviteLinks.communityId, host.id),
        gt(communityInviteLinks.expiresAt, now),
      ),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
  }
  if (host.kind === "group") {
    return database.query.groupInviteLinks.findFirst({
      where: and(
        eq(groupInviteLinks.groupId, host.id),
        gt(groupInviteLinks.expiresAt, now),
      ),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
  }
  if (host.kind === "team") {
    return database.query.teamInviteLinks.findFirst({
      where: and(
        eq(teamInviteLinks.teamId, host.id),
        gt(teamInviteLinks.expiresAt, now),
      ),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
  }
  return database.query.gameInviteLinks.findFirst({
    where: and(
      eq(gameInviteLinks.gameId, host.id),
      gt(gameInviteLinks.expiresAt, now),
    ),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });
}

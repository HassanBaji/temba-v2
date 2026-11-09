import type { DbClient, DbTx } from "@repo/db";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";

import {
  groupMemberInvites,
  groupMembers,
  GroupTypeEnum,
  venueManagers,
  type groups,
} from "@repo/db";

import { isOperatorPublicMetadata } from "#src/auth/require-operator";

type DbOrTx = DbClient | DbTx;

type GroupForViewer = Pick<
  typeof groups.$inferSelect,
  "id" | "type" | "createdBy" | "venueId"
>;

async function isMember(database: DbOrTx, groupId: string, userId: string) {
  const row = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, userId),
    ),
    columns: { id: true },
  });
  return row !== undefined;
}

async function holdsLiveInvite(
  database: DbOrTx,
  groupId: string,
  userId: string,
) {
  const row = await database.query.groupMemberInvites.findFirst({
    where: and(
      eq(groupMemberInvites.groupId, groupId),
      eq(groupMemberInvites.userId, userId),
      isNull(groupMemberInvites.acceptedAt),
      isNull(groupMemberInvites.revokedAt),
    ),
    columns: { id: true },
  });
  return row !== undefined;
}

async function managesVenue(database: DbOrTx, venueId: string, userId: string) {
  const row = await database.query.venueManagers.findFirst({
    where: and(
      eq(venueManagers.venueId, venueId),
      eq(venueManagers.userId, userId),
    ),
    columns: { id: true },
  });
  return row !== undefined;
}

async function canViewGroup(
  database: DbOrTx,
  group: GroupForViewer,
  userId: string,
  getPublicMetadata?: () => Promise<Record<string, unknown> | undefined>,
) {
  if (group.type === GroupTypeEnum.PUBLIC || group.createdBy === userId) {
    return true;
  }
  if (await isMember(database, group.id, userId)) {
    return true;
  }
  if (await holdsLiveInvite(database, group.id, userId)) {
    return true;
  }
  if (group.venueId && (await managesVenue(database, group.venueId, userId))) {
    return true;
  }
  return getPublicMetadata
    ? isOperatorPublicMetadata(await getPublicMetadata())
    : false;
}

/**
 * A Private Group shows itself to its members, someone holding a live invite
 * to it, the managers of its Venue and Operators. Anyone else gets the
 * NOT_FOUND a missing Group gets, so its id says nothing.
 */
export async function assertCanViewGroup(
  database: DbOrTx,
  group: GroupForViewer,
  userId: string,
  getPublicMetadata?: () => Promise<Record<string, unknown> | undefined>,
) {
  if (await canViewGroup(database, group, userId, getPublicMetadata)) {
    return;
  }
  throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
}

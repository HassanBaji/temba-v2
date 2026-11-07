import type { DbClient, DbTx } from "@repo/db";
import { and, asc, eq, isNull } from "drizzle-orm";

import {
  groupJoinRequests,
  GroupJoinRequestStatusEnum,
  groupMembers,
  groups,
  GroupTypeEnum,
  user,
} from "@repo/db";

import {
  isSeatHoldLive,
  type GameInviteGroup,
  type GameInviteGroupJoinMode,
} from "@repo/domain/invites";

import { isBlockedFromGroup } from "#src/groups/helpers/is-blocked-from-group";

type DbOrTx = DbClient | DbTx;

const MEMBER_NAME_COUNT = 3;

export type GameInviteLinkGroupRow = Pick<
  typeof groups.$inferSelect,
  | "id"
  | "name"
  | "sport"
  | "imageUrl"
  | "type"
  | "requiresApproval"
  | "createdBy"
>;

/** A Group whose Organizers decide: the link opens its request queue, not its door. */
export function groupDecidesJoins(
  group: Pick<GameInviteLinkGroupRow, "type" | "requiresApproval">,
) {
  return group.type === GroupTypeEnum.PUBLIC && group.requiresApproval;
}

export async function loadGameInviteLinkGroup(
  database: DbOrTx,
  groupId: string,
): Promise<GameInviteLinkGroupRow | null> {
  const group = await database.query.groups.findFirst({
    where: and(eq(groups.id, groupId), isNull(groups.deletedAt)),
    columns: {
      id: true,
      name: true,
      sport: true,
      imageUrl: true,
      type: true,
      requiresApproval: true,
      createdBy: true,
    },
  });
  return group ?? null;
}

export async function gameInviteGroupJoinMode(
  database: DbOrTx,
  group: GameInviteLinkGroupRow,
  userId: string,
): Promise<{
  mode: GameInviteGroupJoinMode;
  pending: typeof groupJoinRequests.$inferSelect | null;
}> {
  const membership = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, group.id),
      eq(groupMembers.userId, userId),
    ),
    columns: { id: true },
  });
  if (membership) {
    return { mode: "member", pending: null };
  }
  if (await isBlockedFromGroup(database, group.id, userId)) {
    return { mode: "blocked", pending: null };
  }
  const pending = await database.query.groupJoinRequests.findFirst({
    where: and(
      eq(groupJoinRequests.groupId, group.id),
      eq(groupJoinRequests.userId, userId),
      eq(groupJoinRequests.status, GroupJoinRequestStatusEnum.PENDING),
    ),
  });
  if (pending) {
    return { mode: "requested", pending };
  }
  return { mode: groupDecidesJoins(group) ? "request" : "join", pending: null };
}

/**
 * The Group behind a Game Invite link as the signed-in viewer stands to it:
 * what the join sheet shows and which door it opens.
 */
export async function gameInviteLinkGroup(
  database: DbOrTx,
  args: {
    game: { id: string; groupId: string | null };
    userId: string;
    sharedByUserId: string;
    now?: Date;
  },
): Promise<GameInviteGroup | null> {
  if (!args.game.groupId) {
    return null;
  }
  const group = await loadGameInviteLinkGroup(database, args.game.groupId);
  if (!group) {
    return null;
  }
  const now = args.now ?? new Date();
  const { mode, pending } = await gameInviteGroupJoinMode(
    database,
    group,
    args.userId,
  );
  const members = await database.query.groupMembers.findMany({
    where: eq(groupMembers.groupId, group.id),
    columns: { id: true },
    with: { user: { columns: { name: true } } },
    orderBy: asc(groupMembers.createdAt),
  });
  const sharer = await database.query.user.findFirst({
    where: eq(user.id, args.sharedByUserId),
    columns: { name: true },
  });
  const holdsThisSeat =
    pending?.heldGameId === args.game.id &&
    isSeatHoldLive(pending.seatHeldUntil, now);
  return {
    id: group.id,
    name: group.name,
    sport: group.sport,
    imageUrl: group.imageUrl,
    memberCount: members.length,
    memberNames: members
      .slice(0, MEMBER_NAME_COUNT)
      .flatMap((row) => (row.user?.name ? [row.user.name] : [])),
    joinMode: mode,
    sharedBy: sharer ? { name: sharer.name } : null,
    pendingRequest: pending
      ? {
          id: pending.id,
          seatHeldUntil: holdsThisSeat ? pending.seatHeldUntil : null,
        }
      : null,
  };
}

import type { DbClient, DbTx, games, groups } from "@repo/db";

import { gameAdminUserIds } from "#src/games/access";
import { groupApproverUserIds } from "#src/groups/helpers/is-group-approver";
import { notify } from "#src/notifications/notify";

type DbOrTx = DbClient | DbTx;
type GroupForNotice = Pick<typeof groups.$inferSelect, "id" | "createdBy">;
type GameForNotice = Pick<
  typeof games.$inferSelect,
  "id" | "createdBy" | "groupId" | "challengeId"
>;

/** Group approvers hear that someone asked to join; `gameId` names a Seat hold. */
export async function notifyGroupJoinRequested(
  database: DbOrTx,
  args: {
    group: GroupForNotice;
    requesterUserId: string;
    gameId?: string | null;
  },
) {
  const approverIds = await groupApproverUserIds(database, args.group);
  return notify(database, {
    type: "group_join_requested",
    recipients: approverIds.map((userId) => ({ userId, audience: "admin" })),
    excludeUserIds: [args.requesterUserId],
    actorUserId: args.requesterUserId,
    groupId: args.group.id,
    gameId: args.gameId ?? null,
  });
}

/** The requester hears who decided, and about the Game when a Seat hold was on it. */
export async function notifyGroupJoinDecided(
  database: DbOrTx,
  args: {
    group: GroupForNotice;
    requesterUserId: string;
    deciderUserId: string;
    approved: boolean;
    gameId?: string | null;
  },
) {
  return notify(database, {
    type: args.approved ? "group_join_approved" : "group_join_declined",
    recipients: [{ userId: args.requesterUserId, audience: "player" }],
    excludeUserIds: [args.deciderUserId],
    actorUserId: args.deciderUserId,
    groupId: args.group.id,
    gameId: args.gameId ?? null,
  });
}

/** Game admins hear that a player outside the Level range asked to play. */
export async function notifyLevelRangeRequested(
  database: DbOrTx,
  args: { game: GameForNotice; requesterUserId: string },
) {
  const adminIds = await gameAdminUserIds(database, args.game);
  return notify(database, {
    type: "game_level_range_requested",
    recipients: adminIds.map((userId) => ({ userId, audience: "admin" })),
    excludeUserIds: [args.requesterUserId],
    actorUserId: args.requesterUserId,
    groupId: args.game.groupId,
    gameId: args.game.id,
  });
}

export async function notifyLevelRangeDecided(
  database: DbOrTx,
  args: {
    game: GameForNotice;
    requesterUserId: string;
    deciderUserId: string;
    approved: boolean;
  },
) {
  return notify(database, {
    type: args.approved
      ? "game_level_range_approved"
      : "game_level_range_declined",
    recipients: [{ userId: args.requesterUserId, audience: "player" }],
    excludeUserIds: [args.deciderUserId],
    actorUserId: args.deciderUserId,
    groupId: args.game.groupId,
    gameId: args.game.id,
  });
}

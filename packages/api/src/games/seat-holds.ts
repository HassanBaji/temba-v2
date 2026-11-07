import type { DbClient, DbTx } from "@repo/db";
import { and, eq, gt } from "drizzle-orm";

import {
  groupJoinRequests,
  GroupJoinRequestStatusEnum,
  groups,
  ratings,
} from "@repo/db";

import { isProvisional } from "@repo/domain/level";

import { type GameRow } from "#src/games/access";
import { displayedLevelTenthsForUser } from "#src/games/user-allowed-by-level-range";
import { isGroupApprover } from "#src/groups/helpers/is-group-approver";

type DbOrTx = DbClient | DbTx;

/**
 * The live Seat holds on a Game, for a viewer who may decide them: Group join
 * requests from this Game's Invite link that asked for a seat (ADR-0057).
 */
export async function listGameSeatHolds(
  database: DbOrTx,
  game: GameRow,
  viewerUserId: string,
  now = new Date(),
) {
  if (!game.groupId) {
    return [];
  }
  const group = await database.query.groups.findFirst({
    where: eq(groups.id, game.groupId),
    columns: { id: true, name: true, createdBy: true },
  });
  if (!group || !(await isGroupApprover(database, group, viewerUserId))) {
    return [];
  }
  const rows = await database.query.groupJoinRequests.findMany({
    where: and(
      eq(groupJoinRequests.heldGameId, game.id),
      eq(groupJoinRequests.status, GroupJoinRequestStatusEnum.PENDING),
      gt(groupJoinRequests.seatHeldUntil, now),
    ),
    with: {
      user: { columns: { id: true, name: true, image: true } },
      invitedBy: { columns: { id: true, name: true } },
    },
    orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
  });
  const ratingSport = game.sport === "football" ? "football" : "padel";
  return Promise.all(
    rows.map(async (row) => {
      const rating = await database.query.ratings.findFirst({
        where: and(
          eq(ratings.userId, row.userId),
          eq(ratings.sport, ratingSport),
        ),
        columns: { phi: true },
      });
      return {
        id: row.id,
        createdAt: row.createdAt,
        seatHeldUntil: row.seatHeldUntil,
        user: row.user,
        invitedBy: row.invitedBy,
        groupName: group.name,
        levelTenths: await displayedLevelTenthsForUser(
          database,
          row.userId,
          game.sport,
        ),
        provisional: rating ? isProvisional(rating.phi) : false,
      };
    }),
  );
}

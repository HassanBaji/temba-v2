import type { DbClient, DbTx } from "@repo/db";
import { and, eq, inArray } from "drizzle-orm";

import { groupMembers, groups, type games } from "@repo/db";

import { isGroupApprover } from "#src/groups/helpers/is-group-approver";

type DbOrTx = DbClient | DbTx;

type GameForPhoneNumbers = Pick<
  typeof games.$inferSelect,
  "groupId" | "challengeId"
>;

type PlayerWithPhone = { id: string; phoneNumber: string | null };

/**
 * The numbers a Group approver sees on a Game of their Group (ADR-0078), by
 * user id: one for each other player who is still a member and has a number.
 * Anyone else, a Game outside a Group and a Challenge Game get none. Leaving
 * the Group stops the number going out, even on Games it played.
 */
export async function gameMemberPhoneNumbers(
  database: DbOrTx,
  game: GameForPhoneNumbers,
  viewerUserId: string,
  players: PlayerWithPhone[],
): Promise<Map<string, string>> {
  const numbers = new Map<string, string>();
  const withNumber = players.filter(
    (player): player is { id: string; phoneNumber: string } =>
      player.phoneNumber != null && player.id !== viewerUserId,
  );
  if (!game.groupId || game.challengeId || withNumber.length === 0) {
    return numbers;
  }
  const group = await database.query.groups.findFirst({
    where: eq(groups.id, game.groupId),
    columns: { id: true, createdBy: true },
  });
  if (!group || !(await isGroupApprover(database, group, viewerUserId))) {
    return numbers;
  }
  const memberRows = await database.query.groupMembers.findMany({
    where: and(
      eq(groupMembers.groupId, group.id),
      inArray(
        groupMembers.userId,
        withNumber.map((player) => player.id),
      ),
    ),
    columns: { userId: true },
  });
  const memberIds = new Set(memberRows.map((row) => row.userId));
  for (const player of withNumber) {
    if (memberIds.has(player.id)) {
      numbers.set(player.id, player.phoneNumber);
    }
  }
  return numbers;
}

import type { DbClient, DbTx } from "@repo/db";
import { eq } from "drizzle-orm";

import { groupMembers, groups, type games } from "@repo/db";
import type { MemberNicknameData } from "@repo/domain/member-nickname";

import { isGroupApprover } from "#src/groups/helpers/is-group-approver";
import { visibleMemberNickname } from "#src/groups/helpers/visible-member-nickname";

type DbOrTx = DbClient | DbTx;

type GameForNicknames = Pick<typeof games.$inferSelect, "groupId" | "isPublic">;

/**
 * The Member nicknames a viewer may see on a Game's line-ups and team making,
 * by user id. Only a private Game of a Group, and only for a member of that
 * Group: a public Game never shows them.
 */
export async function gameMemberNicknames(
  database: DbOrTx,
  game: GameForNicknames,
  viewerUserId: string,
): Promise<Map<string, MemberNicknameData>> {
  const nicknames = new Map<string, MemberNicknameData>();
  if (!game.groupId || game.isPublic) {
    return nicknames;
  }
  const group = await database.query.groups.findFirst({
    where: eq(groups.id, game.groupId),
    columns: { id: true, createdBy: true },
  });
  if (!group) {
    return nicknames;
  }
  const rows = await database.query.groupMembers.findMany({
    where: eq(groupMembers.groupId, group.id),
    columns: { userId: true, nickname: true, nicknameVisibility: true },
  });
  if (!rows.some((row) => row.userId === viewerUserId)) {
    return nicknames;
  }
  const viewer = {
    userId: viewerUserId,
    isApprover: await isGroupApprover(database, group, viewerUserId),
  };
  for (const row of rows) {
    const nickname = visibleMemberNickname(row, viewer);
    if (nickname) {
      nicknames.set(row.userId, nickname);
    }
  }
  return nicknames;
}

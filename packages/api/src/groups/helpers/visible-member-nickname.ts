import type { groupMembers } from "@repo/db";

import type { MemberNicknameData } from "@repo/domain/member-nickname";

type NicknameColumns = Pick<
  typeof groupMembers.$inferSelect,
  "nickname" | "nicknameVisibility"
>;

/**
 * The member's nickname as this viewer may see it, or null. A Group approver
 * sees every name, their own included. Another member sees only names set
 * for the whole Group, so an approvers-only name never reaches the member it
 * names. Nobody outside the Group sees any.
 */
export function visibleMemberNickname(
  row: NicknameColumns,
  viewer: { isApprover: boolean; isMember: boolean },
): MemberNicknameData | null {
  if (!row.nickname) {
    return null;
  }
  const visible =
    viewer.isApprover ||
    (viewer.isMember && row.nicknameVisibility === "group");
  return visible
    ? { name: row.nickname, visibility: row.nicknameVisibility }
    : null;
}

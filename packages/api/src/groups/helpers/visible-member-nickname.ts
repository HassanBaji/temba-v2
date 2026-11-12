import type { groupMembers } from "@repo/db";

import {
  memberNicknameIsVisible,
  type MemberNicknameData,
} from "@repo/domain/member-nickname";

type NicknameColumns = Pick<
  typeof groupMembers.$inferSelect,
  "userId" | "nickname" | "nicknameVisibility"
>;

/** The member's nickname as this viewer may see it, or null. */
export function visibleMemberNickname(
  row: NicknameColumns,
  viewer: { userId: string; isApprover: boolean },
): MemberNicknameData | null {
  if (!row.nickname) {
    return null;
  }
  const visible = memberNicknameIsVisible({
    visibility: row.nicknameVisibility,
    viewerIsApprover: viewer.isApprover,
    viewerIsMember: row.userId === viewer.userId,
  });
  return visible
    ? { name: row.nickname, visibility: row.nicknameVisibility }
    : null;
}

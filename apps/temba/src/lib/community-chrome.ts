import { memberCountLabel } from "~/lib/member-count-label";

export type CommunityVisibility = "public" | "private";
export type CommunityRoleName = "owner" | "admin" | "member";

const VISIBILITY_LABELS: Record<CommunityVisibility, string> = {
  public: "Public",
  private: "Private",
};

const ROLE_LABELS: Record<CommunityRoleName, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

export function communityListMetaLine(input: {
  type: CommunityVisibility;
  memberCount: number;
  role: CommunityRoleName;
}) {
  return [
    VISIBILITY_LABELS[input.type],
    memberCountLabel(input.memberCount),
    `you are ${ROLE_LABELS[input.role]}`,
  ].join(", ");
}

export function clubGroupRowMetaLine(input: {
  type: CommunityVisibility | null;
  memberCount: number;
}) {
  const members = memberCountLabel(input.memberCount);
  return input.type ? `${VISIBILITY_LABELS[input.type]}, ${members}` : members;
}

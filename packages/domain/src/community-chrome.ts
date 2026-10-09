import { groupHomeSportLabel } from "./group-home-chrome";
import { memberCountLabel } from "./member-count-label";

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

export function communityHomeMetaLine(input: {
  type: CommunityVisibility;
  sports: readonly string[];
  memberCount: number | null | undefined;
  role: CommunityRoleName | null | undefined;
}) {
  const sports = input.sports
    .map((sport) => groupHomeSportLabel(sport))
    .filter((label): label is string => Boolean(label));

  return [
    VISIBILITY_LABELS[input.type],
    sports.length > 0 ? sports.join(" and ") : null,
    input.memberCount != null ? memberCountLabel(input.memberCount) : null,
    input.role ? ROLE_LABELS[input.role] : null,
  ]
    .filter((part): part is string => part !== null)
    .join(", ");
}

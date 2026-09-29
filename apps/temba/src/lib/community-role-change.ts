export const COMMUNITY_ROLES = ["owner", "admin", "member"] as const;

export type CommunityRoleValue = (typeof COMMUNITY_ROLES)[number];

export function isCommunityRole(value: string): value is CommunityRoleValue {
  return (COMMUNITY_ROLES as readonly string[]).includes(value);
}

export type CommunityRoleChange = {
  name: string;
  isSelf: boolean;
  from: CommunityRoleValue;
  to: CommunityRoleValue;
};

export function roleChangeNeedsConfirmation(change: CommunityRoleChange) {
  if (change.from === change.to) {
    return false;
  }
  return change.to === "owner" || change.isSelf;
}

const ROLE_NAMES: Record<CommunityRoleValue, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

export function roleChangeConfirmCopy(change: CommunityRoleChange) {
  const to = ROLE_NAMES[change.to];
  if (change.isSelf) {
    return {
      title: `Change your role to ${to}?`,
      description:
        "You will no longer be able to change Community roles. Only another Owner can make you an Owner again.",
      confirmLabel: `Become ${to}`,
    };
  }
  return {
    title: `Make ${change.name} an Owner?`,
    description: "Owners can change every member's role, including yours.",
    confirmLabel: "Make Owner",
  };
}

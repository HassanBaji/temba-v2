import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

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

export function roleChangeConfirmCopy(
  change: CommunityRoleChange,
  locale: Locale,
) {
  const m = messagesFor(locale).community;
  const to = m.role[change.to];
  if (change.isSelf) {
    return {
      title: m.roleChange.selfTitle(to),
      description: m.roleChange.selfDescription,
      confirmLabel: m.roleChange.becomeRole(to),
    };
  }
  return {
    title: m.roleChange.makeOwnerTitle(change.name),
    description: m.roleChange.makeOwnerDescription,
    confirmLabel: m.roleChange.makeOwnerLabel,
  };
}

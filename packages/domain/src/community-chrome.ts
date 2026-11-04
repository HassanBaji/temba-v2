import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { groupHomeSportLabel } from "./group-home-chrome";
import { memberCountLabel } from "./member-count-label";

export type CommunityVisibility = "public" | "private";
export type CommunityRoleName = "owner" | "admin" | "member";

export function communityVisibilityLabel(
  type: CommunityVisibility,
  locale: Locale,
) {
  return messagesFor(locale).community.type[type];
}

export function communityRoleLabel(role: CommunityRoleName, locale: Locale) {
  return messagesFor(locale).community.role[role];
}

export function communityListMetaLine(input: {
  type: CommunityVisibility;
  memberCount: number;
  role: CommunityRoleName;
  locale: Locale;
}) {
  const m = messagesFor(input.locale);
  return [
    communityVisibilityLabel(input.type, input.locale),
    memberCountLabel(input.memberCount, input.locale),
    m.community.meta.youAreRole(communityRoleLabel(input.role, input.locale)),
  ].join(m.group.metaSeparator);
}

export function clubGroupRowMetaLine(input: {
  type: CommunityVisibility | null;
  memberCount: number;
  locale: Locale;
}) {
  const members = memberCountLabel(input.memberCount, input.locale);
  return input.type
    ? [communityVisibilityLabel(input.type, input.locale), members].join(
        messagesFor(input.locale).group.metaSeparator,
      )
    : members;
}

export function communityHomeMetaLine(input: {
  type: CommunityVisibility;
  sports: readonly string[];
  memberCount: number | null | undefined;
  role: CommunityRoleName | null | undefined;
  locale: Locale;
}) {
  const m = messagesFor(input.locale);
  const sports = input.sports
    .map((sport) => groupHomeSportLabel(sport, input.locale))
    .filter((label): label is string => Boolean(label));

  return [
    communityVisibilityLabel(input.type, input.locale),
    sports.length > 0
      ? sports.reduce((joined, sport) =>
          m.community.meta.twoSports(joined, sport),
        )
      : null,
    input.memberCount != null
      ? memberCountLabel(input.memberCount, input.locale)
      : null,
    input.role ? communityRoleLabel(input.role, input.locale) : null,
  ]
    .filter((part): part is string => part !== null)
    .join(m.group.metaSeparator);
}

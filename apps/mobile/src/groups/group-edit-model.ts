import type { GroupHomeData } from "@repo/domain/group-data";
import {
  groupEditMetaLine,
  type GroupEditFields,
} from "@repo/domain/group-settings";
import { isSport, sportLabel } from "@repo/domain/sport";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export function groupEditPath(groupId: string) {
  return { pathname: "/groups/edit", params: { groupId } } as const;
}

export function groupEditInitialFields(data: GroupHomeData): GroupEditFields {
  return {
    name: data.name ?? "",
    sport: isSport(data.sport) ? data.sport : null,
    visibility: data.type === "private" ? "private" : "public",
    requiresApproval: data.requiresApproval,
  };
}

export function groupEditSubtitle(data: GroupHomeData, locale: Locale) {
  return groupEditMetaLine({
    name: data.name,
    sportLabel: sportLabel(data.sport, locale),
    memberCount: data.standing.memberCount,
    locale,
  });
}

export function groupEditSaveFooter(dirty: boolean, locale: Locale) {
  const m = messagesFor(locale).group.settings.edit;
  return dirty ? m.unsavedChanges : m.nothingChanged;
}

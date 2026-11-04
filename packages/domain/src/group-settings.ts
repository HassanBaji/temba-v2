import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { groupDisplayName } from "./group-join";
import { memberCountLabel } from "./member-count-label";
import { shortPlayerName } from "./player-name";
import type { Sport } from "./sport";

/**
 * The Group's own settings: the More menu on Group home, Edit Group, delete
 * and transfer ownership (design "Group create and edit flow" 02–04).
 */

export const GROUP_NAME_MAX_LENGTH = 40;

export function groupSportSublabel(sport: Sport, locale: Locale) {
  return messagesFor(locale).group.settings.sportSublabel[sport];
}

export type GroupVisibility = "public" | "private";

export function groupVisibilityCopy(context: "loose" | "club", locale: Locale) {
  const m = messagesFor(locale).group.settings.visibility;
  return {
    public: {
      title: m.public.title,
      description:
        context === "club"
          ? m.public.descriptionClub
          : m.public.descriptionLoose,
    },
    private: {
      title: m.private.title,
      description: m.private.description,
    },
  } as const;
}

/**
 * The line under "Review join requests": what the switch does in its current
 * state, or the requests already waiting when there are some.
 */
export function groupJoiningToggleHelp(input: {
  requiresApproval: boolean;
  pendingRequestCount?: number;
  locale: Locale;
}) {
  const m = messagesFor(input.locale).group.settings.joining;
  const pending = input.pendingRequestCount ?? 0;
  if (pending > 0) {
    return m.requestsWaiting(pending);
  }
  return input.requiresApproval ? m.toggleHelpOn : m.toggleHelpOff;
}

export type GroupMenuItem = "edit" | "invite" | "copy_link" | "leave";

export function groupMenuLabel(item: GroupMenuItem, locale: Locale) {
  const m = messagesFor(locale).group.settings.menu;
  return item === "copy_link" ? m.copyLink : m[item];
}

export function groupMenuItems(input: {
  isMember: boolean;
  canEdit: boolean;
  canInvite: boolean;
  canCopyLink: boolean;
}): GroupMenuItem[] {
  const items: GroupMenuItem[] = [];
  if (input.canEdit) {
    items.push("edit");
  }
  if (input.canInvite) {
    items.push("invite");
  }
  if (input.canCopyLink) {
    items.push("copy_link");
  }
  if (input.isMember) {
    items.push("leave");
  }
  return items;
}

export function groupMenuRoleLine(input: {
  isOwner: boolean;
  isOrganizer: boolean;
  isMember: boolean;
  locale: Locale;
}) {
  const m = messagesFor(input.locale).group.settings.role;
  if (input.isOwner) {
    return m.owner;
  }
  if (input.isOrganizer) {
    return m.organizer;
  }
  return input.isMember ? m.member : null;
}

/**
 * Why Leave is disabled in the More menu, or `null` when it is not: the
 * owner of a Loose Group hands it on first. A Club Group's creator may leave;
 * its Community's Owner and Admin still run it.
 */
export function groupLeaveBlockedHint(input: {
  isOwner: boolean;
  isLoose: boolean;
  locale: Locale;
}) {
  return input.isOwner && input.isLoose
    ? messagesFor(input.locale).group.settings.menu.leaveOwnerHint
    : null;
}

/** The owner cannot leave; the Group would have nobody to run it. */
export function groupOwnerLeaveCopy(
  groupName: string | null | undefined,
  locale: Locale,
) {
  const m = messagesFor(locale).group.settings.ownerLeave;
  return {
    title: m.title(groupDisplayName(groupName, locale)),
    description: m.description,
    confirmLabel: m.confirmLabel,
    cancelLabel: m.cancelLabel,
  };
}

export function groupEditMetaLine(input: {
  name: string | null | undefined;
  sportLabel: string | null;
  memberCount: number;
  locale: Locale;
}) {
  return [
    groupDisplayName(input.name, input.locale),
    input.sportLabel,
    memberCountLabel(input.memberCount, input.locale),
  ]
    .filter(Boolean)
    .join(messagesFor(input.locale).group.metaSeparator);
}

export type GroupEditFields = {
  name: string;
  sport: Sport | null;
  visibility: GroupVisibility;
  requiresApproval: boolean;
};

export type GroupEditChanges = Partial<{
  name: string;
  sport: Sport;
  type: GroupVisibility;
  requiresApproval: boolean;
}>;

/**
 * What Save sends: only the fields that differ from the Group as loaded.
 * `null` when nothing differs. A Private Group never requires approval, so
 * switching to Private sends the toggle off with it.
 */
export function groupEditChanges(
  initial: GroupEditFields,
  draft: GroupEditFields,
): GroupEditChanges | null {
  const changes: GroupEditChanges = {};
  const name = draft.name.trim();
  if (name && name !== initial.name.trim()) {
    changes.name = name;
  }
  if (draft.sport && draft.sport !== initial.sport) {
    changes.sport = draft.sport;
  }
  if (draft.visibility !== initial.visibility) {
    changes.type = draft.visibility;
  }
  const requiresApproval =
    draft.visibility === "public" && draft.requiresApproval;
  if (requiresApproval !== initial.requiresApproval) {
    changes.requiresApproval = requiresApproval;
  }
  return Object.keys(changes).length > 0 ? changes : null;
}

export function groupEditCanSave(
  initial: GroupEditFields,
  draft: GroupEditFields,
) {
  return (
    draft.name.trim().length > 0 && groupEditChanges(initial, draft) != null
  );
}

export function groupNameCounter(name: string) {
  return `${name.length}/${GROUP_NAME_MAX_LENGTH}`;
}

export function groupSeasonCount(
  createdAt: Date | string | null | undefined,
  now = new Date(),
) {
  if (createdAt == null) {
    return 1;
  }
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(created.getTime())) {
    return 1;
  }
  const months =
    (now.getFullYear() - created.getFullYear()) * 12 +
    (now.getMonth() - created.getMonth());
  return Math.max(1, Math.floor(months / 12) + 1);
}

export function groupDeleteSheetCopy(input: {
  name: string | null | undefined;
  gameCount: number;
  memberCount: number;
  seasonCount: number;
  locale: Locale;
}) {
  const m = messagesFor(input.locale).group.settings.delete;
  const name = groupDisplayName(input.name, input.locale);
  return {
    title: m.title(name),
    description: m.description,
    stats: [
      { value: input.gameCount, label: m.gamesStat(input.gameCount) },
      { value: input.memberCount, label: m.membersStat(input.memberCount) },
      { value: input.seasonCount, label: m.seasonsStat(input.seasonCount) },
    ],
    confirmPrompt: m.confirmPrompt,
    confirmPlaceholder: name,
    deleteLabel: m.deleteLabel,
    keepLabel: m.keepLabel,
  };
}

/** Case and surrounding whitespace do not matter; the words do. */
export function groupDeleteNameMatches(
  name: string | null | undefined,
  typed: string,
  locale: Locale,
) {
  return (
    typed.trim().toLowerCase() === groupDisplayName(name, locale).toLowerCase()
  );
}

export function groupTransferOwnershipCopy(
  groupName: string | null | undefined,
  locale: Locale,
) {
  const m = messagesFor(locale);
  return {
    title: m.group.settings.transfer.title,
    description: m.group.settings.transfer.description(
      groupDisplayName(groupName, locale),
    ),
    empty: m.group.settings.transfer.empty,
    confirmLabel: m.group.settings.transfer.confirmLabel,
    cancelLabel: m.common.cancel,
  };
}

export function groupTransferConfirmLabel(
  name: string | null | undefined,
  locale: Locale,
) {
  const m = messagesFor(locale).group.settings.transfer;
  return name ? m.confirmTo(shortPlayerName(name)) : m.confirmLabel;
}

/** Only a signed-up member can own a Group. Never the owner themself. */
export function groupTransferCandidates<
  T extends { isViewer: boolean; unclaimed: boolean },
>(members: readonly T[]): T[] {
  return members.filter((member) => !member.isViewer && !member.unclaimed);
}

export function groupOwnershipTransferredToast(
  name: string | null | undefined,
  groupName: string | null | undefined,
  locale: Locale,
) {
  const m = messagesFor(locale).group.settings.transfer;
  const group = groupDisplayName(groupName, locale);
  return name
    ? m.transferredToast(name, group)
    : m.transferredToastUnnamed(group);
}

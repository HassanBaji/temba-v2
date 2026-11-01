import { groupDisplayName } from "./group-join";
import { memberCountLabel } from "./member-count-label";
import { shortPlayerName } from "./player-name";
import type { Sport } from "./sport";

/**
 * The Group's own settings: the More menu on Group home, Edit Group, delete
 * and transfer ownership (design "Group create and edit flow" 02–04).
 */

export const GROUP_NAME_MAX_LENGTH = 40;

export const GROUP_SPORT_SUBLABELS: Record<Sport, string> = {
  padel: "2 v 2",
  football: "5 to 11 a side",
};

export type GroupVisibility = "public" | "private";

export function groupVisibilityCopy(context: "loose" | "club") {
  return {
    public: {
      title: "Public",
      description:
        context === "club"
          ? "Shows up in search and on the Community."
          : "Shows up in search and on Communities.",
    },
    private: {
      title: "Private",
      description: "Hidden from search. Only people with the link can find it.",
    },
  } as const;
}

export const GROUP_JOINING_COPY = {
  label: "Joining",
  toggle: "Require approval",
  toggleHelp: "Anyone who finds the Group joins instantly.",
  openFooter: "Anyone can find the Group and joins instantly.",
  approvalFooter:
    "Anyone can find the Group. Everyone who joins waits for your approval.",
  privateFooter: "Only people you invite can join.",
} as const;

export function groupJoiningToggleHelp(pendingRequestCount: number) {
  if (pendingRequestCount <= 0) {
    return GROUP_JOINING_COPY.toggleHelp;
  }
  return pendingRequestCount === 1
    ? "1 request waiting on Group home."
    : `${pendingRequestCount} requests waiting on Group home.`;
}

export function groupJoiningFooter(input: {
  visibility: GroupVisibility;
  requiresApproval: boolean;
}) {
  if (input.visibility === "private") {
    return GROUP_JOINING_COPY.privateFooter;
  }
  return input.requiresApproval
    ? GROUP_JOINING_COPY.approvalFooter
    : GROUP_JOINING_COPY.openFooter;
}

export type GroupMenuItem = "edit" | "invite" | "copy_link" | "leave";

export const GROUP_MENU_LABELS: Record<GroupMenuItem, string> = {
  edit: "Edit Group",
  invite: "Invite players",
  copy_link: "Copy Group link",
  leave: "Leave Group",
};

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
}) {
  if (input.isOwner) {
    return "You own this Group";
  }
  if (input.isOrganizer) {
    return "You organize this Group";
  }
  return input.isMember ? "You are a member" : null;
}

export const GROUP_LINK_COPIED_TOAST = "Group link copied";

export const GROUP_LINK_RESET_TOAST = "Link reset. Old links stop working.";

/** The owner cannot leave; the Group would have nobody to run it. */
export function groupOwnerLeaveCopy(groupName: string | null | undefined) {
  return {
    title: `Hand ${groupDisplayName(groupName)} to someone first`,
    description:
      "You own this Group. Transfer ownership to another member before you leave, or delete the Group.",
    confirmLabel: "Transfer ownership",
    cancelLabel: "Not now",
  };
}

export const GROUP_EDIT_COPY = {
  title: "Edit Group",
  nameLabel: "Group name",
  nameHelp: "Members see the new name right away",
  photoChange: "Change",
  photoRemove: "Remove photo",
  sportLabel: "Sport",
  sportLocked: "Locked after the first Game. Standings depend on it.",
  sportOpen: "Locks after the first Game. Standings depend on it.",
  visibilityLabel: "Visibility",
  inviteLinkLabel: "Invite link",
  inviteLinkCopy: "Copy",
  inviteLinkNone: "No live link yet. Create one to share.",
  inviteLinkCreate: "Create link",
  inviteLinkReset: "Reset link. Old links stop working.",
  ownershipLabel: "Ownership",
  transferTitle: "Transfer ownership",
  transferHint: "Hand the Group to another member.",
  deleteTitle: "Delete Group",
  deleteHint: "Removes the Group. Games stay in each player's history.",
  save: "Save changes",
  nothingChanged: "Nothing changed yet.",
  savedToast: "Changes saved",
} as const;

export function groupEditMetaLine(input: {
  name: string | null | undefined;
  sportLabel: string | null;
  memberCount: number;
}) {
  return [
    groupDisplayName(input.name),
    input.sportLabel,
    memberCountLabel(input.memberCount),
  ]
    .filter(Boolean)
    .join(", ");
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
}) {
  const name = groupDisplayName(input.name);
  return {
    title: `Delete ${name}?`,
    description:
      "The Group, its standing and its members go with it. Played Games stay in each player's history. Nobody is notified. This can't be undone.",
    stats: [
      {
        value: input.gameCount,
        label: input.gameCount === 1 ? "Game" : "Games",
      },
      {
        value: input.memberCount,
        label: input.memberCount === 1 ? "member" : "members",
      },
      {
        value: input.seasonCount,
        label: input.seasonCount === 1 ? "season" : "seasons",
      },
    ],
    confirmPrompt: "Type the Group name to confirm",
    confirmPlaceholder: name,
    deleteLabel: "Delete Group",
    keepLabel: "Keep Group",
  };
}

/** Case and surrounding whitespace do not matter; the words do. */
export function groupDeleteNameMatches(
  name: string | null | undefined,
  typed: string,
) {
  return typed.trim().toLowerCase() === groupDisplayName(name).toLowerCase();
}

export function groupTransferOwnershipCopy(
  groupName: string | null | undefined,
) {
  return {
    title: "Transfer ownership",
    description: `Hand ${groupDisplayName(groupName)} to another member. They take over the Group. You stay on as an Organizer.`,
    empty:
      "Nobody else can own this Group yet. Invite a player on Temba first.",
    confirmLabel: "Transfer ownership",
    cancelLabel: "Cancel",
  };
}

export function groupTransferConfirmLabel(name: string | null | undefined) {
  return name ? `Transfer to ${shortPlayerName(name)}` : "Transfer ownership";
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
) {
  return `${name ?? "They"} now own${name ? "s" : ""} ${groupDisplayName(groupName)}`;
}

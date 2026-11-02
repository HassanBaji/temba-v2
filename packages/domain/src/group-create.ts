export type GroupCreateType = "public" | "private";

export type GroupCreateContext = "loose" | "club";

export const GROUP_CREATE_COPY = {
  loose: {
    publicLabel: "Public (anyone with the link)",
    privateLabel: "Private (invite only)",
    publicHelp:
      "Anyone with the Group link can join, or ask to join if you require approval.",
    privateHelp: "Only you can invite people.",
    approvalHelp:
      "People ask to join. You approve or reject them on Group home.",
    submit: "Create Group",
  },
  club: {
    publicLabel: "Public (Community Members)",
    privateLabel: "Private (invite only)",
    publicHelp:
      "Any Community Member can join, or ask to join if you require approval.",
    privateHelp:
      "Owners and Admins can invite anyone. The Group's creator and Organizers can invite Community Members.",
    approvalHelp:
      "Community Members ask to join. You approve or reject them on Group home.",
    submit: "Create Club Group",
  },
} as const;

export const GROUP_CREATE_LOOSE_DESCRIPTION =
  "A Group of people you play with, outside any Community. You join it as its first member.";

export const GROUP_CREATE_CLUB_DESCRIPTION =
  "A Group inside your Community. You join it as its first member.";

export const GROUP_CREATED_TOAST = "Group created";

export function groupCreateRequiresApproval(
  type: GroupCreateType,
  requiresApproval: boolean,
) {
  return type === "public" && requiresApproval;
}

export function groupCreateDoor(
  context: GroupCreateContext,
  type: GroupCreateType,
) {
  if (context === "club") {
    return type === "private" ? "createClubPrivate" : "createClubPublic";
  }
  return type === "private" ? "createLoosePrivate" : "createLoosePublic";
}

export type GroupCreateDoor = ReturnType<typeof groupCreateDoor>;

/** The Create Group screen (design "Group create and edit flow" 01). */
export const GROUP_CREATE_SCREEN = {
  title: "Create Group",
  cancel: "Cancel",
  description: {
    loose:
      "A Group is your regulars: one sport, one standing, as many Games as you like.",
    club: "A Group inside your Community: one sport, one standing, as many Games as you like.",
  },
  photo: "Photo",
  photoHelp: "Optional photo, JPEG or PNG",
  nameLabel: "Group name",
  namePlaceholder: "e.g. Tuesday Padel Crew",
  sportLabel: "Sport",
  visibilityLabel: "Visibility",
  footnote: "You can change all of this later.",
} as const;

export function groupCreateCanSubmit(name: string) {
  return name.trim().length > 0;
}

/** The Create button names the Group once it has a name. */
export function groupCreateSubmitLabel(
  context: GroupCreateContext,
  name: string,
) {
  const trimmed = name.trim();
  return trimmed ? `Create ${trimmed}` : GROUP_CREATE_COPY[context].submit;
}

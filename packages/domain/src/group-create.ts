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
      "Owners and Admins can invite anyone. The Group's creator can invite Community Members.",
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

export const GROUP_CREATE_NOT_AVAILABLE = {
  title: "Creating Groups is not available for your account yet",
  description: "Ask to be set up as a Group creator, or join a Public Group.",
};

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

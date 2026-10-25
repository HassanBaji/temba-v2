import { sportLabel as sportDisplayLabel } from "./sport";

export function groupInviteDisplayName(groupName: string | null | undefined) {
  const trimmed = groupName?.trim();
  if (!trimmed) {
    return "Group";
  }
  return trimmed;
}

export function groupInviteInvitationLine(input: {
  groupName: string | null | undefined;
  sport: string | null | undefined;
}) {
  const name = groupInviteDisplayName(input.groupName);
  const sportLabel = sportDisplayLabel(input.sport);
  return sportLabel
    ? `You are invited to join "${name}" for "${sportLabel}"`
    : `You are invited to join "${name}"`;
}

export function groupInviteClipboardText(input: {
  groupName: string | null | undefined;
  sport: string | null | undefined;
  inviteUrl: string;
}) {
  return `${groupInviteInvitationLine(input)}\nJoin: ${input.inviteUrl}`;
}

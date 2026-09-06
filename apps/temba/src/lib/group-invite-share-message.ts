import { SPORT_LABELS, type SportValue } from "~/components/temba/sport-badge";

function sportDisplayLabel(sport: string | null | undefined) {
  const value = sport?.trim();
  if (!value) {
    return null;
  }
  return value in SPORT_LABELS ? SPORT_LABELS[value as SportValue] : value;
}

export function groupInviteClipboardText(input: {
  groupName: string | null | undefined;
  sport: string | null | undefined;
  inviteUrl: string;
}) {
  const name = input.groupName?.trim() || "Group";
  const sportLabel = sportDisplayLabel(input.sport);
  const invitation = sportLabel
    ? `You are invited to join "${name}" for "${sportLabel}"`
    : `You are invited to join "${name}"`;
  return `${invitation}\nJoin: ${input.inviteUrl}`;
}

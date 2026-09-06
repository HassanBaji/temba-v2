const SPORT_LABELS: Record<string, string> = {
  padel: "Padel",
  football: "Football",
};

function sportDisplayLabel(sport: string | null | undefined) {
  const value = sport?.trim();
  if (!value) {
    return null;
  }
  return SPORT_LABELS[value] ?? value;
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

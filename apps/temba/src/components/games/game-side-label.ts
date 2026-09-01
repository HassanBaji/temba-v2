const SIDE_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function formatGameSideLabel(format: string, sideIndex: number) {
  if (format === "friendly_game") {
    const letter = SIDE_LETTERS[sideIndex - 1];
    return letter ? `Team ${letter}` : `Team ${sideIndex}`;
  }
  if (format === "friendly_tournament") {
    return `Side ${sideIndex}`;
  }
  return `Team ${sideIndex}`;
}

export function formatMatchSlotLabel(format: string, slot: 1 | 2) {
  if (format === "friendly_game") {
    return slot === 1 ? "Team A" : "Team B";
  }
  return `Team ${slot}`;
}

export function formatSeatSideHeading(
  sideNoun: string,
  sideIndex: number,
  sideCount: number,
) {
  if (sideNoun === "Team" && sideCount === 2) {
    return formatGameSideLabel("friendly_game", sideIndex);
  }
  return `${sideNoun} ${sideIndex}`;
}

export function gameTeamDisplayName(side: {
  members: { name: string }[];
  name: string | null;
}) {
  if (side.members.length > 0) {
    return side.members.map((member) => member.name).join(" / ");
  }
  return side.name ?? "Game team";
}

export function matchSlotOccupantLabel(
  sides: { id: string; members: { name: string }[]; name: string | null }[],
  gameTeamId: string | null,
) {
  if (!gameTeamId) {
    return null;
  }
  const side = sides.find((row) => row.id === gameTeamId);
  return side ? gameTeamDisplayName(side) : null;
}

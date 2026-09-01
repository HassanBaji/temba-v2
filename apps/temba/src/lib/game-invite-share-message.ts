import {
  formatGameTimeWindow,
  formatRelativeDay,
} from "~/lib/format-game-start";
import { showsFriendlyRoster } from "~/lib/game-summary-cta";

export type GameInviteShareOccupant = {
  name: string;
} | null;

export type GameInviteShareSide = {
  sideIndex: number;
  left: GameInviteShareOccupant;
  right: GameInviteShareOccupant;
};

export type GameInviteShareMessageInput = {
  venueName: string;
  courtName: string | null;
  windowStart: Date | string | null | undefined;
  windowEnd: Date | string | null | undefined;
  sides: readonly GameInviteShareSide[];
  shortUrl: string;
};

function occupantLabel(occupant: GameInviteShareOccupant) {
  const name = occupant?.name.trim();
  if (!name) {
    return "Open";
  }
  return name;
}

function sideSeats(
  sides: readonly GameInviteShareSide[],
  sideIndex: number,
): { left: string; right: string } {
  const side = sides.find((row) => row.sideIndex === sideIndex);
  return {
    left: occupantLabel(side?.left ?? null),
    right: occupantLabel(side?.right ?? null),
  };
}

export function formatGameInviteShareMessage(
  input: GameInviteShareMessageInput,
) {
  const start = input.windowStart ?? input.windowEnd ?? new Date();
  const lines = [`📍 ${input.venueName}`];
  if (input.courtName) {
    lines.push(`🎾 ${input.courtName}`);
  }
  lines.push(`📅 ${formatRelativeDay(start)}`);
  lines.push(
    `🕗 ${formatGameTimeWindow(input.windowStart, input.windowEnd, start)}`,
  );
  lines.push("");
  const team1 = sideSeats(input.sides, 1);
  const team2 = sideSeats(input.sides, 2);
  lines.push("👕 Team 1");
  lines.push(`- ${team1.left}`);
  lines.push(`- ${team1.right}`);
  lines.push("");
  lines.push("👕 Team 2");
  lines.push(`- ${team2.left}`);
  lines.push(`- ${team2.right}`);
  lines.push("");
  lines.push("🔗 Join:");
  lines.push(input.shortUrl);
  return lines.join("\n");
}

export function gameInviteClipboardText(input: {
  format: string;
  registrationMode: string;
  shortUrl: string;
  roster: GameInviteShareMessageInput | null;
}) {
  if (
    !showsFriendlyRoster(input.format, input.registrationMode) ||
    input.roster == null
  ) {
    return input.shortUrl;
  }
  return formatGameInviteShareMessage(input.roster);
}

import { formatGameTimeWindow, formatRelativeDay } from "./format-game-start";
import { KEEPERS_PER_GAME } from "./football-lineup";
import {
  isFootballGame,
  isRosterRegistrationGame,
  sideSizeLabel,
} from "./game-shape";
import { showsFriendlyRoster } from "./game-summary-cta";

export type GameInviteShareOccupant = {
  name: string;
} | null;

export type GameInviteShareSide = {
  sideIndex: number;
  left: GameInviteShareOccupant;
  right: GameInviteShareOccupant;
};

export type GameInviteShareMessageInput = {
  customName?: string | null;
  venueName: string;
  courtName: string | null;
  windowStart: Date | string | null | undefined;
  windowEnd: Date | string | null | undefined;
  sides: readonly GameInviteShareSide[];
  shortUrl: string;
  football?: GameInviteShareFootball;
};

export type GameInviteShareFootball = {
  sideSize: number | null;
  playersAllowed: number | null;
  players: readonly { name: string; role?: string | null }[];
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

function whereAndWhenLines(
  input: GameInviteShareMessageInput,
  courtEmoji: string,
) {
  const start = input.windowStart ?? input.windowEnd ?? new Date();
  const lines: string[] = [];
  const customName = input.customName?.trim();
  if (customName) {
    lines.push(customName, "");
  }
  lines.push(`📍 ${input.venueName}`);
  if (input.courtName) {
    lines.push(`${courtEmoji} ${input.courtName}`);
  }
  lines.push(`📅 ${formatRelativeDay(start)}`);
  lines.push(
    `🕗 ${formatGameTimeWindow(input.windowStart, input.windowEnd, start)}`,
  );
  return lines;
}

export function formatGameInviteShareMessage(
  input: GameInviteShareMessageInput,
) {
  const lines = whereAndWhenLines(input, "🎾");
  lines.push("");
  const team1 = sideSeats(input.sides, 1);
  const team2 = sideSeats(input.sides, 2);
  lines.push("👕 Team 1");
  lines.push(`- Left: ${team1.left}`);
  lines.push(`- Right: ${team1.right}`);
  lines.push("");
  lines.push("👕 Team 2");
  lines.push(`- Left: ${team2.left}`);
  lines.push(`- Right: ${team2.right}`);
  lines.push("");
  lines.push("🔗 Join:");
  lines.push(input.shortUrl);
  return lines.join("\n");
}

function numberedSlots(
  title: string,
  names: readonly string[],
  cap: number | null,
) {
  const lines = [title];
  const slots = Math.max(cap ?? 0, names.length);
  for (let index = 0; index < slots; index += 1) {
    const name = names[index];
    lines.push(name ? `${index + 1}- ${name}` : `${index + 1}-`);
  }
  return lines;
}

/**
 * Numbered up to the cap so players can paste the list back with their name
 * on an empty line. Keepers count toward players allowed, so the outfield
 * list gets what is left after the keeper seats.
 */
export function formatFootballInviteShareMessage(
  input: GameInviteShareMessageInput,
  football: GameInviteShareFootball,
) {
  const lines = whereAndWhenLines(input, "⚽");
  if (football.sideSize) {
    lines.push(`👥 ${sideSizeLabel(football.sideSize)}`);
  }
  const named = (role: "keeper" | "outfield") =>
    football.players
      .filter((player) => (player.role === "keeper") === (role === "keeper"))
      .map((player) => player.name.trim());
  const keepers = named("keeper");
  const outfield = named("outfield");
  const cap = football.playersAllowed;
  lines.push("");
  lines.push(
    ...numberedSlots(
      "👕 Players",
      outfield,
      cap ? Math.max(0, cap - KEEPERS_PER_GAME) : null,
    ),
  );
  lines.push("");
  lines.push(...numberedSlots("🧤 Keepers", keepers, KEEPERS_PER_GAME));
  lines.push("");
  lines.push("🔗 Join:");
  lines.push(input.shortUrl);
  return lines.join("\n");
}

export function gameInviteClipboardText(input: {
  format: string;
  sport?: string | null;
  registrationMode: string;
  shortUrl: string;
  roster: GameInviteShareMessageInput | null;
}) {
  if (
    input.format === "friendly_game" &&
    isFootballGame(input) &&
    input.roster?.football
  ) {
    return formatFootballInviteShareMessage(
      input.roster,
      input.roster.football,
    );
  }
  if (
    isRosterRegistrationGame(input) ||
    !showsFriendlyRoster(input.format, input.registrationMode) ||
    input.roster == null
  ) {
    const customName = input.roster?.customName?.trim();
    return customName ? `${customName}\n${input.shortUrl}` : input.shortUrl;
  }
  return formatGameInviteShareMessage(input.roster);
}

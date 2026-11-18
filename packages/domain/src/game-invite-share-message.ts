import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  formatGameDay,
  formatGameTimeWindow,
  formatWeekday,
} from "./format-game-start";
import { gameDayStart } from "./game-day";
import { KEEPERS_PER_GAME } from "./football-lineup";
import {
  isFootballGame,
  isRosterRegistrationGame,
  sideSizeLabel,
} from "./game-shape";
import { formatLevelRangeLabel } from "./level-range";
import { showsFriendlyRoster } from "./game-summary-cta";
import { isAmericano } from "./tournament-americano";

export type GameInviteShareOccupant = {
  name: string;
} | null;

export type GameInviteShareSide = {
  sideIndex: number;
  left: GameInviteShareOccupant;
  right: GameInviteShareOccupant;
};

export type GameInviteShareMessageInput = {
  /** The Game's display name, which opens every message. */
  gameName?: string | null;
  venueName: string;
  courtName: string | null;
  windowStart: Date | string | null | undefined;
  windowEnd: Date | string | null | undefined;
  sides: readonly GameInviteShareSide[];
  shortUrl: string;
  football?: GameInviteShareFootball;
  americano?: GameInviteShareAmericano;
  levelMinTenths?: number | null;
  levelMaxTenths?: number | null;
  waitlist?: readonly { name: string }[];
  locale: Locale;
};

export type GameInviteShareFootball = {
  sideSize: number | null;
  playersAllowed: number | null;
  players: readonly { name: string; role?: string | null }[];
};

export type GameInviteShareAmericano = {
  playersAllowed: number | null;
  players: readonly { name: string }[];
};

function occupantLabel(occupant: GameInviteShareOccupant, locale: Locale) {
  const name = occupant?.name.trim();
  if (!name) {
    return messagesFor(locale).createGame.share.open;
  }
  return name;
}

function sideSeats(
  sides: readonly GameInviteShareSide[],
  sideIndex: number,
  locale: Locale,
): { left: string; right: string } {
  const side = sides.find((row) => row.sideIndex === sideIndex);
  return {
    left: occupantLabel(side?.left ?? null, locale),
    right: occupantLabel(side?.right ?? null, locale),
  };
}

/** Always the weekday and date (`Monday, 12 Nov`): a pasted message outlives "Tonight". */
function shareDay(start: Date | string, locale: Locale) {
  const date = start instanceof Date ? start : new Date(start);
  return messagesFor(locale).dates.weekdayAndDate(
    formatWeekday(gameDayStart(date), "long", locale),
    formatGameDay(date, locale),
  );
}

function whereAndWhenLines(
  input: GameInviteShareMessageInput,
  courtEmoji: string,
) {
  const start = input.windowStart ?? input.windowEnd ?? new Date();
  const lines: string[] = [];
  const gameName = input.gameName?.trim();
  if (gameName) {
    lines.push(gameName, "");
  }
  lines.push(`📍 ${input.venueName}`);
  if (input.courtName) {
    lines.push(`${courtEmoji} ${input.courtName}`);
  }
  lines.push(`📅 ${shareDay(start, input.locale)}`);
  lines.push(
    `🕗 ${formatGameTimeWindow(input.windowStart, input.windowEnd, start, input.locale)}`,
  );
  const levelRange = formatLevelRangeLabel(
    input.levelMinTenths,
    input.levelMaxTenths,
    input.locale,
    input.football ? "football" : "padel",
  );
  if (levelRange) {
    lines.push(messagesFor(input.locale).createGame.share.level(levelRange));
  }
  return lines;
}

function waitlistLines(input: GameInviteShareMessageInput) {
  const names = (input.waitlist ?? [])
    .map((entry) => entry.name.trim())
    .filter(Boolean);
  if (names.length === 0) {
    return [];
  }
  return [
    ...numberedSlots(
      messagesFor(input.locale).createGame.share.waitlist,
      names,
      null,
    ),
    "",
  ];
}

export function formatGameInviteShareMessage(
  input: GameInviteShareMessageInput,
) {
  return padelRosterMessage(input, [1, 2]);
}

/**
 * The Friendly game roster with one block per Team. The Court line is left
 * out: a Tournament plays across Courts, so its first Match's Court misleads.
 */
export function formatTournamentInviteShareMessage(
  input: GameInviteShareMessageInput,
) {
  const sideIndexes = [...input.sides]
    .map((side) => side.sideIndex)
    .sort((a, b) => a - b);
  return padelRosterMessage({ ...input, courtName: null }, sideIndexes);
}

function padelRosterMessage(
  input: GameInviteShareMessageInput,
  sideIndexes: readonly number[],
) {
  const m = messagesFor(input.locale).createGame.share;
  const lines = whereAndWhenLines(input, "🎾");
  lines.push("");
  sideIndexes.forEach((sideIndex, index) => {
    const seats = sideSeats(input.sides, sideIndex, input.locale);
    lines.push(m.team(index + 1));
    lines.push(m.left(seats.left));
    lines.push(m.right(seats.right));
    lines.push("");
  });
  lines.push(...waitlistLines(input));
  lines.push(m.join);
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
  const m = messagesFor(input.locale).createGame.share;
  const lines = whereAndWhenLines(input, "⚽");
  if (football.sideSize) {
    lines.push(`👥 ${sideSizeLabel(football.sideSize, input.locale)}`);
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
      m.players,
      outfield,
      cap ? Math.max(0, cap - KEEPERS_PER_GAME) : null,
    ),
  );
  lines.push("");
  lines.push(...numberedSlots(m.keepers, keepers, KEEPERS_PER_GAME));
  lines.push("");
  lines.push(...waitlistLines(input));
  lines.push(m.join);
  lines.push(input.shortUrl);
  return lines.join("\n");
}

/**
 * Players sit alone and get a new partner every Round, so there is no Team to
 * list: one numbered list up to the seats, and no Court line, as for any
 * Tournament.
 */
export function formatAmericanoInviteShareMessage(
  input: GameInviteShareMessageInput,
  americano: GameInviteShareAmericano,
) {
  const m = messagesFor(input.locale).createGame.share;
  const lines = whereAndWhenLines({ ...input, courtName: null }, "🎾");
  const names = americano.players
    .map((player) => player.name.trim())
    .filter(Boolean);
  lines.push("");
  lines.push(...numberedSlots(m.players, names, americano.playersAllowed));
  lines.push("");
  lines.push(...waitlistLines(input));
  lines.push(m.join);
  lines.push(input.shortUrl);
  return lines.join("\n");
}

export function gameInviteClipboardText(input: {
  format: string;
  sport?: string | null;
  tournamentShape?: string | null;
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
  if (isAmericano(input.format, input.tournamentShape)) {
    return input.roster?.americano
      ? formatAmericanoInviteShareMessage(input.roster, input.roster.americano)
      : linkOnlyText(input);
  }
  if (
    input.format === "friendly_tournament" &&
    input.registrationMode === "individual" &&
    input.roster != null
  ) {
    return formatTournamentInviteShareMessage(input.roster);
  }
  if (
    isRosterRegistrationGame(input) ||
    !showsFriendlyRoster(input.format, input.registrationMode) ||
    input.roster == null
  ) {
    return linkOnlyText(input);
  }
  return formatGameInviteShareMessage(input.roster);
}

function linkOnlyText(input: {
  shortUrl: string;
  roster: GameInviteShareMessageInput | null;
}) {
  const gameName = input.roster?.gameName?.trim();
  return gameName ? `${gameName}\n${input.shortUrl}` : input.shortUrl;
}

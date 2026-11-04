import { messagesFor } from "@repo/i18n/messages";
import type { Locale } from "@repo/i18n/locale";

import {
  displayLabelFromStoredBand,
  LEVEL_BANDS,
  type LevelBand,
} from "./level-bands";

export const FOOTBALL_ROLES = ["outfield", "keeper"] as const;

export type FootballRole = (typeof FOOTBALL_ROLES)[number];

export const FOOTBALL_POSITIONS = ["def", "mid", "fwd"] as const;

export type FootballPosition = (typeof FOOTBALL_POSITIONS)[number];

const FOOTBALL_POSITION_CODES: Record<FootballPosition, string> = {
  def: "DEF",
  mid: "MID",
  fwd: "FWD",
};

export function footballPositionChoices(locale: Locale): {
  value: FootballPosition;
  code: string;
  label: string;
}[] {
  const m = messagesFor(locale).football.lineup.positions;
  return FOOTBALL_POSITIONS.map((value) => ({
    value,
    code: FOOTBALL_POSITION_CODES[value],
    label: m[value],
  }));
}

export const DEFAULT_FOOTBALL_POSITION: FootballPosition = "mid";

/** One keeper a side, so two a Game. */
export const KEEPERS_PER_GAME = 2;

export const KEEPER_SEATS_TAKEN_MESSAGE = "Both keeper seats are taken";

export const KEEPER_CODE = "GK";

export function isFootballRole(value: unknown): value is FootballRole {
  return (FOOTBALL_ROLES as readonly unknown[]).includes(value);
}

export function isFootballPosition(value: unknown): value is FootballPosition {
  return (FOOTBALL_POSITIONS as readonly unknown[]).includes(value);
}

export function footballPositionCode(position: FootballPosition) {
  return FOOTBALL_POSITION_CODES[position] ?? position.toUpperCase();
}

/** The short tag a roster row carries: GK for a keeper, else the position. */
export function footballSlotCode(
  role: FootballRole | null,
  position: FootballPosition | null,
) {
  if (role === "keeper") {
    return KEEPER_CODE;
  }
  return position ? footballPositionCode(position) : null;
}

export function keeperSeatsLeft(keepersIn: number) {
  return Math.max(0, KEEPERS_PER_GAME - keepersIn);
}

export function keeperSeatsLine(keepersIn: number, locale: Locale) {
  const m = messagesFor(locale).football.lineup;
  const left = keeperSeatsLeft(keepersIn);
  return left === 0
    ? m.keeperSeatsTaken
    : m.keeperSeatsOpen(left, KEEPERS_PER_GAME);
}

export function keepersInLine(keepersIn: number, locale: Locale) {
  const m = messagesFor(locale).football.lineup;
  if (keepersIn >= KEEPERS_PER_GAME) {
    return m.keepersIn(keepersIn);
  }
  return keepersIn === 1 ? m.oneKeeperOneMoreNeeded : m.noKeeperYet;
}

export function positionCountsLine(
  players: readonly {
    role: FootballRole | null;
    position: FootballPosition | null;
  }[],
  locale: Locale,
) {
  const count = (position: FootballPosition) =>
    players.filter(
      (player) => player.role !== "keeper" && player.position === position,
    ).length;
  const keepers = players.filter((player) => player.role === "keeper").length;
  return messagesFor(locale).football.lineup.positionCountsLine(
    count("def"),
    count("mid"),
    count("fwd"),
    keepers,
  );
}

export const FOOTBALL_BIBS = [
  "black",
  "white",
  "red",
  "navy",
  "sky",
  "green",
  "yellow",
  "orange",
  "purple",
  "pink",
  "grey",
] as const;

export type FootballBib = (typeof FOOTBALL_BIBS)[number];

/** The swatches shown first; the rest open from the last swatch. */
export const PRIMARY_FOOTBALL_BIBS: readonly FootballBib[] = [
  "black",
  "white",
  "red",
  "navy",
  "sky",
];

export const MORE_FOOTBALL_BIBS: readonly FootballBib[] = FOOTBALL_BIBS.filter(
  (bib) => !PRIMARY_FOOTBALL_BIBS.includes(bib),
);

export const DEFAULT_FOOTBALL_BIBS: { slot1: FootballBib; slot2: FootballBib } =
  { slot1: "black", slot2: "white" };

export function isFootballBib(value: unknown): value is FootballBib {
  return (FOOTBALL_BIBS as readonly unknown[]).includes(value);
}

export function footballBibName(
  bib: FootballBib | null,
  sideIndex: 1 | 2,
  locale: Locale,
) {
  const names = messagesFor(locale).football.lineup.bibs;
  if (bib) {
    return names[bib];
  }
  return names[sideIndex === 1 ? "black" : "white"];
}

/**
 * Picking a bib the other side wears swaps the two, so the sides never
 * share a colour.
 */
export function pickFootballBib(
  bibs: { slot1: FootballBib; slot2: FootballBib },
  side: 1 | 2,
  bib: FootballBib,
) {
  if (side === 1) {
    return {
      slot1: bib,
      slot2: bib === bibs.slot2 ? bibs.slot1 : bibs.slot2,
    };
  }
  return {
    slot1: bib === bibs.slot1 ? bibs.slot2 : bibs.slot1,
    slot2: bib,
  };
}

export const FOOTBALL_TEAMS_METHODS = ["level", "manual"] as const;

export type FootballTeamsMethod = (typeof FOOTBALL_TEAMS_METHODS)[number];

export function footballTeamsMethodLabel(
  method: FootballTeamsMethod | null,
  locale: Locale,
) {
  const m = messagesFor(locale).football.lineup.teamsMethod;
  return method === "manual" ? m.manual : m.level;
}

/** A Level band as a number for balancing; no Level sits mid-ladder. */
export function levelBandStrength(band: LevelBand | null) {
  return band ? LEVEL_BANDS.indexOf(band) : (LEVEL_BANDS.length - 1) / 2;
}

/** The mean Level of a side as a display letter, or null with no Levels. */
export function averageLevelLabel(bands: readonly (LevelBand | null)[]) {
  const known = bands.filter((band): band is LevelBand => band != null);
  if (known.length === 0) {
    return null;
  }
  const mean =
    known.reduce((sum, band) => sum + LEVEL_BANDS.indexOf(band), 0) /
    known.length;
  const band = LEVEL_BANDS[Math.round(mean)];
  return band ? displayLabelFromStoredBand(band) : null;
}

export type BalanceCandidate = {
  userId: string;
  role: FootballRole | null;
  levelBand: LevelBand | null;
};

/**
 * Splits a roster into two sides by Level: keepers first, one to a side, then
 * a snake draft from the strongest down (A, B, B, A, A, B, …). `random`
 * breaks ties between equal Levels, so Shuffle gives another even split.
 */
export function balanceFootballSides(
  players: readonly BalanceCandidate[],
  random?: () => number,
): { slot1: string[]; slot2: string[] } {
  const keepers = players.filter((player) => player.role === "keeper");
  let rest = players.filter((player) => player.role !== "keeper");
  if (random) {
    rest = rest
      .map((player) => ({ player, key: random() }))
      .sort((a, b) => a.key - b.key)
      .map((entry) => entry.player);
  }
  rest = [...rest].sort(
    (a, b) => levelBandStrength(b.levelBand) - levelBandStrength(a.levelBand),
  );
  const slot1: string[] = [];
  const slot2: string[] = [];
  [...keepers, ...rest].forEach((player, index) => {
    const turn = index % 4;
    (turn === 0 || turn === 3 ? slot1 : slot2).push(player.userId);
  });
  return { slot1, slot2 };
}

export type FootballSidesDraft = {
  slot1: readonly string[];
  slot2: readonly string[];
  unplaced: number;
};

/**
 * Why a split cannot be published yet, or null when it can. Sides may differ
 * by one when the roster is odd.
 */
export function footballSidesProblem(
  draft: FootballSidesDraft,
  names: { slot1: string; slot2: string },
  locale: Locale,
) {
  const m = messagesFor(locale).football.lineup;
  if (draft.slot1.length + draft.slot2.length + draft.unplaced === 0) {
    return m.nobodyInYet;
  }
  if (draft.unplaced > 0) {
    return m.stillToPlace(draft.unplaced);
  }
  if (draft.slot1.length === 0 || draft.slot2.length === 0) {
    return m.bothTeamsNeedPlayers;
  }
  const extra = Math.abs(draft.slot1.length - draft.slot2.length);
  if (extra > 1) {
    const bigger =
      draft.slot1.length > draft.slot2.length ? names.slot1 : names.slot2;
    return m.sideHasExtra(bigger, extra);
  }
  return null;
}

export const FOOTBALL_GOALS_MIN = 0;
export const FOOTBALL_GOALS_MAX = 99;

export function stepFootballGoals(current: number, delta: -1 | 1) {
  return Math.min(
    FOOTBALL_GOALS_MAX,
    Math.max(FOOTBALL_GOALS_MIN, current + delta),
  );
}

export function footballResultLine(
  score: { slot1: number; slot2: number },
  names: { slot1: string; slot2: string },
  locale: Locale,
) {
  const m = messagesFor(locale).football.lineup;
  if (score.slot1 === score.slot2) {
    return m.draw;
  }
  const winner = score.slot1 > score.slot2 ? names.slot1 : names.slot2;
  return m.winBy(winner, Math.abs(score.slot1 - score.slot2));
}

/**
 * Why the named scorers do not fit the Score, or null. A side's named goals
 * may fall short of its Score (nobody kept track) but never exceed it.
 */
export function footballScorersProblem(
  score: { slot1: number; slot2: number },
  named: { slot1: number; slot2: number },
  names: { slot1: string; slot2: string },
  locale: Locale,
) {
  const m = messagesFor(locale).football.lineup;
  if (named.slot1 > score.slot1) {
    return m.scorersExceed(names.slot1, score.slot1);
  }
  if (named.slot2 > score.slot2) {
    return m.scorersExceed(names.slot2, score.slot2);
  }
  return null;
}

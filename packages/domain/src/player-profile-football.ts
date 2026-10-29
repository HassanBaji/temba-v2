import { formatDayMonth } from "./format-game-start";
import {
  FOOTBALL_POSITION_CHOICES,
  KEEPER_CODE,
  footballPositionCode,
  type FootballPosition,
  type FootballRole,
} from "./football-lineup";
import { formatLevel } from "./level";
import { displayLabelFromStoredBand } from "./level-bands";
import type { PlayerOverallView } from "./player-profile";
import {
  playerLevelCardView,
  type PlayerLevelCardView,
  type PlayerLevelInput,
} from "./player-profile-level";
import { lastTenSummary, type LastTenSummary } from "./player-profile-matches";
import type { MatchOutcome } from "./result-mark";
import { formatWinRate } from "./win-rate";

export type FootballOverallInput = {
  played: number;
  won: number;
  lost: number;
  drawn: number;
  goals: number;
};

export type FootballRoleInput = {
  role: FootballRole | null;
  position: FootballPosition | null;
};

export type FootballRoleView = {
  label: string;
  /** "GK", "MID" and so on; null draws the hatched "not yet" tile. */
  code: string | null;
};

/** One of the profile owner's Last 10 football Matches, as `users.footballProfile` returns it. */
export type FootballMatchInput = {
  matchId: string;
  gameId: string;
  playedAt: Date | string;
  outcome: MatchOutcome;
  /** The owner's side first. */
  score: { us: number; them: number } | null;
  goals: number;
  game: { name: string | null; groupName: string | null; venueName: string };
  canOpenGame: boolean;
};

export type FootballMatchRowView = {
  matchId: string;
  gameId: string;
  outcome: MatchOutcome;
  title: string;
  meta: string;
  score: string | null;
  goals: string | null;
  canOpenGame: boolean;
  accessibilityLabel: string;
};

const OUTCOME_WORD: Record<MatchOutcome, string> = {
  won: "Won",
  lost: "Lost",
  draw: "Drew",
};

const STARTING_LEVEL_LINES = [
  "Starting Level",
  "Football games don't move it yet",
];

function nonBlank(value: string | null) {
  const trimmed = value?.trim();
  return trimmed === "" ? null : (trimmed ?? null);
}

function goalsLabel(goals: number) {
  return goals === 1 ? "1 goal" : `${goals} goals`;
}

/**
 * Football Games are Unrated, so a football Level is the starting one until a
 * football Match rates. From then on it reads like the padel Level card.
 */
export function footballLevelCardView(
  input: PlayerLevelInput | null,
): PlayerLevelCardView {
  if (!input || input.ratedMatchCount > 0) {
    return playerLevelCardView(input);
  }
  const displayBand = displayLabelFromStoredBand(input.levelBand);
  const level = formatLevel(input.levelValue);
  return {
    kind: "rated",
    displayBand,
    level,
    provisional: true,
    lines: STARTING_LEVEL_LINES,
    fillPercent: 0,
    accessibilityLabel: `Level ${displayBand} ${level}. ${STARTING_LEVEL_LINES.join(". ")}`,
  };
}

export function footballRoleView(input: FootballRoleInput): FootballRoleView {
  if (input.role === "keeper") {
    return { label: "Keeper", code: KEEPER_CODE };
  }
  if (input.role == null) {
    return { label: "No preference set", code: null };
  }
  const position = FOOTBALL_POSITION_CHOICES.find(
    (choice) => choice.value === input.position,
  );
  return position
    ? { label: position.label, code: footballPositionCode(position.value) }
    : { label: "Outfield", code: null };
}

export function footballOverallView(
  input: FootballOverallInput,
): PlayerOverallView {
  return {
    title: "Overall",
    scope: "All time",
    tiles: [
      { label: "Matches", value: String(input.played) },
      { label: "Won", value: String(input.won) },
      { label: "Win rate", value: formatWinRate(input.won, input.played) },
      { label: "Goals", value: String(input.goals) },
    ],
  };
}

export function footballMatchRowView(
  match: FootballMatchInput,
): FootballMatchRowView {
  const title =
    nonBlank(match.game.groupName) ??
    nonBlank(match.game.name) ??
    "Friendly game";
  const score = match.score ? `${match.score.us}–${match.score.them}` : null;
  const goals = match.goals > 0 ? goalsLabel(match.goals) : null;
  const spoken = [
    score
      ? `${OUTCOME_WORD[match.outcome]} ${score}`
      : OUTCOME_WORD[match.outcome],
    formatDayMonth(match.playedAt, { weekday: "long", month: "long" }),
    title,
    match.game.venueName,
    goals ? `scored ${goals}` : null,
  ];

  return {
    matchId: match.matchId,
    gameId: match.gameId,
    outcome: match.outcome,
    title,
    meta: `${formatDayMonth(match.playedAt, { weekday: "short" })}, ${match.game.venueName}`,
    score,
    goals,
    canOpenGame: match.canOpenGame,
    accessibilityLabel: spoken.filter((part) => part).join(", "),
  };
}

/** The Last 10 strip without "See all": the Last 10 screen is padel only. */
export function footballLastTenSummary(
  matches: readonly Pick<FootballMatchInput, "outcome" | "playedAt">[],
): LastTenSummary {
  return { ...lastTenSummary(matches), seeAll: null };
}

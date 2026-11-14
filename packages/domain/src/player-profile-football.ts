import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatDayMonth } from "./format-game-start";
import { gameDisplayName } from "./game-custom-name";
import {
  footballKeeperCode,
  footballPositionChoices,
  footballPositionCode,
  type FootballPosition,
  type FootballRole,
} from "./football-lineup";
import { ovrFromLevel, ovrScalePercent } from "./football-ovr";
import { footballSelfPlacementChoices } from "./football-self-placement";
import { displayLabelFromStoredBand } from "./level-bands";
import type { PlayerOverallView } from "./player-profile";
import {
  playerLevelCardView,
  shownLevel,
  type PlayerLevelCardView,
  type PlayerLevelInput,
} from "./player-profile-level";
import { lastTenSummary, type LastTenSummary } from "./player-profile-matches";
import { levelMoveDelta } from "./rating-history";
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
  /** What the Match moved the owner's Level, when it counted for it. */
  levelMove: { muBefore: number; muAfter: number } | null;
  game: {
    name: string | null;
    hasCustomName: boolean;
    windowStart: Date | string | null;
    windowEnd: Date | string | null;
    groupName: string | null;
    venueName: string;
  };
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
  /** "OVR +1": what the Match moved the owner's OVR, when it counted. */
  ovrChange: string | null;
  /** The goals and the OVR change, as the row's one line under the score. */
  detail: string | null;
  canOpenGame: boolean;
  accessibilityLabel: string;
};

function nonBlank(value: string | null) {
  const trimmed = value?.trim();
  return trimmed === "" ? null : (trimmed ?? null);
}

/**
 * A football Level reads as OVR, with no band. It is the starting one until a
 * football Match rates; from then on it reads like the padel Level card on
 * the OVR face.
 */
export function footballLevelCardView(
  input: PlayerLevelInput | null,
  locale: Locale,
): PlayerLevelCardView {
  if (!input || input.ratedMatchCount > 0) {
    return playerLevelCardView(input, locale, "ovr");
  }
  const m = messagesFor(locale).profile;
  const level = shownLevel(input.levelValue, "ovr");
  const lines = [m.football.startingLevel, m.football.startingLevelNote];
  return {
    kind: "rated",
    displayBand: null,
    level,
    provisional: true,
    lines,
    fillPercent: 0,
    accessibilityLabel: m.levelCard.spokenOvr(level, lines.join(". ")),
  };
}

export type FootballHeroLevelView = {
  ovr: string;
  ovrLabel: string;
  /** Where the OVR sits along the 40 to 99 scale. */
  ringPercent: number;
  /** The placement word ("Competitive") while no football Match has counted. */
  placement: string | null;
  spoken: string;
};

/**
 * The You page's football hero: the ring is the Level, read as OVR along the
 * 40 to 99 scale. A self-placed Level keeps the placement word as a caption
 * until a Match counts.
 */
export function footballHeroLevelView(
  input: PlayerLevelInput,
  locale: Locale,
): FootballHeroLevelView {
  const all = messagesFor(locale);
  const ovr = shownLevel(input.levelValue, "ovr");
  const placement =
    input.ratedMatchCount === 0
      ? (footballSelfPlacementChoices(locale).find(
          (choice) =>
            choice.band === displayLabelFromStoredBand(input.levelBand),
        )?.label ?? null)
      : null;
  return {
    ovr,
    ovrLabel: all.rating.ovr.label,
    ringPercent: ovrScalePercent(ovrFromLevel(input.levelValue)),
    placement,
    spoken: all.rating.ovr.heroSpoken(ovr, placement),
  };
}

export function footballRoleView(
  input: FootballRoleInput,
  locale: Locale,
): FootballRoleView {
  const m = messagesFor(locale).profile;
  if (input.role === "keeper") {
    return { label: m.football.keeper, code: footballKeeperCode(locale) };
  }
  if (input.role == null) {
    return { label: m.player.noPreferenceSet, code: null };
  }
  const position = footballPositionChoices(locale).find(
    (choice) => choice.value === input.position,
  );
  return position
    ? {
        label: position.label,
        code: footballPositionCode(position.value, locale),
      }
    : { label: m.football.outfield, code: null };
}

export function footballOverallView(
  input: FootballOverallInput,
  locale: Locale,
): PlayerOverallView {
  const m = messagesFor(locale).profile.player;
  return {
    title: m.overall,
    scope: m.allTime,
    tiles: [
      { label: m.matches, value: String(input.played) },
      { label: m.won, value: String(input.won) },
      { label: m.winRate, value: formatWinRate(input.won, input.played) },
      { label: m.goals, value: String(input.goals) },
    ],
  };
}

export function footballMatchRowView(
  match: FootballMatchInput,
  locale: Locale,
): FootballMatchRowView {
  const m = messagesFor(locale).profile;
  const title =
    nonBlank(match.game.groupName) ??
    (nonBlank(match.game.name)
      ? gameDisplayName({ ...match.game, format: "friendly_game" }, locale)
      : null) ??
    m.matches.friendlyGame;
  const score = match.score ? `${match.score.us}–${match.score.them}` : null;
  const goals = match.goals > 0 ? m.football.goalsScored(match.goals) : null;
  const ovrChange = match.levelMove
    ? messagesFor(locale).rating.matchHistory.ovr(
        levelMoveDelta(
          "football",
          match.levelMove.muBefore,
          match.levelMove.muAfter,
        ),
      )
    : null;
  const shown = [goals, ovrChange].filter((part) => part != null);
  const outcome = m.matches.outcome[match.outcome];
  const spoken = [
    score ? m.matches.outcomeScore(outcome, score) : outcome,
    formatDayMonth(match.playedAt, locale, { weekday: "long", month: "long" }),
    title,
    match.game.venueName,
    goals ? m.football.scored(goals) : null,
    ovrChange,
  ];

  return {
    matchId: match.matchId,
    gameId: match.gameId,
    outcome: match.outcome,
    title,
    meta: m.matches.dateComma(
      formatDayMonth(match.playedAt, locale, { weekday: "short" }),
      match.game.venueName,
    ),
    score,
    goals,
    ovrChange,
    detail: shown.length > 0 ? m.matches.spokenParts(shown) : null,
    canOpenGame: match.canOpenGame,
    accessibilityLabel: m.matches.spokenParts(
      spoken.filter((part) => part != null),
    ),
  };
}

/** The Last 10 strip without "See all": the Last 10 screen is padel only. */
export function footballLastTenSummary(
  matches: readonly Pick<FootballMatchInput, "outcome" | "playedAt">[],
  locale: Locale,
): LastTenSummary {
  return { ...lastTenSummary(matches, locale), seeAll: null };
}

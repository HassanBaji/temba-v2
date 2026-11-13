import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatDayMonth, formatMonth } from "./format-game-start";
import { levelFaceFor } from "./football-ovr";
import {
  displayLabelFromStoredBand,
  nextDistinctDisplayRung,
} from "./level-bands";
import {
  playedSideView,
  STREAK_MARKS_MAX,
  streaksView,
  type CourtSideFill,
  type PlayerOverallInput,
  type PlayerPositionInput,
  type PlayerStreaksInput,
} from "./player-profile";
import {
  footballRoleView,
  type FootballOverallInput,
  type FootballRoleInput,
} from "./player-profile-football";
import {
  distanceToNextRung,
  percentThroughDisplayBand,
  shownLevel,
  type PlayerLevelInput,
} from "./player-profile-level";
import { levelChangeLabel, LAST_TEN_SIZE } from "./player-profile-matches";
import { preferredPositionProfileLine } from "./preferred-position";
import {
  confirmationFraction,
  confirmationProgressCaption,
} from "./profile-level";
import {
  ratingsTierRows,
  type MyGroupTierData,
  type RatingsTierRow,
} from "./ratings-screen";
import type { MatchOutcome, ResultMarkVariant } from "./result-mark";
import type { Sport } from "./sport";
import { formatWinRate, WIN_RATE_MIN_MATCHES } from "./win-rate";

/**
 * Below this many Matches a Player profile is in its early days: no streaks,
 * win rate or partners yet, and the games so far lead.
 */
export const EARLY_DAYS_MATCHES = WIN_RATE_MIN_MATCHES;

const EMPTY = "—";

export function isEarlyDays(played: number) {
  return played < EARLY_DAYS_MATCHES;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function sportName(sport: Sport, locale: Locale) {
  return messagesFor(locale).common[sport];
}

export type SportSwitchOption = {
  sport: Sport;
  name: string;
  /** "24 games"; null until that sport's profile has loaded. */
  meta: string | null;
  selected: boolean;
};

/** The hero's sport switch. A player with one sport set up gets none. */
export function sportSwitchView(
  sports: readonly { sport: Sport; played: number | null }[],
  selected: Sport,
  locale: Locale,
): SportSwitchOption[] | null {
  if (sports.length < 2) {
    return null;
  }
  const m = messagesFor(locale).profile.playerPage;
  return sports.map((entry) => ({
    sport: entry.sport,
    name: sportName(entry.sport, locale),
    meta: entry.played == null ? null : m.games(entry.played),
    selected: entry.sport === selected,
  }));
}

/** The position or side the hero names: the declared one, never a guess. */
export function heroPositionLabel(
  input:
    | { sport: "padel"; position: PlayerPositionInput }
    | { sport: "football"; role: FootballRoleInput },
  locale: Locale,
) {
  if (input.sport === "padel") {
    return preferredPositionProfileLine(input.position.declared, locale);
  }
  return input.role.role == null
    ? null
    : footballRoleView(input.role, locale).label;
}

/**
 * "Midfield, plays at Riffa Pitch" when the switch names the sport;
 * "Football, midfield. Plays at Riffa Pitch" when there is no switch.
 */
export function profileHeroSubtitle(
  input: {
    sport: Sport;
    hasSwitch: boolean;
    position: string | null;
    venue: { name: string } | null;
  },
  locale: Locale,
) {
  const m = messagesFor(locale).profile.playerPage;
  const { position, venue } = input;
  if (input.hasSwitch) {
    if (position && venue) {
      return m.subtitlePositionVenue(position, venue.name);
    }
    return venue ? m.subtitleVenue(venue.name) : position;
  }
  const sport = sportName(input.sport, locale);
  if (position && venue) {
    return m.subtitleSportPositionVenue(sport, position, venue.name);
  }
  if (position) {
    return m.subtitleSportPosition(sport, position);
  }
  return venue ? m.subtitleSportVenue(sport, venue.name) : sport;
}

export type ProfileLevelView =
  | { kind: "none"; label: string; value: string; spoken: string }
  | {
      kind: "level";
      label: string;
      status: string;
      statusDetail: string;
      band: string;
      level: string;
      trend: string | null;
      lead: string;
      trail: string | null;
      percent: number;
      /** The track is hatched while the Level is not settled yet. */
      hatched: boolean;
      spoken: string;
    };

/** "+0.2 since Sep": the sum of the rated changes in the Last 10. */
export function levelTrendSince(
  newestFirst: readonly {
    playedAt: Date | string;
    rating: { levelChange: number } | null;
  }[],
  locale: Locale,
) {
  const rated = newestFirst
    .slice(0, LAST_TEN_SIZE)
    .flatMap((match) =>
      match.rating ? [{ playedAt: match.playedAt, ...match.rating }] : [],
    );
  const oldest = rated.at(-1);
  if (!oldest) {
    return null;
  }
  const sum = rated.reduce((total, match) => total + match.levelChange, 0);
  const all = messagesFor(locale);
  return all.profile.playerPage.trendSince(
    all.common.isolate(levelChangeLabel(sum)),
    formatMonth(oldest.playedAt, "short", locale),
  );
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

/**
 * The Level block in the hero. A football Level reads as OVR, and one that no
 * rated Match has moved is the starting one and its track is hatched;
 * otherwise both sports read the same: Provisional while confirming, then the
 * distance to the next band.
 */
export function profileLevelView(
  input: PlayerLevelInput | null,
  options: { sport: Sport; hasSwitch: boolean; trend: string | null },
  locale: Locale,
): ProfileLevelView {
  const all = messagesFor(locale);
  const m = all.profile.playerPage;
  const label = options.hasSwitch
    ? m.level
    : m.sportLevel(sportName(options.sport, locale));
  const join = all.profile.matches.spokenParts;

  if (!input) {
    return {
      kind: "none",
      label,
      value: m.noLevelYet,
      spoken: join([label, m.noLevelYet]),
    };
  }

  const face = levelFaceFor(options.sport);
  const band = displayLabelFromStoredBand(input.levelBand);
  const level = shownLevel(input.levelValue, face);
  const shape = (
    parts: Pick<
      Extract<ProfileLevelView, { kind: "level" }>,
      "status" | "statusDetail" | "lead" | "trail" | "percent" | "hatched"
    > & { trend: string | null },
  ): ProfileLevelView => ({
    kind: "level",
    label,
    band,
    level,
    ...parts,
    spoken: join(
      [
        `${label} ${band} ${level}`,
        parts.status,
        parts.statusDetail,
        parts.lead,
        parts.trail,
        parts.trend,
      ].filter((part): part is string => part != null),
    ),
  });

  if (options.sport === "football" && input.ratedMatchCount === 0) {
    return shape({
      status: m.startingLevel,
      statusDetail: m.setAtSignUp,
      lead: m.notMovingYet,
      trail: null,
      percent: 0,
      hatched: true,
      trend: null,
    });
  }

  const statusDetail = m.ratedMatches(input.ratedMatchCount);
  if (input.provisional) {
    return shape({
      status: m.provisional,
      statusDetail,
      lead: confirmationProgressCaption(input.ratedMatchesRemaining, locale),
      trail: null,
      percent: clampPercent(
        confirmationFraction(input.ratedMatchesRemaining) * 100,
      ),
      hatched: true,
      trend: options.trend,
    });
  }

  const next = nextDistinctDisplayRung(input.levelBand);
  if (next == null) {
    return shape({
      status: m.confirmed,
      statusDetail,
      lead: all.profile.level.topBand,
      trail: null,
      percent: 100,
      hatched: false,
      trend: options.trend,
    });
  }
  const percent = percentThroughDisplayBand(input.levelValue, input.levelBand);
  return shape({
    status: m.confirmed,
    statusDetail,
    lead: m.toNext(distanceToNextRung(input.levelValue, next, face), next),
    trail: m.ofTheWay(percent),
    percent,
    hatched: false,
    trend: options.trend,
  });
}

export type ProfileStreaksView = {
  current: { value: string; unit: string; marks: number; spoken: string };
  best: { value: string; unit: string; when: string | null; spoken: string };
};

/** Only Win streaks count: a losing run reads as a current streak of 0. */
export function profileStreaksView(
  input: PlayerStreaksInput,
  locale: Locale,
): ProfileStreaksView {
  const m = messagesFor(locale).profile.playerPage;
  const when = streaksView(input, locale).best.reachedIn;
  return {
    current: {
      value: String(input.current),
      unit: m.winsUnit(input.current),
      marks: Math.min(input.current, STREAK_MARKS_MAX),
      spoken: m.streakSpoken(
        m.currentStreak,
        input.current,
        m.winsUnit(input.current),
      ),
    },
    best: {
      value: String(input.best),
      unit: m.winsUnit(input.best),
      when: input.best > 0 ? when : null,
      spoken: m.streakSpoken(m.bestStreak, input.best, m.winsUnit(input.best)),
    },
  };
}

export type ProfilePositionView =
  | {
      sport: "padel";
      label: string;
      value: string;
      detail: string | null;
      court: { left: CourtSideFill; right: CourtSideFill };
    }
  | {
      sport: "football";
      label: string;
      value: string;
      detail: string | null;
      /** Where the dot sits on the pitch; null draws the pitch empty. */
      spot: "gk" | "def" | "mid" | "fwd" | null;
    };

export function padelPositionView(
  input: PlayerPositionInput,
  locale: Locale,
): ProfilePositionView {
  const side = playedSideView(input, locale);
  return {
    sport: "padel",
    label: messagesFor(locale).profile.playerPage.preferredSide,
    value: side.label,
    detail: side.subtitle,
    court: side.court,
  };
}

export function footballPositionView(
  input: FootballRoleInput,
  locale: Locale,
): ProfilePositionView {
  return {
    sport: "football",
    label: messagesFor(locale).profile.playerPage.preferredPosition,
    value: footballRoleView(input, locale).label,
    detail: null,
    spot:
      input.role === "keeper"
        ? "gk"
        : input.role == null
          ? null
          : (input.position ?? null),
  };
}

export type ProfileStatTile = {
  value: string;
  label: string;
  /** Hatched: the figure shows once there are enough games. */
  locked: boolean;
};

function lockedWinRate(locale: Locale): ProfileStatTile {
  const m = messagesFor(locale).profile;
  return {
    value: m.playerPage.afterGames(EARLY_DAYS_MATCHES),
    label: m.player.winRate,
    locked: true,
  };
}

function winRateTile(
  won: number,
  played: number,
  locale: Locale,
): ProfileStatTile {
  return isEarlyDays(played)
    ? lockedWinRate(locale)
    : {
        value: formatWinRate(won, played),
        label: messagesFor(locale).profile.player.winRate,
        locked: false,
      };
}

export function padelStatTiles(
  input: PlayerOverallInput,
  locale: Locale,
): ProfileStatTile[] {
  const m = messagesFor(locale).profile.player;
  return [
    { value: String(input.played), label: m.matches, locked: false },
    { value: String(input.won), label: m.won, locked: false },
    winRateTile(input.won, input.played, locale),
    {
      value:
        input.setsPlayed > 0
          ? formatWinRate(input.setsWon, input.setsPlayed)
          : EMPTY,
      label: m.setsWon,
      locked: false,
    },
  ];
}

export function footballStatTiles(
  input: FootballOverallInput,
  locale: Locale,
): ProfileStatTile[] {
  const all = messagesFor(locale).profile;
  const m = all.playerPage;
  const matches = {
    value: String(input.played),
    label: all.player.matches,
    locked: false,
  };
  if (isEarlyDays(input.played)) {
    return [
      matches,
      { value: String(input.won), label: m.won, locked: false },
      {
        value: String(input.goals),
        label: input.goals === 1 ? m.goal : all.player.goals,
        locked: false,
      },
      lockedWinRate(locale),
    ];
  }
  return [
    matches,
    {
      value: record(input, "football", locale),
      label: m.wonDrawnLost,
      locked: false,
    },
    { value: String(input.goals), label: all.player.goals, locked: false },
    {
      value: (input.goals / input.played).toFixed(1),
      label: m.goalsPerGame,
      locked: false,
    },
  ];
}

/** W–D–L in football or with a draw, else W–L; isolated so Arabic keeps the order. */
function record(
  tally: { won: number; lost: number; drawn: number },
  sport: Sport,
  locale: Locale,
) {
  return messagesFor(locale).common.isolate(
    sport === "football" || tally.drawn > 0
      ? `${tally.won}–${tally.drawn}–${tally.lost}`
      : `${tally.won}–${tally.lost}`,
  );
}

export type ProfileFormView = {
  title: string;
  record: string;
  /** Ten slots, oldest first; slots not played yet sit at the new end. */
  slots: ResultMarkVariant[];
  ends: { oldest: string; newest: string } | null;
  spoken: string;
};

export function profileFormView(
  newestFirst: readonly { outcome: MatchOutcome; playedAt: Date | string }[],
  options: { sport: Sport; played: number },
  locale: Locale,
): ProfileFormView {
  const all = messagesFor(locale).profile;
  const m = all.playerPage;
  const shown = newestFirst.slice(0, LAST_TEN_SIZE);
  const count = (outcome: MatchOutcome) =>
    shown.filter((match) => match.outcome === outcome).length;
  const tally = {
    won: count("won"),
    lost: count("lost"),
    drawn: count("draw"),
  };
  const early = isEarlyDays(options.played);
  const title = early ? m.gamesTitle : m.lastTen;
  const oldest = shown.at(-1);
  const newest = shown[0];
  const words =
    shown.length === 0
      ? all.lastTen.noGamesYet
      : tally.drawn > 0
        ? all.lastTen.recordWithDrawn(tally.won, tally.lost, tally.drawn)
        : all.lastTen.record(tally.won, tally.lost);

  return {
    title,
    record: early
      ? m.played(options.played)
      : record(tally, options.sport, locale),
    slots: [
      ...[...shown].reverse().map((match) => match.outcome),
      ...Array.from(
        { length: LAST_TEN_SIZE - shown.length },
        () => "not-played" as const,
      ),
    ],
    ends:
      oldest && newest
        ? {
            oldest: formatDayMonth(oldest.playedAt, locale),
            newest: formatDayMonth(newest.playedAt, locale),
          }
        : null,
    spoken: m.recordSpoken(title, words),
  };
}

export type EarlyDaysView = {
  title: string;
  since: string | null;
  note: string;
};

/** The surface that leads a profile with fewer than five games. */
export function earlyDaysView(
  newestFirst: readonly { playedAt: Date | string }[],
  options: { sport: Sport; played: number },
  locale: Locale,
): EarlyDaysView | null {
  if (!isEarlyDays(options.played)) {
    return null;
  }
  const m = messagesFor(locale).profile.playerPage;
  const first = newestFirst.slice(0, LAST_TEN_SIZE).at(-1);
  return {
    title: options.played === 0 ? m.noGamesYet : m.gamesSoFar(options.played),
    since: first ? m.since(formatDayMonth(first.playedAt, locale)) : null,
    note:
      options.sport === "football"
        ? m.earlyNote(EARLY_DAYS_MATCHES)
        : m.earlyNotePadel(EARLY_DAYS_MATCHES),
  };
}

export type WithViewerTally = {
  played: number;
  won: number;
  lost: number;
  drawn: number;
};

export type WithViewerInput = {
  together: WithViewerTally;
  /** From the profile owner's side. */
  against: WithViewerTally;
  sharedGroups: string[];
};

export type WithViewerColumn = {
  label: string;
  record: string;
  detail: string | null;
};

export type WithViewerView = {
  title: string;
  scope: string | null;
  columns: [WithViewerColumn, WithViewerColumn] | null;
  empty: string | null;
  groups: string | null;
  spoken: string;
};

function sharedGroupsLine(groups: readonly string[], locale: Locale) {
  const m = messagesFor(locale).profile.playerPage;
  const [first, second] = groups;
  if (!first) {
    return null;
  }
  if (!second) {
    return m.bothIn(first);
  }
  return groups.length === 2
    ? m.bothInTwo(first, second)
    : m.bothInMore(first, groups.length - 1);
}

/**
 * "You and Yousif": the record on the same side, the head-to-head with the
 * leader's wins first, and the Groups both are in.
 */
export function withViewerView(
  input: WithViewerInput | null,
  options: { sport: Sport; playerName: string },
  locale: Locale,
): WithViewerView | null {
  if (!input) {
    return null;
  }
  const all = messagesFor(locale).profile;
  const m = all.playerPage;
  const name = firstName(options.playerName);
  const title = m.youAnd(name);
  const groups = sharedGroupsLine(input.sharedGroups, locale);
  const any = input.together.played + input.against.played > 0;

  if (!any) {
    return {
      title,
      scope: null,
      columns: null,
      empty: m.noGamesTogether,
      groups,
      spoken: all.matches.spokenParts(
        [title, m.noGamesTogether, groups].filter(
          (part): part is string => part != null,
        ),
      ),
    };
  }

  const football = options.sport === "football";
  const together: WithViewerColumn = {
    label: football ? m.asTeammates : m.asPartners,
    record:
      input.together.played > 0
        ? record(input.together, options.sport, locale)
        : EMPTY,
    detail: input.together.played > 0 ? m.inGames(input.together.played) : null,
  };

  const viewerWins = input.against.lost;
  const ownerWins = input.against.won;
  const lead = Math.max(viewerWins, ownerWins);
  const trail = Math.min(viewerWins, ownerWins);
  const against: WithViewerColumn = {
    label: football ? m.against : m.againstEachOther,
    record:
      input.against.played > 0
        ? record(
            { won: lead, lost: trail, drawn: input.against.drawn },
            options.sport,
            locale,
          )
        : EMPTY,
    detail:
      input.against.played === 0
        ? null
        : viewerWins > ownerWins
          ? m.toYou
          : ownerWins > viewerWins
            ? m.toThem(name)
            : m.allSquare,
  };

  const spokenColumn = (column: WithViewerColumn) =>
    [column.label, column.record, column.detail]
      .filter((part): part is string => part != null)
      .join(" ");

  return {
    title,
    scope: m.allTime,
    columns: [together, against],
    empty: null,
    groups,
    spoken: all.matches.spokenParts(
      [title, spokenColumn(together), spokenColumn(against), groups].filter(
        (part): part is string => part != null,
      ),
    ),
  };
}

export function partnersTitle(sport: Sport, locale: Locale) {
  const m = messagesFor(locale).profile.playerPage;
  return {
    title: sport === "football" ? m.teammates : m.partners,
    meta: m.mostPlayed,
  };
}

export type PartnerRowView = {
  userId: string;
  name: string;
  image: string | null;
  record: string;
  /** Wins over Matches played together. */
  percent: number;
  spoken: string;
};

/** Partners or teammates: W–L in padel, W–D–L in football, and the win share. */
export function partnerRowsView(
  partners: readonly {
    userId: string;
    name: string;
    image: string | null;
    won: number;
    lost: number;
    played: number;
  }[],
  sport: Sport,
  locale: Locale,
): PartnerRowView[] {
  const m = messagesFor(locale).you.partners;
  return partners.map((partner) => {
    const percent =
      partner.played > 0 ? Math.round((partner.won / partner.played) * 100) : 0;
    return {
      userId: partner.userId,
      name: partner.name,
      image: partner.image,
      record: record(
        {
          won: partner.won,
          lost: partner.lost,
          drawn: partner.played - partner.won - partner.lost,
        },
        sport,
        locale,
      ),
      percent,
      spoken: m.spoken(partner.name, partner.won, partner.lost, percent),
    };
  });
}

export type ProfileTierView = {
  title: string;
  meta: string;
  rows: RatingsTierRow[];
  note: string;
};

/**
 * "Group tier" on a football Player profile: the player's fish in each tier
 * Group the viewer shares with them, as the Ratings screen draws its own.
 * None when they share no tier Group.
 */
export function profileTierView(
  rows: readonly MyGroupTierData[],
  options: { playerName: string; isViewer: boolean },
  locale: Locale,
): ProfileTierView | null {
  if (rows.length === 0) {
    return null;
  }
  const m = messagesFor(locale).rating;
  return {
    title: m.screen.tier.title,
    meta: options.isViewer
      ? m.screen.tier.count(rows.length)
      : m.profileTier.shared(rows.length),
    rows: ratingsTierRows(rows, locale),
    note: options.isViewer
      ? m.screen.tier.note
      : m.profileTier.note(firstName(options.playerName)),
  };
}

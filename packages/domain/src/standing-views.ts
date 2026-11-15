/**
 * The Standing tab's views (design "Group standings" 1a–1e): Overall, By
 * level and Most improved, picked under the Season chips. By level splits the
 * Overall table by the Temba Level; Most improved ranks the level gained since
 * the Season opened, on the ladder the Group feeds.
 *
 * A Verified Group gets all three, on the Temba Level. A tier Group (a
 * football Group that is not Verified) has no Temba Level to split by, so it
 * gets Overall and Most improved on Tier points (ADR-0066). A padel Group that
 * is not Verified keeps only the Overall table.
 */

import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { OVR_MIN } from "./football-ovr";
import {
  SEASON_MIN_RANKED_GAMES,
  type GroupSeasonStatus,
} from "./group-season";
import { formatTierPoints } from "./group-members-table";
import { displayLabelFromStoredBand, type LevelBand } from "./level-bands";

export type StandingView = "overall" | "by-level" | "most-improved";

/** What Most improved measures: the Temba Level, or a tier Group's Tier points. */
export type StandingLadder = "level" | "tier";

export function standingLadder(group: {
  verified: boolean;
  hasTier: boolean;
}): StandingLadder | null {
  if (group.verified) {
    return "level";
  }
  return group.hasTier ? "tier" : null;
}

export type StandingViewOption = {
  view: StandingView;
  label: string;
  /** Most improved is a Season view, so it is off on All-time. */
  enabled: boolean;
};

/**
 * The views row. Empty when the Group has only Overall, so the row is not
 * drawn. Most improved is dropped when the Group has no Season to measure.
 */
export function standingViewOptions(
  args: {
    verified: boolean;
    hasTier: boolean;
    hasSeasons: boolean;
    seasonInView: boolean;
  },
  locale: Locale,
): StandingViewOption[] {
  const m = messagesFor(locale).group.standing.views;
  const ladder = standingLadder(args);
  const options: StandingViewOption[] = [
    { view: "overall", label: m.overall, enabled: true },
  ];
  if (ladder === "level") {
    options.push({ view: "by-level", label: m.byLevel, enabled: true });
  }
  if (ladder !== null && args.hasSeasons) {
    options.push({
      view: "most-improved",
      label: m.mostImproved,
      enabled: args.seasonInView,
    });
  }
  return options.length > 1 ? options : [];
}

/** The view to draw: the one picked, or Overall when it is not on offer here. */
export function standingViewShown(
  picked: StandingView,
  options: readonly StandingViewOption[],
): StandingView {
  return options.some((option) => option.view === picked && option.enabled)
    ? picked
    : "overall";
}

/**
 * One member's levels as `groups.standingLevels` reads them for a lens. On
 * the Temba Level `start` and `end` are padel hundredths or whole football
 * OVR; on a tier Group they are Tier points.
 */
export type StandingLevelData = {
  userId: string;
  /** The padel Level band the member is placed by: now, or at close. */
  band: LevelBand | null;
  /** The whole football OVR the member is placed by: now, or at close. */
  ovr: number | null;
  /** Season lens only: the value when the Season opened. */
  start: number | null;
  /** Season lens only: the value now, or when the Season closed. */
  end: number | null;
  startBand: LevelBand | null;
  endBand: LevelBand | null;
};

export type StandingLevelsData = {
  ladder: StandingLadder | null;
  sport: string | null;
  members: StandingLevelData[];
};

const OVR_RANGE_WIDTH = 15;

/** Higher first: A, B, C, D on padel; the top OVR range on football. */
function categoryOf(
  level: Pick<StandingLevelData, "band" | "ovr">,
  sport: string | null,
): { order: number; key: string } | null {
  if (sport === "football") {
    if (level.ovr == null) {
      return null;
    }
    const index = Math.max(
      0,
      Math.floor((Math.round(level.ovr) - OVR_MIN) / OVR_RANGE_WIDTH),
    );
    return { order: index, key: `ovr-${index}` };
  }
  if (level.band == null) {
    return null;
  }
  const letter = displayLabelFromStoredBand(level.band).charAt(0);
  return { order: "DCBA".indexOf(letter), key: letter };
}

function categoryTitle(key: string, locale: Locale) {
  const m = messagesFor(locale).group.standing.views;
  if (key.startsWith("ovr-")) {
    const index = Number(key.slice(4));
    const low = OVR_MIN + index * OVR_RANGE_WIDTH;
    return m.levelRange(low, low + OVR_RANGE_WIDTH - 1);
  }
  return m.category(key);
}

/** `"C+"` on padel, `"72"` on football; `null` with no Level. */
export function standingLevelLabel(
  level: Pick<StandingLevelData, "band" | "ovr"> | undefined,
  sport: string | null,
): string | null {
  if (!level) {
    return null;
  }
  if (sport === "football") {
    return level.ovr == null ? null : String(Math.round(level.ovr));
  }
  return level.band ? displayLabelFromStoredBand(level.band) : null;
}

type StandingRowShape = {
  userId: string;
  position: number | null;
  ranked: boolean;
};

export type ByLevelRow<T> = T & { levelLabel: string | null };

export type ByLevelSection<T> = {
  key: string;
  title: string;
  countLabel: string;
  rows: ByLevelRow<T>[];
};

/**
 * By level (design 1b, 1d, 1e): the Overall rows, in their Overall order,
 * split into one table per category with its own 1st place. Padel groups by
 * band letter; football by OVR ranges of 15 from 40. Ranked members with no
 * Level come last under their own heading; unranked members stay in one
 * Unranked list below every category.
 */
export function standingByLevel<T extends StandingRowShape>(
  rows: readonly T[],
  levels: readonly StandingLevelData[],
  sport: string | null,
  locale: Locale,
): { sections: ByLevelSection<T>[]; unranked: ByLevelRow<T>[] } {
  const m = messagesFor(locale).group.standing.views;
  const levelByUser = new Map(levels.map((level) => [level.userId, level]));
  const byKey = new Map<string, { order: number; rows: ByLevelRow<T>[] }>();
  const noLevel: ByLevelRow<T>[] = [];
  const unranked: ByLevelRow<T>[] = [];

  for (const row of rows) {
    const level = levelByUser.get(row.userId);
    const withLabel = { ...row, levelLabel: standingLevelLabel(level, sport) };
    if (!row.ranked) {
      unranked.push(withLabel);
      continue;
    }
    const category = level ? categoryOf(level, sport) : null;
    if (!category) {
      noLevel.push(withLabel);
      continue;
    }
    const entry = byKey.get(category.key) ?? {
      order: category.order,
      rows: [],
    };
    entry.rows.push(withLabel);
    byKey.set(category.key, entry);
  }

  const renumber = (list: ByLevelRow<T>[]) =>
    list.map((row, index) => ({ ...row, position: index + 1 }));
  const sections: ByLevelSection<T>[] = [...byKey.entries()]
    .sort(([, a], [, b]) => b.order - a.order)
    .map(([key, entry]) => ({
      key,
      title: categoryTitle(key, locale),
      countLabel: m.players(entry.rows.length),
      rows: renumber(entry.rows),
    }));
  if (noLevel.length > 0) {
    sections.push({
      key: "no-level",
      title: m.noLevel,
      countLabel: m.players(noLevel.length),
      rows: renumber(noLevel),
    });
  }
  return { sections, unranked };
}

const MINUS = "−";

function signed(text: string, value: number) {
  if (value > 0) {
    return `+${text}`;
  }
  return value < 0 ? `${MINUS}${text}` : text;
}

/** A Most improved value on its ladder's face: `"3.45"`, `"72"` or `"1,240"`. */
export function formatImprovementValue(
  value: number,
  ladder: StandingLadder,
  sport: string | null,
) {
  if (ladder === "tier") {
    return formatTierPoints(value);
  }
  return sport === "football"
    ? String(Math.round(value))
    : (Math.round(value) / 100).toFixed(2);
}

/** A gain on its ladder's face: `"+0.30"`, `"−0.05"`, `"0.00"`, `"+4"`. */
export function formatImprovementGain(
  gain: number,
  ladder: StandingLadder,
  sport: string | null,
) {
  return signed(formatImprovementValue(Math.abs(gain), ladder, sport), gain);
}

export type MostImprovedRow<T> = T & {
  position: number | null;
  start: string | null;
  end: string | null;
  gain: string | null;
  gainValue: number | null;
  /** Padel only: `"C+ to B−"` or `"stays C+"`. */
  changeLine: string | null;
};

function bandChangeLine(
  level: StandingLevelData,
  sport: string | null,
  ladder: StandingLadder,
  locale: Locale,
) {
  if (ladder !== "level" || sport === "football") {
    return null;
  }
  const m = messagesFor(locale).group.standing.views;
  const from = level.startBand
    ? displayLabelFromStoredBand(level.startBand)
    : null;
  const to = level.endBand ? displayLabelFromStoredBand(level.endBand) : null;
  if (!from || !to) {
    return null;
  }
  return from === to ? m.staysBand(to) : m.bandChange(from, to);
}

/**
 * Most improved (design 1c): the gain from the Season's open to now, or to its
 * close. Members with at least `minRankedGames` results this Season and a gain
 * above zero are ranked, biggest gain first; members flat or down follow
 * without a place, then members short of the games to rank. Equal gains keep
 * their Overall order.
 */
export function mostImprovedTable<T extends { userId: string; played: number }>(
  rows: readonly T[],
  levels: readonly StandingLevelData[],
  ladder: StandingLadder,
  sport: string | null,
  locale: Locale,
  minRankedGames = SEASON_MIN_RANKED_GAMES,
): {
  ranked: MostImprovedRow<T>[];
  noGain: MostImprovedRow<T>[];
  unranked: MostImprovedRow<T>[];
} {
  const levelByUser = new Map(levels.map((level) => [level.userId, level]));
  const withGain = rows.map((row): MostImprovedRow<T> => {
    const level = levelByUser.get(row.userId);
    if (level?.start == null || level.end == null) {
      return {
        ...row,
        position: null,
        start: null,
        end: null,
        gain: null,
        gainValue: null,
        changeLine: null,
      };
    }
    const gainValue = Math.round(level.end) - Math.round(level.start);
    return {
      ...row,
      position: null,
      start: formatImprovementValue(level.start, ladder, sport),
      end: formatImprovementValue(level.end, ladder, sport),
      gain: formatImprovementGain(gainValue, ladder, sport),
      gainValue,
      changeLine: bandChangeLine(level, sport, ladder, locale),
    };
  });
  const byGain = (a: MostImprovedRow<T>, b: MostImprovedRow<T>) =>
    (b.gainValue ?? Number.NEGATIVE_INFINITY) -
    (a.gainValue ?? Number.NEGATIVE_INFINITY);

  const played = withGain.filter((row) => row.played >= minRankedGames);
  const ranked = played
    .filter((row) => (row.gainValue ?? 0) > 0)
    .sort(byGain)
    .map((row, index) => ({ ...row, position: index + 1 }));
  const noGain = played.filter((row) => (row.gainValue ?? 0) <= 0).sort(byGain);
  const unranked = withGain
    .filter((row) => row.played < minRankedGames)
    .sort(byGain);
  return { ranked, noGain, unranked };
}

/** The Most improved column heads: the end column reads Close once the Season has. */
export function mostImprovedColumns(
  status: GroupSeasonStatus | null,
  locale: Locale,
) {
  const m = messagesFor(locale).group.standing.views.columns;
  return {
    start: m.start,
    end: status === "closed" ? m.close : m.now,
    gain: m.gain,
  };
}

/** The No gain divider's note, by ladder. */
export function mostImprovedNoGainNote(ladder: StandingLadder, locale: Locale) {
  const m = messagesFor(locale).group.standing.views;
  return ladder === "tier" ? m.pointsFlatOrDown : m.levelFlatOrDown;
}

/** The footer under By level and Most improved. */
export function standingViewFooter(
  view: Exclude<StandingView, "overall">,
  args: { ladder: StandingLadder; sport: string | null },
  locale: Locale,
  minRankedGames = SEASON_MIN_RANKED_GAMES,
) {
  const m = messagesFor(locale).group.standing.views.footer;
  if (view === "by-level") {
    return args.sport === "football" ? m.byLevelFootball : m.byLevelPadel;
  }
  const gain = args.ladder === "tier" ? m.gainTier : m.gainLevel;
  return `${gain} ${m.playToRank(minRankedGames)}`;
}

/** What a Most improved row says to a screen reader. */
export function mostImprovedSpoken(
  row: Pick<
    MostImprovedRow<{ played: number }>,
    "position" | "start" | "end" | "gain" | "changeLine"
  >,
  name: string,
  locale: Locale,
) {
  const m = messagesFor(locale).group.standing.views.spoken;
  const lead = row.position == null ? name : `${row.position}. ${name}`;
  if (row.start == null || row.end == null || row.gain == null) {
    return `${lead}, ${m.noLevel}`;
  }
  const change = row.changeLine ? ` ${row.changeLine}.` : "";
  return `${lead}, ${m.gain(row.start, row.end, row.gain)}${change}`;
}

import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatOvr, wholeOvrFromMu } from "./football-ovr";
import {
  formatDayMonth,
  formatGameDay,
  formatMonth,
} from "./format-game-start";
import { groupDisplayName } from "./group-join";
import { formatTierPoints } from "./group-members-table";
import {
  formatPadelLevel,
  levelFromMu,
  RATED_MATCHES_TO_CONFIRM,
} from "./level";
import type { LevelOverrideReason } from "./level-slider";
import { zonedParts } from "./product-timezone";
import { sportLabel, type Sport } from "./sport";
import { TIER_BANDS, tierBandLabel, type TierBand } from "./tier-bands";
import { TIER_PROVISIONAL_GAMES } from "./tier-points";
import { formatTierDelta } from "./tier-adjust";

/**
 * One line of a Rating history (ADR-0073): something that moved a User's
 * Group Tier, newest first. Manual changes carry who and why.
 */
export type RatingHistoryEntryData =
  | {
      kind: "tier_game";
      id: string;
      at: Date | string;
      /** When the Game was played; its day heads the line. */
      playedAt: Date | string | null;
      delta: number;
      resultDelta: number;
      performanceDelta: number;
      /** The settled Performance rating, in hundredths; null without one. */
      ratingHundredths: number | null;
      pointsBefore: number;
      pointsAfter: number;
      /** Goals from the member's own side first; null when unreadable. */
      score: { own: number; opponent: number } | null;
    }
  | {
      kind: "tier_adjustment";
      id: string;
      at: Date | string;
      delta: number;
      pointsBefore: number;
      pointsAfter: number;
      setBy: { userId: string; name: string | null } | null;
      reason: LevelOverrideReason | null;
      note: string | null;
    };

/** A member's Group Tier as the Points and history header reads it. */
export type TierHistoryStandingData = {
  band: TierBand | null;
  /** Null while Provisional. */
  place: number | null;
  rankedCount: number;
  points: number;
  provisional: boolean;
  gamesOfFive: number;
  gamesCounted: number;
  nextBand: TierBand | null;
  pointsToNextBand: number | null;
};

export type TierHistoryData = {
  member: {
    userId: string;
    name: string | null;
    image: string | null;
    isViewer: boolean;
  };
  /** Null when the member holds no Group Tier here today. */
  tier: TierHistoryStandingData | null;
  entries: RatingHistoryEntryData[];
};

export type RatingHistoryRow = {
  key: string;
  title: string;
  detail: string;
  /** Who made a manual change and why; null on a Game. */
  byline: string | null;
  delta: string;
  spoken: string;
};

function formatRating(hundredths: number) {
  return (hundredths / 100).toFixed(1);
}

function gameTitle(
  entry: Extract<RatingHistoryEntryData, { kind: "tier_game" }>,
  locale: Locale,
) {
  const copy = messagesFor(locale).rating.history.game;
  const score = entry.score;
  const result = score
    ? (score.own > score.opponent
        ? copy.won
        : score.own < score.opponent
          ? copy.lost
          : copy.drew)(`${score.own}–${score.opponent}`)
    : copy.played;
  return entry.ratingHundredths == null
    ? result
    : copy.rated(result, formatRating(entry.ratingHundredths));
}

function gameDetail(
  entry: Extract<RatingHistoryEntryData, { kind: "tier_game" }>,
  locale: Locale,
) {
  const copy = messagesFor(locale).rating.history.game;
  const date = formatGameDay(entry.playedAt ?? entry.at, locale, {
    weekday: "short",
  });
  const result = formatTierDelta(entry.resultDelta);
  return entry.ratingHundredths == null && entry.performanceDelta === 0
    ? copy.resultOnly(date, result)
    : copy.parts(date, result, formatTierDelta(entry.performanceDelta));
}

function adjustmentByline(
  entry: Extract<RatingHistoryEntryData, { kind: "tier_adjustment" }>,
  viewerUserId: string,
  locale: Locale,
) {
  const m = messagesFor(locale).rating;
  const copy = m.history.adjustment;
  const name =
    entry.setBy == null
      ? copy.someone
      : entry.setBy.userId === viewerUserId
        ? copy.you
        : (entry.setBy.name ?? copy.someone);
  const reason = entry.reason ? m.adjust.reasons[entry.reason] : null;
  if (reason == null) {
    return entry.note ? copy.quote(name, entry.note) : name;
  }
  return entry.note
    ? copy.bylineNote(name, reason, entry.note)
    : copy.byline(name, reason);
}

/** A line of "What moved it" (screen 2e). */
export function ratingHistoryRow(
  entry: RatingHistoryEntryData,
  viewerUserId: string,
  locale: Locale,
): RatingHistoryRow {
  const m = messagesFor(locale).rating.history;
  const delta = formatTierDelta(entry.delta);
  let title: string;
  let detail: string;
  let byline: string | null = null;
  if (entry.kind === "tier_game") {
    title = gameTitle(entry, locale);
    detail = gameDetail(entry, locale);
  } else {
    title = m.adjustment.title;
    detail = m.adjustment.detail(
      formatDayMonth(entry.at, locale, { weekday: "short" }),
      formatTierPoints(entry.pointsBefore),
      formatTierPoints(entry.pointsAfter),
    );
    byline = adjustmentByline(entry, viewerUserId, locale);
  }
  return {
    key: entry.id,
    title,
    detail,
    byline,
    delta,
    spoken: [title, detail, byline, m.deltaSpoken(delta)]
      .filter(Boolean)
      .join(". "),
  };
}

export type TierHistoryHeader = {
  name: string;
  caption: string;
  band: TierBand | null;
  bandLabel: string | null;
  /** "Kanaad, #4 of 13", "#2 of 3", or the Provisional count. */
  standing: string | null;
  provisional: boolean;
  points: string | null;
  toNextBand: string | null;
};

export type TierHistoryScreen = {
  title: string;
  header: TierHistoryHeader;
  listTitle: string;
  countLabel: string | null;
  rows: RatingHistoryRow[];
  emptyText: string | null;
  footnote: string;
};

/** Points and history for one member of a tier Group (screen 2e). */
export function tierHistoryScreen(
  data: TierHistoryData,
  viewerUserId: string,
  locale: Locale,
): TierHistoryScreen {
  const m = messagesFor(locale).rating;
  const copy = m.history;
  const tier = data.tier;
  const bandLabel = tier?.band ? tierBandLabel(tier.band, locale) : null;
  let standing: string | null = null;
  if (tier) {
    if (tier.provisional || tier.place == null) {
      standing = m.tier.provisionalGames(
        tier.gamesOfFive,
        TIER_PROVISIONAL_GAMES,
      );
    } else {
      const placeOf = m.adjust.placeOf(tier.place, tier.rankedCount);
      standing = bandLabel ? m.adjust.nowRanked(bandLabel, placeOf) : placeOf;
    }
  }
  const toNextBand =
    tier?.nextBand && tier.pointsToNextBand != null
      ? copy.toNextBand(
          formatTierPoints(tier.pointsToNextBand),
          tierBandLabel(tier.nextBand, locale),
        )
      : null;
  const name = data.member.name ?? copy.unnamed;
  const rows = data.entries.map((entry) =>
    ratingHistoryRow(entry, viewerUserId, locale),
  );
  return {
    title: copy.title,
    header: {
      name,
      caption: copy.groupGames(tier?.gamesCounted ?? 0),
      band: tier?.band ?? null,
      bandLabel,
      standing,
      provisional: tier?.provisional ?? false,
      points: tier ? formatTierPoints(tier.points) : null,
      toNextBand,
    },
    listTitle: copy.whatMovedIt,
    countLabel: rows.length > 0 ? copy.lastCount(rows.length) : null,
    rows,
    emptyText: rows.length === 0 ? copy.empty : null,
    footnote: data.member.isViewer
      ? copy.footnote.self
      : copy.footnote.other(firstName(name)),
  };
}

function firstName(name: string) {
  const [first] = name.trim().split(/\s+/);
  return first ?? name;
}

/** The filters of a User's Rating history (screen 1c). */
export const RATING_HISTORY_LADDERS = ["all", "level", "tier", "rank"] as const;

export type RatingHistoryLadder = (typeof RATING_HISTORY_LADDERS)[number];

export function isRatingHistoryLadder(
  value: unknown,
): value is RatingHistoryLadder {
  return (RATING_HISTORY_LADDERS as readonly unknown[]).includes(value);
}

export type LevelOverrideSetByRole = "level_setter" | "operator" | "verifier";

type GroupRef = { id: string; name: string | null };

type TierGameEntry = Extract<RatingHistoryEntryData, { kind: "tier_game" }>;
type TierAdjustmentEntry = Extract<
  RatingHistoryEntryData,
  { kind: "tier_adjustment" }
>;

/**
 * One line of a User's own Rating history (screen 1c, ADR-0073): a Rated
 * Match, a Level override or the derived "Level confirmed" milestone on the
 * Level, or a Game, a Tier adjustment or a change of fish in a tier Group.
 */
export type RatingHistoryItemData =
  | {
      kind: "level_confirmed";
      /** The Rated Match's `rating_events` row the milestone sits on. */
      id: string;
      at: Date | string;
      sport: Sport;
      muAfter: number;
      /** Counting Matches in the sport up to and including that one. */
      matchesCounted: number;
    }
  | {
      kind: "level_match";
      id: string;
      at: Date | string;
      sport: Sport;
      muBefore: number;
      muAfter: number;
      venueName: string | null;
      /** Scored Sets from the User's own side; null when unreadable. */
      sets: { own: number; opponent: number }[] | null;
      /** What fed a football move beyond the result; null on padel. */
      football: {
        ratingHundredths: number | null;
        goals: number;
        mvp: boolean;
      } | null;
    }
  | {
      kind: "level_override";
      id: string;
      at: Date | string;
      sport: Sport;
      muBefore: number;
      muAfter: number;
      setByRole: LevelOverrideSetByRole;
      setBy: { userId: string; name: string | null } | null;
      /** The Venue a Verifier calibrated from. */
      venueName: string | null;
      reason: LevelOverrideReason | null;
      note: string | null;
    }
  | (TierGameEntry & { group: GroupRef; band: TierBand | null })
  | (TierAdjustmentEntry & { group: GroupRef; band: TierBand | null })
  | {
      kind: "tier_band";
      id: string;
      at: Date | string;
      group: GroupRef;
      bandBefore: TierBand | null;
      bandAfter: TierBand | null;
      place: number | null;
      rankedCount: number | null;
      points: number;
    };

export type RatingHistoryIcon =
  | { kind: "level" }
  | { kind: "override" }
  | { kind: "tier"; band: TierBand | null; label: string | null };

export type RatingHistoryLine = {
  key: string;
  icon: RatingHistoryIcon;
  title: string;
  detail: string;
  /** Who made a manual change and why; null when nobody did. */
  byline: string | null;
  /**
   * The move: "+1", "−59", "tier" for a change of fish, or the confirmed
   * Level on a "Level confirmed" milestone.
   */
  delta: string;
  /** Where it left the number: "74", "1,201", or "set" on the milestone. */
  after: string;
  /** What `delta` and `after` say together, for a screen reader. */
  valueSpoken: string;
  spoken: string;
};

const MINUS = "−";

function levelFace(sport: Sport, mu: number) {
  return sport === "football"
    ? wholeOvrFromMu(mu)
    : Number(formatPadelLevel(levelFromMu(mu), 2));
}

function formatLevelFace(sport: Sport, value: number) {
  return sport === "football" ? formatOvr(value) : value.toFixed(2);
}

/** The move as the faces show it, so before plus delta reads after. */
function levelDelta(sport: Sport, before: number, after: number) {
  const steps =
    sport === "football" ? after - before : Math.round((after - before) * 100);
  const amount =
    sport === "football"
      ? String(Math.abs(steps))
      : (Math.abs(steps) / 100).toFixed(2);
  if (steps > 0) {
    return `+${amount}`;
  }
  if (steps < 0) {
    return `${MINUS}${amount}`;
  }
  return amount;
}

/** A Level move on the sport's face: "+1" in OVR, "−0.04" on padel. */
export function levelMoveDelta(
  sport: Sport,
  muBefore: number,
  muAfter: number,
) {
  return levelDelta(
    sport,
    levelFace(sport, muBefore),
    levelFace(sport, muAfter),
  );
}

function setsLine(sets: { own: number; opponent: number }[], locale: Locale) {
  const m = messagesFor(locale).rating;
  return sets
    .map((set) => `${set.own}–${set.opponent}`)
    .join(m.ratingHistory.separator);
}

function matchResult(
  sets: { own: number; opponent: number }[] | null,
  locale: Locale,
) {
  const copy = messagesFor(locale).rating.history.game;
  if (!sets || sets.length === 0) {
    return null;
  }
  let won = 0;
  let lost = 0;
  for (const set of sets) {
    if (set.own > set.opponent) {
      won += 1;
    } else if (set.own < set.opponent) {
      lost += 1;
    }
  }
  const score = setsLine(sets, locale);
  return (won > lost ? copy.won : won < lost ? copy.lost : copy.drew)(score);
}

function levelMatchLine(
  item: Extract<RatingHistoryItemData, { kind: "level_match" }>,
  locale: Locale,
) {
  const m = messagesFor(locale).rating.ratingHistory;
  const result = matchResult(item.sets, locale);
  let detail =
    result && item.venueName
      ? m.level.detail(result, item.venueName)
      : (result ?? item.venueName ?? sportLabel(item.sport, locale) ?? "");
  if (item.football) {
    const parts = [m.level.result];
    if (item.football.ratingHundredths != null) {
      parts.push(m.level.ratings(formatRating(item.football.ratingHundredths)));
    }
    if (item.football.goals > 0) {
      parts.push(m.level.goals(item.football.goals));
    }
    if (item.football.mvp) {
      parts.push(m.level.mvp);
    }
    detail = m.level.withParts(detail, parts.join(m.separator));
  }
  return { title: m.level.title, detail };
}

function setterName(
  setBy: { userId: string; name: string | null } | null,
  viewerUserId: string,
  locale: Locale,
) {
  const m = messagesFor(locale).rating;
  if (setBy == null) {
    return m.ratingHistory.override.someone;
  }
  return setBy.userId === viewerUserId
    ? m.history.adjustment.you
    : (setBy.name ?? m.ratingHistory.override.someone);
}

function overrideByline(
  item: Extract<RatingHistoryItemData, { kind: "level_override" }>,
  viewerUserId: string,
  locale: Locale,
) {
  const all = messagesFor(locale);
  const copy = all.rating.history.adjustment;
  const name = setterName(item.setBy, viewerUserId, locale);
  const who =
    item.setByRole === "verifier" && item.venueName
      ? all.rating.ratingHistory.override.atVenue(name, item.venueName)
      : name;
  const reason = item.reason
    ? all.rating.adjust.reasons[item.reason]
    : all.level.noReasonGiven;
  return item.note
    ? copy.bylineNote(who, reason, item.note)
    : copy.byline(who, reason);
}

function bandTitle(
  item: Extract<RatingHistoryItemData, { kind: "tier_band" }>,
  locale: Locale,
) {
  const m = messagesFor(locale).rating.ratingHistory.tier;
  const { bandBefore: before, bandAfter: after } = item;
  if (after == null) {
    return before ? m.noLonger(tierBandLabel(before, locale)) : null;
  }
  const label = tierBandLabel(after, locale);
  if (before == null) {
    return m.nowA(label);
  }
  return TIER_BANDS.indexOf(after) < TIER_BANDS.indexOf(before)
    ? m.upTo(label)
    : m.downTo(label);
}

/** A line of a User's Rating history (screen 1c). */
export function ratingHistoryLine(
  item: RatingHistoryItemData,
  viewerUserId: string,
  locale: Locale,
): RatingHistoryLine {
  const all = messagesFor(locale);
  const m = all.rating.ratingHistory;
  let icon: RatingHistoryIcon;
  let title: string;
  let detail: string;
  let byline: string | null = null;
  let delta: string;
  let after: string;
  let valueSpoken: string | null = null;

  if (item.kind === "level_confirmed") {
    const level = formatLevelFace(
      item.sport,
      levelFace(item.sport, item.muAfter),
    );
    icon = { kind: "level" };
    title = m.confirmed.title;
    detail =
      item.matchesCounted === RATED_MATCHES_TO_CONFIRM
        ? m.confirmed.fifth
        : m.confirmed.afterMatches(item.matchesCounted);
    delta = level;
    after = m.confirmed.set;
    valueSpoken = m.confirmed.spoken(level);
  } else if (item.kind === "level_match" || item.kind === "level_override") {
    const before = levelFace(item.sport, item.muBefore);
    const afterFace = levelFace(item.sport, item.muAfter);
    delta = levelDelta(item.sport, before, afterFace);
    after = formatLevelFace(item.sport, afterFace);
    if (item.kind === "level_match") {
      icon = { kind: "level" };
      ({ title, detail } = levelMatchLine(item, locale));
    } else {
      icon = { kind: "override" };
      title = m.override.title[item.setByRole];
      detail = m.override.detail(
        sportLabel(item.sport, locale) ?? item.sport,
        formatLevelFace(item.sport, before),
        after,
      );
      byline = overrideByline(item, viewerUserId, locale);
    }
  } else {
    const group = groupDisplayName(item.group.name, locale);
    if (item.kind === "tier_band") {
      const band = item.bandAfter ?? item.bandBefore;
      icon = {
        kind: "tier",
        band,
        label: band ? tierBandLabel(band, locale) : null,
      };
      title = bandTitle(item, locale) ?? group;
      detail =
        item.place != null && item.rankedCount != null
          ? m.tier.bandDetail(
              group,
              all.rating.adjust.placeOf(item.place, item.rankedCount),
            )
          : group;
      delta = m.tier.bandDelta;
      after = formatTierPoints(item.points);
    } else {
      icon = {
        kind: "tier",
        band: item.band,
        label: item.band ? tierBandLabel(item.band, locale) : null,
      };
      delta = formatTierDelta(item.delta);
      after = formatTierPoints(item.pointsAfter);
      if (item.kind === "tier_game") {
        title = m.tier.title(group);
        detail = gameTitle(item, locale);
      } else {
        title = m.tier.adjustmentTitle;
        detail = m.tier.adjustmentDetail(
          group,
          formatTierPoints(item.pointsBefore),
          after,
        );
        byline = adjustmentByline(item, viewerUserId, locale);
      }
    }
  }

  valueSpoken ??= m.deltaSpoken(delta, after);
  return {
    key: item.kind === "level_confirmed" ? `${item.id}:confirmed` : item.id,
    icon,
    title,
    detail,
    byline,
    delta,
    after,
    valueSpoken,
    spoken: [title, detail, byline, valueSpoken].filter(Boolean).join(". "),
  };
}

export type RatingHistorySection = {
  key: string;
  title: string;
  lines: RatingHistoryLine[];
};

export type RatingHistoryScreen = {
  title: string;
  filterLabel: string;
  filters: { value: RatingHistoryLadder; label: string }[];
  sections: RatingHistorySection[];
  /** What an empty filter reads; `reserved` is Official Rank's "not yet". */
  empty: { text: string; reserved: boolean } | null;
  footnote: string;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** "This week" is the last seven days, as the You page's week change reads it. */
function sectionOf(at: Date, now: Date, locale: Locale) {
  const m = messagesFor(locale).rating.ratingHistory;
  if (now.getTime() - at.getTime() < WEEK_MS) {
    return { key: "this-week", title: m.thisWeek };
  }
  const { year, month } = zonedParts(at);
  const monthName = formatMonth(at, "long", locale);
  return {
    key: `${year}-${month}`,
    title:
      year === zonedParts(now).year
        ? monthName
        : m.monthOfYear(monthName, year),
  };
}

/**
 * A User's own Rating history (screen 1c): every move and every manual
 * change, newest first, under "This week" and then each month. The Rank
 * filter is reserved for Official Rank and stays empty.
 */
export function ratingHistoryScreen(
  data: {
    ladder: RatingHistoryLadder;
    sport?: Sport;
    items: readonly RatingHistoryItemData[];
    viewerUserId: string;
    now: Date;
  },
  locale: Locale,
): RatingHistoryScreen {
  const m = messagesFor(locale).rating;
  const copy = m.ratingHistory;

  const sections: RatingHistorySection[] = [];
  if (data.ladder !== "rank") {
    for (const item of data.items) {
      const at = item.at instanceof Date ? item.at : new Date(item.at);
      const section = sectionOf(at, data.now, locale);
      const line = ratingHistoryLine(item, data.viewerUserId, locale);
      const last = sections.at(-1);
      if (last?.key === section.key) {
        last.lines.push(line);
      } else {
        sections.push({ ...section, lines: [line] });
      }
    }
  }

  let empty: RatingHistoryScreen["empty"] = null;
  if (data.ladder === "rank") {
    empty = { text: m.screen.official.coming, reserved: true };
  } else if (sections.length === 0) {
    empty = {
      text:
        data.ladder === "tier"
          ? data.sport === "padel"
            ? copy.empty.tierPadel
            : copy.empty.tier
          : copy.empty[data.ladder],
      reserved: false,
    };
  }

  return {
    title: copy.title,
    filterLabel: copy.filter,
    filters: RATING_HISTORY_LADDERS.map((value) => ({
      value,
      label: copy.ladders[value],
    })),
    sections,
    empty,
    footnote: copy.footnote,
  };
}

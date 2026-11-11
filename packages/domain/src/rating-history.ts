import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatDayMonth, formatGameDay } from "./format-game-start";
import { formatTierPoints } from "./group-members-table";
import type { LevelOverrideReason } from "./level-slider";
import { tierBandLabel, type TierBand } from "./tier-bands";
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

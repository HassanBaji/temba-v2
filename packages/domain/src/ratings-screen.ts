import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  formatOvr,
  OVR_SCALE_TICKS,
  ovrFromLevel,
  ovrScalePercent,
  type LevelFace,
} from "./football-ovr";
import {
  formatTierPoints,
  tierPointsCount,
  type GroupMemberTierCell,
} from "./group-members-table";
import type { LevelHistoryStep } from "./home-level-chart";
import { initials } from "./initials";
import {
  formatPadelLevel,
  matchesTowardConfirming,
  RATED_MATCHES_TO_CONFIRM,
} from "./level";
import {
  displayLabelFromStoredBand,
  nextDistinctDisplayRung,
  type LevelBand,
} from "./level-bands";
import { percentThroughDisplayBand } from "./player-profile-level";
import { levelMoveDelta } from "./rating-history";
import type { Sport } from "./sport";
import { tierBandLabel, type TierBand } from "./tier-bands";
import { TIER_PROVISIONAL_GAMES } from "./tier-points";

export type GroupStandingData = {
  groupId: string;
  name: string;
  seasonId: string | null;
  position: number | null;
  memberCount: number;
  won: number;
  drawn: number;
  lost: number;
};

export type InYourGroupsRow = {
  groupId: string;
  name: string;
  initials: string;
  /** "9 won, 3 lost this season"; a Group with no Season reads all-time. */
  record: string;
  /** "#1 of 6", or "Unranked" before a result in the lens. */
  place: string;
  ranked: boolean;
  spoken: string;
};

function recordLine(row: GroupStandingData, locale: Locale) {
  const m = messagesFor(locale).rating.inYourGroups;
  if (row.seasonId === null) {
    return row.drawn > 0
      ? m.recordWithDrawn(row.won, row.drawn, row.lost)
      : m.record(row.won, row.lost);
  }
  return row.drawn > 0
    ? m.seasonRecordWithDrawn(row.won, row.drawn, row.lost)
    : m.seasonRecord(row.won, row.lost);
}

/**
 * "In your groups": each Group's won, lost and place in its
 * Standing. A padel Group has no Level and no tier (ADR-0066), so these rows
 * carry neither.
 */
export function inYourGroupsRows(
  rows: readonly GroupStandingData[],
  locale: Locale,
): InYourGroupsRow[] {
  const m = messagesFor(locale).rating.inYourGroups;
  return rows.map((row) => {
    const record = recordLine(row, locale);
    const place =
      row.position === null
        ? m.unranked
        : m.place(row.position, row.memberCount);
    return {
      groupId: row.groupId,
      name: row.name,
      initials: initials(row.name),
      record,
      place,
      ranked: row.position !== null,
      spoken: m.spoken(row.name, place, record),
    };
  });
}

const MINUS = "−";

/** The Temba Level as `ratings.me` reads it for one sport. */
export type RatingsLevelData = {
  face: LevelFace;
  levelValue: number | null;
  rating: {
    levelBand: LevelBand;
    provisional: boolean;
    ratedMatchesRemaining: number;
  } | null;
  ratedMatchCount: number;
  changeOverLast: { matches: number; delta: number; points: number[] } | null;
  /** The newest Rated Match, for football's "Last match" line. */
  lastMatch?: RatingsLastMatch | null;
  /** What moved each recent history point; a "set" means someone set the Level. */
  historySteps?: readonly LevelHistoryStep[];
};

export type RatingsLastMatch = {
  outcome: Exclude<LevelHistoryStep, "set" | "placed">;
  /** The scored Sets from the player's side; football has one, the goals. */
  sets: { own: number; opponent: number }[] | null;
  muBefore: number;
  muAfter: number;
};

/** "Next band B−, 40% of the way", "To confirm 2 of 5 matches", or "Last match Won 5–3 +1". */
export type RatingsLevelFooter = {
  label: string;
  /** The figure, drawn bold: a band, a count, or a Level move. */
  value: string | null;
  detail: string | null;
  /** The Last match result ahead of its move, as "Won 5–3". */
  result: string | null;
  /** Matches towards confirming, one pip each, while Provisional. */
  pips: { done: number; total: number } | null;
};

/** One tier Group as `ratings.myGroupTiers` reads it. */
export type MyGroupTierData = {
  groupId: string;
  name: string;
  memberCount: number;
  band: TierBand | null;
  place: number | null;
  /** Null when the reader may not see a Provisional member's points. */
  points: number | null;
  provisional: boolean;
  gamesOfFive: number;
};

export type RatingsLevelView =
  | { kind: "none"; title: string; message: string; note: string }
  | {
      kind: "rated";
      title: string;
      status: string;
      provisional: boolean;
      /** The padel band in the ring; football has no band, only the number. */
      band: string | null;
      numberLabel: string;
      number: string;
      /**
       * Padel: through the band when confirmed, towards confirming while
       * Provisional. Football: along the 40 to 99 scale.
       */
      ringPercent: number;
      /** A Provisional Level keeps a hatched track ("not yet"). */
      ringHatched: boolean;
      /** Football's 40 to 99 bar, filled to the OVR, with its labels. */
      scale: { percent: number; ticks: string[] } | null;
      change: {
        delta: string;
        caption: string;
        /** The face after each Match, oldest first, for the sparkline. */
        points: number[];
        spoken: string;
      } | null;
      /** Football before a counting Match: where the number came from. */
      start: string | null;
      footer: RatingsLevelFooter;
      note: string;
      spoken: string;
    };

export type RatingsTierRow = {
  groupId: string;
  name: string;
  cell: GroupMemberTierCell;
  /** "Kanaad, #6 of 13", or "Provisional, 2 of 5 games". */
  caption: string;
  /** Null while Provisional: no points to stand on yet. */
  points: string | null;
  spoken: string;
};

export type RatingsSection = "level" | "tier" | "groups" | "official";

export type RatingsScreenView = {
  sport: Sport;
  level: RatingsLevelView;
  tier: {
    title: string;
    meta: string;
    rows: RatingsTierRow[];
    note: string;
  } | null;
  inYourGroups: {
    title: string;
    meta: string;
    note: string | null;
    rows: InYourGroupsRow[];
  } | null;
  /** Reserved (ADR-0065): a hatched slot, never a number. */
  official: { title: string; message: string; note: string };
  /** The sections in the order the sport's Ratings screen shows them. */
  order: RatingsSection[];
};

/** A Level change on the sport's face: whole OVR points, or two decimals. */
export function signedLevelChange(delta: number, face: LevelFace) {
  const decimals = face === "ovr" ? 0 : 2;
  const amount = Math.abs(delta).toFixed(decimals);
  if (Number(amount) === 0) {
    return amount;
  }
  return `${delta > 0 ? "+" : MINUS}${amount}`;
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function levelChange(data: RatingsLevelData, locale: Locale) {
  const m = messagesFor(locale).rating.screen.level;
  const changeData = data.changeOverLast;
  if (!changeData) {
    return null;
  }
  const delta = signedLevelChange(changeData.delta, data.face);
  return {
    delta,
    caption: m.lastCount(changeData.matches),
    points: changeData.points,
    spoken: m.changeSpoken(delta, changeData.matches),
  };
}

function confirmFooter(
  ratedMatchesRemaining: number,
  locale: Locale,
): { percent: number; footer: RatingsLevelFooter } {
  const m = messagesFor(locale).rating.screen.level;
  const toward = matchesTowardConfirming(ratedMatchesRemaining);
  return {
    percent: clampPercent((toward / RATED_MATCHES_TO_CONFIRM) * 100),
    footer: {
      label: m.toConfirm,
      value: m.confirmCount(toward, RATED_MATCHES_TO_CONFIRM),
      detail: null,
      result: null,
      pips: { done: toward, total: RATED_MATCHES_TO_CONFIRM },
    },
  };
}

function lastMatchResult(lastMatch: RatingsLastMatch, locale: Locale) {
  const all = messagesFor(locale).rating;
  const score =
    lastMatch.sets && lastMatch.sets.length > 0
      ? lastMatch.sets
          .map((set) => `${set.own}–${set.opponent}`)
          .join(all.ratingHistory.separator)
      : null;
  return all.screen.level.lastResult[lastMatch.outcome](score);
}

function footerLine(footer: RatingsLevelFooter) {
  return [footer.label, footer.result, footer.value, footer.detail]
    .filter((part): part is string => part != null)
    .join(" ");
}

/**
 * The football Level card (ADR-0069): no band, only the OVR, with the 40 to
 * 99 scale under it. Top right is the change over the last eight counting
 * Matches, or where the number came from before the first. While Provisional
 * the footer counts Matches to confirm; once confirmed it reads the last
 * Match and what it did to the OVR.
 */
function footballLevelView(
  data: RatingsLevelData,
  rating: NonNullable<RatingsLevelData["rating"]>,
  levelValue: number,
  locale: Locale,
): RatingsLevelView {
  const m = messagesFor(locale).rating.screen.level;
  const ovr = ovrFromLevel(levelValue);
  const number = formatOvr(ovr);
  const percent = ovrScalePercent(ovr);
  const status = rating.provisional ? m.provisional : m.confirmed;
  const change = levelChange(data, locale);
  const start = change
    ? null
    : data.historySteps?.includes("set")
      ? m.startingLevel
      : m.startingFromSignUp;

  let footer: RatingsLevelFooter;
  if (rating.provisional) {
    footer = confirmFooter(rating.ratedMatchesRemaining, locale).footer;
  } else {
    const lastMatch = data.lastMatch;
    footer = {
      label: m.lastMatch,
      value: lastMatch
        ? levelMoveDelta("football", lastMatch.muBefore, lastMatch.muAfter)
        : null,
      detail: null,
      result: lastMatch ? lastMatchResult(lastMatch, locale) : m.noLastMatch,
      pips: null,
    };
  }

  return {
    kind: "rated",
    title: m.title,
    status,
    provisional: rating.provisional,
    band: null,
    numberLabel: m.number,
    number,
    ringPercent: percent,
    ringHatched: rating.provisional,
    scale: { percent, ticks: OVR_SCALE_TICKS.map(String) },
    change,
    start,
    footer,
    note: m.noteFootball,
    spoken: m.spokenOvr(
      number,
      [status, change?.spoken ?? start, footerLine(footer)]
        .filter((part): part is string => part != null)
        .join(". "),
    ),
  };
}

/**
 * The Temba Level card. Padel shows the band in the ring, the number, what
 * the last eight counting Matches did, and the way to the next band; a
 * Provisional Level shows a hatched ring and the count to confirm instead.
 * Football shows the number alone (`footballLevelView`).
 */
export function ratingsLevelView(
  data: RatingsLevelData,
  sport: Sport,
  locale: Locale,
): RatingsLevelView {
  const m = messagesFor(locale).rating.screen.level;
  const rating = data.rating;
  if (!rating || data.levelValue == null) {
    return {
      kind: "none",
      title: m.title,
      message: m.noLevel,
      note: sport === "football" ? m.noLevelFootball : m.noLevelPadel,
    };
  }
  if (data.face === "ovr") {
    return footballLevelView(data, rating, data.levelValue, locale);
  }

  const band = displayLabelFromStoredBand(rating.levelBand);
  const number = formatPadelLevel(data.levelValue, 2);
  const status = rating.provisional ? m.provisional : m.confirmed;

  let ringPercent: number;
  let footer: RatingsLevelFooter;
  if (rating.provisional) {
    const confirm = confirmFooter(rating.ratedMatchesRemaining, locale);
    ringPercent = confirm.percent;
    footer = { ...confirm.footer, pips: null };
  } else {
    const next = nextDistinctDisplayRung(rating.levelBand);
    if (next == null) {
      ringPercent = 100;
      footer = {
        label: m.topBand,
        value: null,
        detail: null,
        result: null,
        pips: null,
      };
    } else {
      ringPercent = percentThroughDisplayBand(
        data.levelValue,
        rating.levelBand,
      );
      footer = {
        label: m.nextBand,
        value: next,
        detail: m.ofTheWay(ringPercent),
        result: null,
        pips: null,
      };
    }
  }

  const change = levelChange(data, locale);
  return {
    kind: "rated",
    title: m.title,
    status,
    provisional: rating.provisional,
    band,
    numberLabel: m.number,
    number,
    ringPercent,
    ringHatched: rating.provisional,
    scale: null,
    change,
    start: null,
    footer,
    note: m.notePadel,
    spoken: m.spoken(
      band,
      number,
      [status, change?.spoken, footerLine(footer)]
        .filter((part): part is string => part != null)
        .join(". "),
    ),
  };
}

/**
 * A Group tier row: the fish, the place while fewer than two are
 * ranked, or a hatched Provisional slot; the band and place among the
 * Group's members; the points once out of Provisional.
 */
export function ratingsTierRows(
  rows: readonly MyGroupTierData[],
  locale: Locale,
): RatingsTierRow[] {
  const all = messagesFor(locale).rating;
  return rows.map((row) => {
    let cell: GroupMemberTierCell;
    let caption: string;
    if (row.provisional || row.place == null) {
      cell = { kind: "provisional", label: all.provisional };
      caption = all.tier.provisionalGames(
        row.gamesOfFive,
        TIER_PROVISIONAL_GAMES,
      );
    } else {
      const place = all.inYourGroups.place(row.place, row.memberCount);
      if (row.band) {
        const band = tierBandLabel(row.band, locale);
        cell = { kind: "fish", band: row.band, label: band };
        caption = all.screen.tier.bandPlace(band, place);
      } else {
        cell = { kind: "place", label: all.tier.place(row.place) };
        caption = place;
      }
    }
    const points =
      row.provisional || row.place == null || row.points == null
        ? null
        : formatTierPoints(row.points);
    return {
      groupId: row.groupId,
      name: row.name,
      cell,
      caption,
      points,
      spoken: [
        row.name,
        caption,
        points
          ? all.tier.pointsSpoken(points, tierPointsCount(row.points ?? 0))
          : null,
      ]
        .filter((part): part is string => part != null)
        .join(", "),
    };
  });
}

/**
 * The Ratings screen. Football has all three ladders:
 * Temba Level, a Group tier in each tier Group, and its Verified Groups under
 * "In your groups". Padel has no tier (ADR-0066); its Groups keep a Standing.
 * Official Rank is reserved on both.
 */
export function ratingsScreenView(
  input: {
    sport: Sport;
    level: RatingsLevelData;
    tiers: readonly MyGroupTierData[];
    standings: readonly GroupStandingData[];
  },
  locale: Locale,
): RatingsScreenView {
  const all = messagesFor(locale).rating;
  const football = input.sport === "football";
  const tierRows = football ? ratingsTierRows(input.tiers, locale) : [];
  const tierGroupIds = new Set(tierRows.map((row) => row.groupId));
  const groupRows = inYourGroupsRows(
    football
      ? input.standings.filter((row) => !tierGroupIds.has(row.groupId))
      : input.standings,
    locale,
  );
  return {
    sport: input.sport,
    level: ratingsLevelView(input.level, input.sport, locale),
    tier:
      tierRows.length > 0
        ? {
            title: all.screen.tier.title,
            meta: all.screen.tier.count(tierRows.length),
            rows: tierRows,
            note: all.screen.tier.note,
          }
        : null,
    inYourGroups:
      groupRows.length > 0
        ? {
            title: all.inYourGroups.title,
            meta: football
              ? all.screen.verifiedGroups
              : all.inYourGroups.noTierPadel,
            note: football ? null : all.inYourGroups.padelNote,
            rows: groupRows,
          }
        : null,
    official: {
      title: all.screen.official.title,
      message: all.screen.official.coming,
      note: all.screen.official.note,
    },
    order: football
      ? ["level", "tier", "groups", "official"]
      : ["level", "official", "groups"],
  };
}

export type SportSwitchLevel = { label: string; spoken: string };

/**
 * What the Home sport switch shows beside a sport: the padel band, or the
 * football OVR, which has no band. Null before the first Rating.
 */
export function sportSwitchLevel(
  sport: Sport,
  data:
    | Pick<RatingsLevelData, "face" | "levelValue" | "rating">
    | null
    | undefined,
  locale: Locale,
): SportSwitchLevel | null {
  if (!data?.rating || data.levelValue == null) {
    return null;
  }
  const all = messagesFor(locale);
  const sportName = all.common[sport];
  if (data.face === "ovr") {
    const ovr = formatOvr(ovrFromLevel(data.levelValue));
    return {
      label: ovr,
      spoken: all.home.sportSwitch.spokenOvr(sportName, ovr),
    };
  }
  const band = displayLabelFromStoredBand(data.rating.levelBand);
  return { label: band, spoken: all.home.sportSwitch.spoken(sportName, band) };
}

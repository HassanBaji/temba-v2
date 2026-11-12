import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatOvr, ovrFromLevel, type LevelFace } from "./football-ovr";
import {
  formatTierPoints,
  type GroupMemberTierCell,
} from "./group-members-table";
import { initials } from "./initials";
import { formatPadelLevel } from "./level";
import {
  displayLabelFromStoredBand,
  nextDistinctDisplayRung,
  type LevelBand,
} from "./level-bands";
import { percentThroughDisplayBand } from "./player-profile-level";
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
 * "In your groups" (design 1b): each Group's won, lost and place in its
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
};

/** One tier Group as `ratings.myGroupTiers` reads it. */
export type MyGroupTierData = {
  groupId: string;
  name: string;
  memberCount: number;
  band: TierBand | null;
  place: number | null;
  points: number;
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
      band: string;
      numberLabel: string;
      number: string;
      /** Through the band when confirmed; towards confirming while Provisional. */
      ringPercent: number;
      /** A Provisional Level keeps a hatched track ("not yet"). */
      ringHatched: boolean;
      change: {
        delta: string;
        caption: string;
        /** The face after each Match, oldest first, for the sparkline. */
        points: number[];
        spoken: string;
      } | null;
      /** "Next band B−, 40% of the way", or "To confirm 2 of 5 matches". */
      footer: { label: string; value: string | null; detail: string | null };
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
  /** Screen 1a's order on football, 1b's on padel. */
  order: RatingsSection[];
};

function signedChange(delta: number, face: LevelFace) {
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

/**
 * The Temba Level card (screens 1a, 1b): the band in the ring, the number on
 * the sport's face, what the last eight counting Matches did, and the way to
 * the next band. A Provisional Level shows a hatched ring and the count to
 * confirm instead.
 */
export function ratingsLevelView(
  data: RatingsLevelData,
  sport: Sport,
  locale: Locale,
): RatingsLevelView {
  const m = messagesFor(locale).rating.screen.level;
  const note = sport === "football" ? m.noteFootball : m.notePadel;
  const rating = data.rating;
  if (!rating || data.levelValue == null) {
    return {
      kind: "none",
      title: m.title,
      message: m.noLevel,
      note: sport === "football" ? m.noLevelFootball : m.noLevelPadel,
    };
  }

  const band = displayLabelFromStoredBand(rating.levelBand);
  const number =
    data.face === "ovr"
      ? formatOvr(ovrFromLevel(data.levelValue))
      : formatPadelLevel(data.levelValue, 2);
  const status = rating.provisional ? m.provisional : m.confirmed;

  let ringPercent: number;
  let footer: { label: string; value: string | null; detail: string | null };
  if (rating.provisional) {
    const total = data.ratedMatchCount + rating.ratedMatchesRemaining;
    ringPercent = clampPercent(
      total > 0 ? (data.ratedMatchCount / total) * 100 : 0,
    );
    footer = {
      label: m.toConfirm,
      value: m.confirmCount(data.ratedMatchCount, total),
      detail: null,
    };
  } else {
    const next = nextDistinctDisplayRung(rating.levelBand);
    if (next == null) {
      ringPercent = 100;
      footer = { label: m.topBand, value: null, detail: null };
    } else {
      ringPercent = percentThroughDisplayBand(
        data.levelValue,
        rating.levelBand,
      );
      footer = {
        label: m.nextBand,
        value: next,
        detail: m.ofTheWay(ringPercent),
      };
    }
  }

  const changeData = data.changeOverLast;
  const change = changeData
    ? (() => {
        const delta = signedChange(changeData.delta, data.face);
        return {
          delta,
          caption: m.lastCount(changeData.matches),
          points: changeData.points,
          spoken: m.changeSpoken(delta, changeData.matches),
        };
      })()
    : null;

  const footerLine = [footer.label, footer.value, footer.detail]
    .filter((part): part is string => part != null)
    .join(" ");
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
    change,
    footer,
    note,
    spoken: m.spoken(
      band,
      number,
      [status, change?.spoken, footerLine]
        .filter((part): part is string => part != null)
        .join(". "),
    ),
  };
}

/**
 * A Group tier row (screen 1a): the fish, the place while fewer than four are
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
      row.provisional || row.place == null
        ? null
        : formatTierPoints(row.points);
    return {
      groupId: row.groupId,
      name: row.name,
      cell,
      caption,
      points,
      spoken: [row.name, caption, points ? all.tier.pointsSpoken(points) : null]
        .filter((part): part is string => part != null)
        .join(", "),
    };
  });
}

/**
 * The Ratings screen (1a football, 1b padel). Football has all three ladders:
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

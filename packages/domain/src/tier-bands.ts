import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { TIER_PROVISIONAL_GAMES } from "./tier-points";

/**
 * A Tier band is a place among a tier Group's ranked members (ADR-0067): the
 * Shark is first, Hamour the next 15% of the rest, Kanaad the next 35%, Safi
 * everyone else. Top band first.
 */
export const TIER_BANDS = ["shark", "hamour", "kanaad", "safi"] as const;

export type TierBand = (typeof TIER_BANDS)[number];

/** Below this many ranked members, rows show place and points, no fish. */
export const TIER_MIN_RANKED = 4;

export const TIER_HAMOUR_SHARE = 0.15;
export const TIER_KANAAD_SHARE = 0.35;

export function isTierBand(value: unknown): value is TierBand {
  return (TIER_BANDS as readonly unknown[]).includes(value);
}

export function tierBandLabel(band: TierBand, locale: Locale) {
  return messagesFor(locale).rating.bands[band];
}

export type TierStanding = {
  userId: string;
  points: number;
  gamesCounted: number;
  /** A Tier adjustment ends a Provisional tier at once. */
  adjusted: boolean;
  joinedAt: Date | string | null;
};

export function tierIsProvisional(member: {
  gamesCounted: number;
  adjusted: boolean;
}) {
  return !member.adjusted && member.gamesCounted < TIER_PROVISIONAL_GAMES;
}

/** How many ranked members each band holds. All zero below the minimum. */
export function tierBandCounts(ranked: number): Record<TierBand, number> {
  if (ranked < TIER_MIN_RANKED) {
    return { shark: 0, hamour: 0, kanaad: 0, safi: 0 };
  }
  const rest = ranked - 1;
  const hamour = Math.round(TIER_HAMOUR_SHARE * rest);
  const kanaad = Math.round(TIER_KANAAD_SHARE * rest);
  return { shark: 1, hamour, kanaad, safi: rest - hamour - kanaad };
}

export type TierTableRow = TierStanding & {
  provisional: boolean;
  /** Games counted towards leaving Provisional, at most five. */
  gamesOfFive: number;
  /** Null while Provisional. */
  place: number | null;
  /** Null while Provisional or while too few members are ranked. */
  band: TierBand | null;
  /** The next band up with anyone in it, and the points to its last place. */
  nextBand: TierBand | null;
  pointsToNextBand: number | null;
};

export type TierTable = {
  /** Ranked members by place, then Provisional members by games counted. */
  rows: TierTableRow[];
  rankedCount: number;
  provisionalCount: number;
  showsBands: boolean;
};

function joinedTime(value: Date | string | null) {
  if (value == null) {
    return Number.POSITIVE_INFINITY;
  }
  const time = (value instanceof Date ? value : new Date(value)).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function byPlace(left: TierStanding, right: TierStanding) {
  return (
    right.points - left.points ||
    right.gamesCounted - left.gamesCounted ||
    joinedTime(left.joinedAt) - joinedTime(right.joinedAt) ||
    left.userId.localeCompare(right.userId)
  );
}

function bandAtPlace(place: number, counts: Record<TierBand, number>) {
  let last = 0;
  for (const band of TIER_BANDS) {
    last += counts[band];
    if (place <= last) {
      return band;
    }
  }
  return null;
}

/**
 * Places, bands and Provisional slots for a tier Group's members. Ranked
 * members are those out of Provisional, ordered by points, then games
 * counted, then who joined first.
 */
export function tierTable(members: readonly TierStanding[]): TierTable {
  const ranked = members
    .filter((member) => !tierIsProvisional(member))
    .sort(byPlace);
  const provisional = members
    .filter((member) => tierIsProvisional(member))
    .sort(
      (left, right) =>
        right.gamesCounted - left.gamesCounted ||
        joinedTime(left.joinedAt) - joinedTime(right.joinedAt) ||
        left.userId.localeCompare(right.userId),
    );
  const counts = tierBandCounts(ranked.length);
  const showsBands = ranked.length >= TIER_MIN_RANKED;
  const bands = ranked.map((_, index) =>
    showsBands ? bandAtPlace(index + 1, counts) : null,
  );
  const lastPointsOfBand = new Map<TierBand, number>();
  ranked.forEach((member, index) => {
    const band = bands[index];
    if (band) {
      lastPointsOfBand.set(band, member.points);
    }
  });

  const rankedRows = ranked.map((member, index): TierTableRow => {
    const band = bands[index] ?? null;
    const above = band
      ? TIER_BANDS.slice(0, TIER_BANDS.indexOf(band))
          .reverse()
          .find((candidate) => lastPointsOfBand.has(candidate))
      : undefined;
    const target = above ? lastPointsOfBand.get(above) : undefined;
    return {
      ...member,
      provisional: false,
      gamesOfFive: Math.min(member.gamesCounted, TIER_PROVISIONAL_GAMES),
      place: index + 1,
      band,
      nextBand: above ?? null,
      pointsToNextBand:
        target === undefined ? null : Math.max(target - member.points, 0),
    };
  });
  const provisionalRows = provisional.map(
    (member): TierTableRow => ({
      ...member,
      provisional: true,
      gamesOfFive: Math.min(member.gamesCounted, TIER_PROVISIONAL_GAMES),
      place: null,
      band: null,
      nextBand: null,
      pointsToNextBand: null,
    }),
  );
  return {
    rows: [...rankedRows, ...provisionalRows],
    rankedCount: ranked.length,
    provisionalCount: provisional.length,
    showsBands,
  };
}

export type TierBandMove = {
  userId: string;
  from: TierBand | null;
  to: TierBand | null;
};

/**
 * The place and band a member would have at `newPoints`, and who moves the
 * other way. An adjustment ends a Provisional tier, so the member is ranked.
 */
export function tierAdjustPreview(
  table: TierTable,
  userId: string,
  newPoints: number,
) {
  const next = tierTable(
    table.rows.map((row) =>
      row.userId === userId
        ? { ...standingOf(row), points: newPoints, adjusted: true }
        : standingOf(row),
    ),
  );
  const before = new Map(table.rows.map((row) => [row.userId, row.band]));
  const self = next.rows.find((row) => row.userId === userId) ?? null;
  const others: TierBandMove[] = next.rows
    .filter(
      (row) =>
        row.userId !== userId && (before.get(row.userId) ?? null) !== row.band,
    )
    .map((row) => ({
      userId: row.userId,
      from: before.get(row.userId) ?? null,
      to: row.band,
    }));
  return {
    place: self?.place ?? null,
    band: self?.band ?? null,
    rankedCount: next.rankedCount,
    others,
    /** The whole Group after the change, for who passes whom. */
    table: next,
  };
}

function standingOf(row: TierTableRow): TierStanding {
  return {
    userId: row.userId,
    points: row.points,
    gamesCounted: row.gamesCounted,
    adjusted: row.adjusted,
    joinedAt: row.joinedAt,
  };
}

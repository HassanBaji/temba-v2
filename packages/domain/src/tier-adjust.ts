import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { GroupMemberTierData } from "./group-data";
import { formatTierPoints } from "./group-members-table";
import type { LevelOverrideReason } from "./level-slider";
import {
  TIER_BANDS,
  tierAdjustPreview,
  tierBandLabel,
  tierHintReference,
  tierTable,
  type TierBand,
  type TierStanding,
  type TierTable,
  type TierTableRow,
} from "./tier-bands";
import {
  TIER_ADJUST_MAX_STEP,
  TIER_POINTS_START,
  TIER_PROVISIONAL_GAMES,
  tierHintFor,
  tierHintOvr,
} from "./tier-points";

/** The longest note a Tier adjustment keeps (ADR-0073). */
export const TIER_ADJUST_NOTE_MAX = 140;

/** The step buttons of the adjust sheet (screen 2d). */
export const TIER_ADJUST_STEPS = [-50, -10, 10, 50] as const;

/** The jumps the adjust sheet offers, when the member can reach them. */
export const TIER_ADJUST_JUMPS = [
  "hamour",
  "safi",
] as const satisfies readonly TierBand[];

/** The five reason chips, in the design's order. */
export const TIER_ADJUST_REASONS = [
  "new_to_group",
  "back_from_injury",
  "plays_above_results",
  "plays_below_results",
  "correcting_a_mistake",
] as const satisfies readonly LevelOverrideReason[];

/** The order the sheet draws the fish in, lowest first. */
const BAND_STRIP: readonly TierBand[] = ["safi", "kanaad", "hamour", "shark"];

const MAX_MOVERS_NAMED = 3;
/** Past this many, the sentence names only the player passed last. */
const MAX_PASSED_NAMED = 2;
const JUMP_ROUNDING = 10;

export type TierAdjustMember = {
  userId: string;
  name: string;
  joinedAt: Date | string | null;
  tier?: GroupMemberTierData | null;
  /** The member's Temba Level as `groups.byId` shows it, such as "3.4". */
  level?: string | null;
  /** A Group Level an Organizer set earlier, which the start hint prefers. */
  groupLevel?: { level: string } | null;
};

/**
 * The Group's standings as an Organizer's `groups.byId` gives them, so the
 * client cuts the same places the server will store.
 */
export function tierStandingsOf(
  members: readonly TierAdjustMember[],
): TierStanding[] {
  return members.flatMap((member) =>
    member.tier
      ? [
          {
            userId: member.userId,
            points: member.tier.points ?? TIER_POINTS_START,
            gamesCounted: member.tier.gamesCounted ?? member.tier.gamesOfFive,
            adjusted: !member.tier.provisional,
            joinedAt: member.joinedAt,
          },
        ]
      : [],
  );
}

function memberOvr(member: TierAdjustMember) {
  return tierHintOvr({
    level: member.level == null ? null : Number(member.level),
    groupLevel:
      member.groupLevel == null ? null : Number(member.groupLevel.level),
  });
}

/**
 * The start hint for a Provisional member (D13): a move the Organizer can
 * pick, never written without them. Null for a ranked member, without a
 * Level to read, or when the hint is where they already are.
 */
function startSuggestion(
  members: readonly TierAdjustMember[],
  self: TierTableRow,
  locale: Locale,
) {
  if (!self.provisional) {
    return null;
  }
  const member = members.find((entry) => entry.userId === self.userId);
  const reference = tierHintReference(
    members.flatMap((entry) =>
      entry.tier
        ? [
            {
              points: entry.tier.points ?? TIER_POINTS_START,
              provisional: entry.tier.provisional,
              ovr: memberOvr(entry),
            },
          ]
        : [],
    ),
  );
  const hint = member ? tierHintFor(memberOvr(member), reference) : null;
  if (hint == null) {
    return null;
  }
  const delta = clampTierAdjustDelta(hint - self.points, self.points);
  if (delta === 0) {
    return null;
  }
  return {
    delta,
    label: messagesFor(locale).rating.adjust.suggested(
      formatTierPoints(self.points + delta),
    ),
  };
}

/** Keeps an adjustment within the step limit and above zero points. */
export function clampTierAdjustDelta(delta: number, currentPoints: number) {
  return Math.max(
    -Math.min(TIER_ADJUST_MAX_STEP, currentPoints),
    Math.min(TIER_ADJUST_MAX_STEP, Math.round(delta)),
  );
}

/** `+62`, `−98`, with a true minus sign. */
export function formatTierDelta(delta: number) {
  if (delta > 0) {
    return `+${formatTierPoints(delta)}`;
  }
  if (delta < 0) {
    return `−${formatTierPoints(-delta)}`;
  }
  return "0";
}

function firstName(name: string) {
  const [first] = name.trim().split(/\s+/);
  if (!first) {
    return name;
  }
  return first;
}

function bandRank(band: TierBand) {
  return TIER_BANDS.indexOf(band);
}

/**
 * The smallest move that lands the member in `target`, on a round ten just
 * past the player they would pass. Null when the band is out of reach.
 */
function jumpDelta(
  table: TierTable,
  self: TierTableRow,
  target: TierBand,
): number | null {
  if (self.band === target) {
    return null;
  }
  const candidates = new Set<number>();
  for (const row of table.rows) {
    if (row.userId === self.userId || row.provisional) {
      continue;
    }
    candidates.add(Math.ceil((row.points + 1) / JUMP_ROUNDING) * JUMP_ROUNDING);
    candidates.add(
      Math.floor((row.points - 1) / JUMP_ROUNDING) * JUMP_ROUNDING,
    );
  }
  let best: number | null = null;
  for (const points of candidates) {
    const delta = points - self.points;
    if (
      delta === 0 ||
      clampTierAdjustDelta(delta, self.points) !== delta ||
      tierAdjustPreview(table, self.userId, points).band !== target
    ) {
      continue;
    }
    if (best === null || Math.abs(delta) < Math.abs(best)) {
      best = delta;
    }
  }
  return best;
}

function joinNames(names: readonly string[], locale: Locale) {
  const copy = messagesFor(locale).rating.adjust.effect;
  if (names.length <= 1) {
    return names[0] ?? "";
  }
  return copy.twoNames(
    names.slice(0, -1).join(copy.nameSeparator),
    names[names.length - 1]!,
  );
}

function effectLine(args: {
  before: TierTable;
  self: TierTableRow;
  preview: ReturnType<typeof tierAdjustPreview>;
  nameOf: (userId: string) => string;
  total: number;
  locale: Locale;
}) {
  const { before, self, preview, nameOf, total, locale } = args;
  const copy = messagesFor(locale).rating.adjust;
  const effect = copy.effect;
  const name = firstName(nameOf(self.userId));
  const after = new Map(preview.table.rows.map((row) => [row.userId, row]));
  const place = preview.place ?? 0;
  const placeOf = copy.placeOf(place, total);
  if (!preview.band) {
    return self.provisional
      ? effect.rankedNoFish(name, placeOf)
      : effect.noFish(placeOf);
  }
  const band = tierBandLabel(preview.band, locale);
  const parts: string[] = [];
  if (self.provisional || self.place == null) {
    parts.push(effect.ranked(name, band, placeOf));
  } else if (self.band === preview.band) {
    parts.push(effect.stays(band, placeOf));
  } else {
    const up = place < self.place;
    const selfBefore = self.place;
    const passed = before.rows
      .flatMap((row) => {
        const next = after.get(row.userId)?.place;
        if (row.userId === self.userId || row.place == null || next == null) {
          return [];
        }
        const crossed = up
          ? row.place < selfBefore && next > place
          : row.place > selfBefore && next < place;
        return crossed ? [{ userId: row.userId, place: next }] : [];
      })
      .sort((left, right) => left.place - right.place);
    if (passed.length > 0) {
      const nearest = up ? passed[0]! : passed[passed.length - 1]!;
      const names = joinNames(
        (passed.length <= MAX_PASSED_NAMED ? passed : [nearest]).map((row) =>
          nameOf(row.userId),
        ),
        locale,
      );
      parts.push(
        up
          ? effect.passes(name, names, band)
          : effect.dropsBelow(name, names, band),
      );
    } else {
      parts.push(
        up ? effect.movesUp(name, band) : effect.movesDown(name, band),
      );
    }
  }

  const movers = preview.others.filter(
    (move): move is typeof move & { to: TierBand } => move.to !== null,
  );
  if (movers.length === 0) {
    parts.push(effect.nobodyElse);
  }
  for (const move of movers.slice(0, MAX_MOVERS_NAMED)) {
    const label = tierBandLabel(move.to, locale);
    const other = nameOf(move.userId);
    parts.push(
      move.from && bandRank(move.to) < bandRank(move.from)
        ? effect.otherUp(other, label)
        : effect.otherBecomes(other, label),
    );
  }
  if (movers.length > MAX_MOVERS_NAMED) {
    parts.push(effect.andMore(movers.length - MAX_MOVERS_NAMED));
  }
  return parts.join(" ");
}

/**
 * The Organizer's adjust sheet (screen 2d): the new points, the place and
 * fish they give, who moves the other way, the reason chips and the save
 * button. `delta` is what the Organizer moved so far; the place is cut by
 * `tierAdjustPreview`, as the server will cut it.
 */
export function tierAdjustSheet(input: {
  members: readonly TierAdjustMember[];
  userId: string;
  delta: number;
  reason: LevelOverrideReason | null;
  groupName: string;
  locale: Locale;
}) {
  const m = messagesFor(input.locale);
  const copy = m.rating.adjust;
  const table = tierTable(tierStandingsOf(input.members));
  const self = table.rows.find((row) => row.userId === input.userId);
  if (!self) {
    return null;
  }
  const nameByUser = new Map(
    input.members.map((member) => [member.userId, member.name]),
  );
  const nameOf = (userId: string) => nameByUser.get(userId) ?? "";
  const name = nameOf(self.userId);
  const total = table.rows.length;
  const delta = clampTierAdjustDelta(input.delta, self.points);
  const points = self.points + delta;
  const preview = tierAdjustPreview(table, self.userId, points);
  const pointsLabel = formatTierPoints(points);

  const standing =
    self.provisional || self.place == null
      ? copy.nowProvisional(self.gamesOfFive, TIER_PROVISIONAL_GAMES)
      : self.band
        ? copy.nowRanked(
            tierBandLabel(self.band, input.locale),
            copy.placeOf(self.place, total),
          )
        : copy.placeOf(self.place, total);
  const shownBand = delta === 0 ? self.band : preview.band;
  const shownPlace = delta === 0 ? self.place : preview.place;
  const deltaLabel = delta === 0 ? copy.noChange : formatTierDelta(delta);

  return {
    title: copy.title,
    subtitle: copy.subtitle(input.groupName),
    name,
    nowLine: copy.now(formatTierPoints(self.points), standing),
    currentPoints: self.points,
    points,
    delta,
    pointsLabel,
    deltaLabel,
    placeLabel: shownPlace == null ? null : m.rating.tier.place(shownPlace),
    band: shownBand,
    bandLabel: shownBand
      ? tierBandLabel(shownBand, input.locale)
      : shownPlace == null
        ? m.rating.provisional
        : copy.noFish,
    bands: BAND_STRIP.map((band) => ({
      band,
      label: tierBandLabel(band, input.locale),
      current: band === shownBand,
    })),
    effect:
      delta === 0
        ? copy.effect.none
        : effectLine({
            before: table,
            self,
            preview,
            nameOf,
            total,
            locale: input.locale,
          }),
    steps: TIER_ADJUST_STEPS.map((step) => {
      const label = formatTierDelta(step);
      return {
        delta: step,
        label,
        accessibilityLabel: copy.step(label),
        disabled: clampTierAdjustDelta(delta + step, self.points) === delta,
      };
    }),
    jumps: TIER_ADJUST_JUMPS.flatMap((band) => {
      const jump = jumpDelta(table, self, band);
      return jump === null
        ? []
        : [
            {
              band,
              label: copy.into(tierBandLabel(band, input.locale)),
              delta: jump,
            },
          ];
    }),
    suggestion: startSuggestion(input.members, self, input.locale),
    why: copy.why(firstName(name)),
    reasons: TIER_ADJUST_REASONS.map((value) => ({
      value,
      label: copy.reasons[value],
      selected: value === input.reason,
    })),
    canSave: delta !== 0 && input.reason !== null,
    saveLabel:
      delta === 0
        ? copy.saveMoveFirst
        : input.reason === null
          ? copy.savePickReason
          : copy.save(formatTierDelta(delta)),
    savedToast: copy.saved(firstName(name)),
  };
}

export type TierAdjustSheet = NonNullable<ReturnType<typeof tierAdjustSheet>>;

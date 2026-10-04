import { formatGameCardDay } from "./format-game-start";
import { formatHomeKickoff } from "./home-countdown";
import { displayLabelFromStoredBand, type LevelBand } from "./level-bands";
import { formatLevelRangeLabel } from "./level-range";
import { formatPricePerPlayerFils } from "./price-per-player";

/**
 * When the Friendly-game join sheet may offer "Join with a partner"
 * (register-with-partner, TEM-207). The partner path takes both Positions
 * on one fully vacant side; a half-full Game must not grow a dead-end.
 *
 * Every input is already on `games.byId` — do not add a server field for this.
 */

/** Game home for this Game. Close and deep-link recovery land here. */
export function friendlyGameHomeHref(gameId: string) {
  return `/dashboard/games/${gameId}`;
}

/** Deep link when the Game no longer offers partner join. */
export const PARTNER_JOIN_UNAVAILABLE_TOAST =
  "This Game is no longer open to join with a partner";

/** In-screen copy when the vacant side fills during Partner registration. */
export const PARTNER_VACANT_SIDE_RACE_MESSAGE =
  "That side was taken while you were registering. Join alone, or pick another partner if a side is still fully open.";

export type FriendlyGamePartnerSides = readonly {
  sideIndex?: number;
  left: unknown;
  right: unknown;
}[];

export type OffersPartnerJoinInput = {
  canRegister: boolean;
  format: string;
  registrationMode: string;
  sides: FriendlyGamePartnerSides;
};

export function hasFullyVacantSide(sides: FriendlyGamePartnerSides): boolean {
  return sides.some((side) => side.left == null && side.right == null);
}

/**
 * After a vacant-side race: stay on Pick a partner when a fully vacant side
 * remains; otherwise leave for Game home instead of dead-ending.
 */
export function partnerVacantSideRaceRecovery(
  sides: FriendlyGamePartnerSides,
): "picker" | "game_home" {
  return hasFullyVacantSide(sides) ? "picker" : "game_home";
}

/** First fully vacant side's `sideIndex`, or `null` when none exist. */
export function firstFullyVacantSideIndex(
  sides: FriendlyGamePartnerSides,
): number | null {
  const side = sides.find((row) => row.left == null && row.right == null);
  return side?.sideIndex ?? null;
}

/**
 * Offer the partner chooser only on an individual Friendly game or Friendly
 * tournament the viewer may register onto, with at least one fully vacant
 * side. Team-only, Americano, full Games, and viewers who cannot register
 * are all false.
 */
export function offersPartnerJoin(input: OffersPartnerJoinInput): boolean {
  return (
    input.canRegister &&
    (input.format === "friendly_game" ||
      input.format === "friendly_tournament") &&
    input.registrationMode === "individual" &&
    hasFullyVacantSide(input.sides)
  );
}

/**
 * Default caller Position for the Keep/Swap toggle (TEM-209). Preference is
 * a default, never a rule. When both have a side and they differ, both are
 * satisfied; otherwise the viewer's Preferred Position wins, then the
 * partner's, then left.
 */
export function seedPartnerCallerPosition(args: {
  viewerPreferred: string | null | undefined;
  partnerPreferred: "left" | "right" | null | undefined;
}): "left" | "right" {
  const viewer =
    args.viewerPreferred === "left" || args.viewerPreferred === "right"
      ? args.viewerPreferred
      : null;
  const partner =
    args.partnerPreferred === "left" || args.partnerPreferred === "right"
      ? args.partnerPreferred
      : null;

  if (viewer && partner && viewer !== partner) {
    return viewer;
  }
  if (viewer) {
    return viewer;
  }
  if (partner) {
    return partner === "left" ? "right" : "left";
  }
  return "left";
}

/**
 * Name of the User seated beside the viewer on the same side, or `null`
 * when the viewer is not seated or sits alone. The booked-with-a-partner
 * hero (TEM-210) keys off this — "seated next to someone", not "registered
 * as a pair".
 */
export function viewerSidePartnerName(args: {
  viewerUserId: string | null | undefined;
  sides: readonly {
    left: { userId: string; name: string } | null;
    right: { userId: string; name: string } | null;
  }[];
}): string | null {
  if (!args.viewerUserId) {
    return null;
  }
  for (const side of args.sides) {
    if (side.left?.userId === args.viewerUserId) {
      return side.right?.name ?? null;
    }
    if (side.right?.userId === args.viewerUserId) {
      return side.left?.name ?? null;
    }
  }
  return null;
}

/** Race: the vacant side filled while the sheet was open. */
export function isPartnerVacantSideRace(error: {
  message: string;
  data?: { code?: string } | null;
}): boolean {
  const code = error.data?.code;
  if (code === "CONFLICT") {
    return true;
  }
  return (
    error.message.includes("No fully vacant side") ||
    error.message.includes("That side already has a User") ||
    error.message.includes("Not enough seats")
  );
}

export type PartnerSuggestionIneligible =
  | "already_on_game"
  | "waitlisted"
  | "level_range";

export type PartnerSuggestionRow = {
  name: string;
  levelBand: LevelBand | null;
  preferredPosition: "left" | "right" | null;
  gamesTogether: number;
  ineligible: PartnerSuggestionIneligible | null;
};

export type PartnerSuggestion = PartnerSuggestionRow & {
  id: string;
  image: string | null;
};

export function partnerIneligibleReason(
  ineligible: PartnerSuggestionIneligible | null,
) {
  if (ineligible === "already_on_game") {
    return "Already in this game";
  }
  if (ineligible === "waitlisted") {
    return "On the waitlist";
  }
  if (ineligible === "level_range") {
    return "Outside this game's level range";
  }
  return null;
}

export function partnerSuggestionMetaLine(row: PartnerSuggestionRow) {
  const ineligible = partnerIneligibleReason(row.ineligible);
  if (ineligible) {
    return ineligible;
  }

  const bits: string[] = [];
  if (row.levelBand) {
    bits.push(displayLabelFromStoredBand(row.levelBand));
  }
  if (row.preferredPosition === "left") {
    bits.push("plays left");
  } else if (row.preferredPosition === "right") {
    bits.push("plays right");
  } else {
    bits.push("plays either side");
  }
  const head = bits.join(", ");
  if (row.gamesTogether > 0) {
    const together =
      row.gamesTogether === 1
        ? "1 game together"
        : `${row.gamesTogether} games together`;
    return `${head}. ${together}`;
  }
  return head;
}

export function partnerSuggestionButtonLabel(row: PartnerSuggestionRow) {
  if (row.ineligible) {
    return `${row.name}. ${partnerSuggestionMetaLine(row)}`;
  }
  return `Select ${row.name}`;
}

export function partnerSeatsChip(vacantSeatCount: number) {
  return vacantSeatCount === 1
    ? "1 seat open"
    : `${vacantSeatCount} seats open`;
}

export function partnerReviewGameLine(args: {
  windowStart?: Date | string | null;
  venueName?: string | null;
}) {
  const start =
    args.windowStart == null
      ? null
      : args.windowStart instanceof Date
        ? args.windowStart
        : new Date(args.windowStart);
  const venue = args.venueName?.trim();
  const kickoff = start ? formatHomeKickoff(start) : null;
  const when =
    start && kickoff
      ? `${formatGameCardDay(start)}, ${kickoff.time}${
          kickoff.meridiem ? ` ${kickoff.meridiem}` : ""
        }`
      : null;
  if (when && venue) {
    return `${when} at ${venue}. Two seats, one for each of you.`;
  }
  if (when) {
    return `${when}. Two seats, one for each of you.`;
  }
  if (venue) {
    return `Two seats at ${venue}, one for each of you.`;
  }
  return "Two seats, one for each of you.";
}

export function partnerPlayerMeta(args: {
  levelBand: LevelBand | null | undefined;
  position: "left" | "right";
}) {
  const seat = args.position === "left" ? "left seat" : "right seat";
  if (args.levelBand) {
    return `${displayLabelFromStoredBand(args.levelBand)}, ${seat}`;
  }
  return seat;
}

export function partnerReviewDetails(args: {
  isOrganizer?: boolean;
  pricePerPlayerFils?: number | null;
  levelMinTenths?: number | null;
  levelMaxTenths?: number | null;
}) {
  const priceLabel = formatPricePerPlayerFils(args.pricePerPlayerFils);
  const levelLabel = formatLevelRangeLabel(
    args.levelMinTenths,
    args.levelMaxTenths,
  );
  const details: { label: string; value: string }[] = [];
  if (args.isOrganizer) {
    details.push({ label: "Organizer", value: "You" });
  }
  if (priceLabel) {
    details.push({ label: "Price per player", value: `${priceLabel} each` });
  }
  details.push({ label: "Counts for rating", value: "Yes, as a pair" });
  if (levelLabel) {
    details.push({ label: "Level", value: `${levelLabel}, you both fit` });
  }
  return details;
}

export type FriendlyGameJoinStep = "chooser" | "seat";

export function friendlyGameJoinOpeningStep(input: {
  offersPartner: boolean;
  hasInitialSeat: boolean;
}): FriendlyGameJoinStep {
  return !input.hasInitialSeat && input.offersPartner ? "chooser" : "seat";
}

export function friendlyGameJoinSheetHeader(input: {
  step: "chooser" | "seat";
  isFull: boolean;
  title: string;
}) {
  if (input.step === "chooser") {
    return {
      title: "How do you want to join?",
      description:
        "Two seats on the same side are open, so you can take one on your own or bring someone and register as a team.",
    };
  }
  return {
    title: input.isFull ? "Game is full" : "Pick your spot",
    description: input.title,
  };
}

export const JOIN_ALONE_COPY = {
  title: "Join alone",
  description: "One seat. Someone else takes the other.",
  note: "You are in straight away",
  accessibleName: "Join alone. One seat. Someone else takes the other.",
} as const;

export const JOIN_WITH_PARTNER_COPY = {
  title: "Join with a partner",
  description: "Both seats. You play as a team.",
  note: "Both seats booked now",
  accessibleName:
    "Join with a partner. Both seats. You play as a team. Both seats are booked now; your partner is in straight away.",
} as const;

export const PARTNER_PICKER_COPY = {
  title: "Pick a partner",
  description: "You register both seats. Your partner is in straight away.",
  footnote: "No seat is taken until you register the team.",
} as const;

export const PARTNER_REVIEW_COPY = {
  title: "Register the team",
  yourTeam: "Your team",
  keepSides: "Keep sides",
  swapSides: "Swap sides",
  register: "Register us as a team",
  footnote: "Both seats are booked straight away. Your partner is in now.",
} as const;

export function partnerContinueLabel(partnerName: string | null) {
  return partnerName ? `Continue with ${partnerName}` : "Continue";
}

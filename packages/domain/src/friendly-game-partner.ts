import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

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

/**
 * Where a Game link lands: Game home, opening Pick a partner when `join` is
 * "partner". Each App maps it to its own route.
 */
export type GameHomeTarget = { gameId: string; join?: "partner" };

/** Game home for this Game. Close and deep-link recovery land here. */
export function friendlyGameHomeTarget(gameId: string): GameHomeTarget {
  return { gameId };
}

/** Deep link when the Game no longer offers partner join. */
export function partnerJoinUnavailableToast(locale: Locale) {
  return messagesFor(locale).game.partner.joinUnavailableToast;
}

/** In-screen copy when the vacant side fills during Partner registration. */
export function partnerVacantSideRaceMessage(locale: Locale) {
  return messagesFor(locale).game.partner.vacantSideRaceMessage;
}

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
  locale: Locale,
) {
  const m = messagesFor(locale).game.partner;
  if (ineligible === "already_on_game") {
    return m.alreadyInGame;
  }
  if (ineligible === "waitlisted") {
    return m.onTheWaitlist;
  }
  if (ineligible === "level_range") {
    return m.outsideLevelRange;
  }
  return null;
}

export function partnerSuggestionMetaLine(
  row: PartnerSuggestionRow,
  locale: Locale,
) {
  const ineligible = partnerIneligibleReason(row.ineligible, locale);
  if (ineligible) {
    return ineligible;
  }

  const messages = messagesFor(locale);
  const m = messages.game.partner;
  const bits: string[] = [];
  if (row.levelBand) {
    bits.push(
      messages.common.isolate(displayLabelFromStoredBand(row.levelBand)),
    );
  }
  if (row.preferredPosition === "left") {
    bits.push(m.playsLeft);
  } else if (row.preferredPosition === "right") {
    bits.push(m.playsRight);
  } else {
    bits.push(m.playsEitherSide);
  }
  const head = bits.join(messages.common.listSeparator);
  if (row.gamesTogether > 0) {
    return m.metaWithHistory(head, m.gamesTogether(row.gamesTogether));
  }
  return head;
}

export function partnerSuggestionButtonLabel(
  row: PartnerSuggestionRow,
  locale: Locale,
) {
  const messages = messagesFor(locale);
  const m = messages.game.partner;
  const name = messages.common.isolate(row.name);
  if (row.ineligible) {
    return m.ineligibleButton(name, partnerSuggestionMetaLine(row, locale));
  }
  return m.select(name);
}

export function partnerSeatsChip(vacantSeatCount: number, locale: Locale) {
  return messagesFor(locale).game.partner.seatsOpen(vacantSeatCount);
}

export function partnerReviewGameLine(args: {
  windowStart?: Date | string | null;
  venueName?: string | null;
  locale: Locale;
}) {
  const messages = messagesFor(args.locale);
  const m = messages.game.partner;
  const start =
    args.windowStart == null
      ? null
      : args.windowStart instanceof Date
        ? args.windowStart
        : new Date(args.windowStart);
  const venueName = args.venueName?.trim();
  const venue = venueName ? messages.common.isolate(venueName) : null;
  const kickoff = start ? formatHomeKickoff(start, args.locale) : null;
  const when =
    start && kickoff
      ? m.whenLine(
          formatGameCardDay(start, args.locale),
          kickoff.time,
          kickoff.meridiem || null,
        )
      : null;
  if (when && venue) {
    return m.reviewLineWhenVenue(when, venue);
  }
  if (when) {
    return m.reviewLineWhen(when);
  }
  if (venue) {
    return m.reviewLineVenue(venue);
  }
  return m.reviewLine;
}

export function partnerPlayerMeta(args: {
  levelBand: LevelBand | null | undefined;
  position: "left" | "right";
  locale: Locale;
}) {
  const messages = messagesFor(args.locale);
  const m = messages.game.partner;
  const seat = args.position === "left" ? m.leftSeat : m.rightSeat;
  if (args.levelBand) {
    return m.levelAndSeat(
      messages.common.isolate(displayLabelFromStoredBand(args.levelBand)),
      seat,
    );
  }
  return seat;
}

export function partnerReviewDetails(args: {
  isOrganizer?: boolean;
  pricePerPlayerFils?: number | null;
  levelMinTenths?: number | null;
  levelMaxTenths?: number | null;
  locale: Locale;
}) {
  const messages = messagesFor(args.locale);
  const m = messages.game.partner;
  const priceLabel = formatPricePerPlayerFils(
    args.pricePerPlayerFils,
    args.locale,
  );
  const levelLabel = formatLevelRangeLabel(
    args.levelMinTenths,
    args.levelMaxTenths,
    args.locale,
  );
  const details: { label: string; value: string }[] = [];
  if (args.isOrganizer) {
    details.push({ label: m.organizer, value: messages.common.you });
  }
  if (priceLabel) {
    details.push({ label: m.pricePerPlayer, value: m.priceEach(priceLabel) });
  }
  details.push({ label: m.countsForRating, value: m.yesAsAPair });
  if (levelLabel) {
    details.push({
      label: messages.common.level,
      value: m.levelFit(levelLabel),
    });
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
  locale: Locale;
}) {
  const m = messagesFor(input.locale).game.joinSheet;
  if (input.step === "chooser") {
    return {
      title: m.howToJoin,
      description: m.howToJoinDescription,
    };
  }
  return {
    title: input.isFull ? m.gameIsFull : m.pickYourSpot,
    description: input.title,
  };
}

export function joinAloneCopy(locale: Locale) {
  return messagesFor(locale).game.joinSheet.joinAlone;
}

export function joinWithPartnerCopy(locale: Locale) {
  return messagesFor(locale).game.joinSheet.joinWithPartner;
}

export function partnerPickerCopy(locale: Locale) {
  return messagesFor(locale).game.joinSheet.partnerPicker;
}

export function partnerReviewCopy(locale: Locale) {
  return messagesFor(locale).game.joinSheet.partnerReview;
}

export function partnerContinueLabel(
  partnerName: string | null,
  locale: Locale,
) {
  const messages = messagesFor(locale);
  return partnerName
    ? messages.game.joinSheet.continueWith(messages.common.isolate(partnerName))
    : messages.common.continue;
}

import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatGameClock } from "./format-game-start";
import { friendlyGameVacantSeatLabel } from "./friendly-game-players";
import { offersPartnerJoin } from "./friendly-game-partner";
import { formatGameSideLabel } from "./game-side-label";
import {
  gameSummaryPrimaryAction,
  showsFriendlyRoster,
  showsGameCardPartnerFooter,
  type GameSummaryCta,
  type GameSummaryCtaInput,
} from "./game-summary-cta";
import { gameOccupancy } from "./game-occupancy";
import { isFootballGame, isRosterRegistrationGame } from "./game-shape";
import { sportGlyph, sportLabel } from "./sport";

export type CardSeatPosition = "left" | "right";

type CardSide = { sideIndex: number; left: unknown; right: unknown };

export function vacantSeats<T extends CardSide>(sides: readonly T[]) {
  const vacant: { sideIndex: number; position: CardSeatPosition }[] = [];
  for (const side of sides) {
    if (side.left == null) {
      vacant.push({ sideIndex: side.sideIndex, position: "left" });
    }
    if (side.right == null) {
      vacant.push({ sideIndex: side.sideIndex, position: "right" });
    }
  }
  return vacant;
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

/**
 * The line under the venue: a custom name, when the Game ends, the court and
 * a city that differs from the venue. The big kickoff already shows the start,
 * so a window label is never repeated here.
 */
export function gameCardSubtitle(
  game: {
    venueName: string | null | undefined;
    location: string | null | undefined;
    customName: string | null | undefined;
    courtName?: string | null;
    windowEnd?: Date | string | null;
  },
  locale: Locale,
) {
  const m = messagesFor(locale).home.comingUp;
  const city = game.location?.trim();
  const parts = [
    game.customName?.trim(),
    game.windowEnd ? m.until(formatGameClock(game.windowEnd, locale)) : null,
    game.courtName?.trim(),
    city && city !== game.venueName ? city : null,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? m.parts(parts) : null;
}

export function sideJoinAccessibleName(
  sideIndex: number,
  position: CardSeatPosition,
  partnerName: string | null,
  locale: Locale,
) {
  const m = messagesFor(locale).game;
  const teamLabel = formatGameSideLabel("friendly_game", sideIndex, locale);
  const positionLabel = position === "left" ? m.players.left : m.players.right;
  if (partnerName) {
    return m.players.joinSeatWith(teamLabel, positionLabel, partnerName);
  }
  return (
    friendlyGameVacantSeatLabel("join", teamLabel, positionLabel, locale) ??
    m.cta.join
  );
}

export function gameCardOpenSpots(game: {
  sides?: readonly CardSide[];
  registeredUserCount?: number;
  playersAllowed?: number | null;
}) {
  const showRoster = Boolean(game.sides && game.sides.length > 0);
  const occupancy = gameOccupancy(
    game.registeredUserCount ?? 0,
    game.playersAllowed,
  );
  return {
    showRoster,
    hasOpenCount: showRoster || occupancy != null,
    openSpots: showRoster
      ? vacantSeats(game.sides ?? []).length
      : (occupancy?.seatsLeft ?? 0),
  };
}

export function gameCardSportTag(
  sport: string | null | undefined,
  locale: Locale,
) {
  const glyph = sportGlyph(sport);
  const label = sportLabel(sport, locale);
  return glyph && label ? { glyph, label } : null;
}

/** "7/10" for a Roster registration Game; null for seat Games, whose card shows seats. */
export function gameCardRosterOccupancy(game: {
  format: string;
  sport?: string | null;
  registeredUserCount: number;
  playersAllowed: number | null | undefined;
}) {
  if (!isRosterRegistrationGame(game)) {
    return null;
  }
  return gameOccupancy(game.registeredUserCount, game.playersAllowed);
}

export type GameCardMetaCell = { value: string; note: string | null };

/** The format cell leads with the round or format and falls back to duration, then Level. */
export function gameCardFormatCell(meta: {
  formatMeta: string | null;
  durationMeta: string | null;
  levelMeta: string | null;
}): GameCardMetaCell | null {
  const { formatMeta, durationMeta, levelMeta } = meta;
  if (formatMeta == null && durationMeta == null && levelMeta == null) {
    return null;
  }
  return {
    value: formatMeta ?? durationMeta ?? levelMeta ?? "",
    note: formatMeta
      ? (durationMeta ?? levelMeta)
      : durationMeta
        ? levelMeta
        : null,
  };
}

type HubCardGame = GameSummaryCtaInput & {
  sides: readonly CardSide[];
  matchId: string | null;
  challenge?: boolean;
};

/**
 * What a My Games card offers: the primary action, the roster it shows,
 * whether it offers Join with a partner, and whether it carries the CHALLENGE
 * marker. A Challenge Game only opens: nobody joins it from a card.
 */
export function hubGameCardPlan<T extends HubCardGame>(
  game: T,
): {
  primaryAction: GameSummaryCta;
  rosterSides: T["sides"] | undefined;
  showPartnerJoin: boolean;
  challenge: boolean;
} {
  const challenge = game.challenge === true;
  const primaryAction = challenge ? "view" : gameSummaryPrimaryAction(game);
  const rosterSides =
    !isFootballGame(game) &&
    (showsFriendlyRoster(game.format, game.registrationMode) || game.matchId)
      ? game.sides
      : undefined;
  const showPartnerJoin =
    !challenge &&
    showsGameCardPartnerFooter(primaryAction, rosterSides) &&
    offersPartnerJoin({
      canRegister: game.canRegister,
      format: game.format,
      registrationMode: game.registrationMode,
      sides: game.sides,
    });
  return { primaryAction, rosterSides, showPartnerJoin, challenge };
}

export type HubWaitlistJoinCall = "register" | "registerSeat";

/** A Roster registration Game joins through `register`; every other Game takes a seat door. */
export function hubWaitlistJoinCall(
  format: string,
  sport?: string | null,
): HubWaitlistJoinCall {
  return isRosterRegistrationGame({ format, sport })
    ? "register"
    : "registerSeat";
}

export function hubRegisterToast(waitlisted: boolean, locale: Locale) {
  const m = messagesFor(locale).game;
  return waitlisted ? m.toast.joinedWaitlist : m.card.registered;
}

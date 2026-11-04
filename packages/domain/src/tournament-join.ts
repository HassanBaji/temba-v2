import { messagesFor } from "@repo/i18n/messages";
import type { Locale } from "@repo/i18n/locale";

import { formatGameCardDay } from "./format-game-start";
import type { FriendlyGameJoinSeat } from "./friendly-game-cta";
import {
  firstFullyVacantSideIndex,
  partnerVacantSideRaceMessage,
} from "./friendly-game-partner";
import { isPreferredPosition } from "./preferred-position";
import { remainingJoinSeatOnSide, defaultJoinSeat } from "./preferred-seat";
import { tournamentSeatsTakenSrLabel } from "./tournament-home";
import { isDrawnTournament } from "./tournament-rounds";

export function gameLeaveSpotConfirmCopy(locale: Locale) {
  return messagesFor(locale).tournament.join.leaveSpotConfirm;
}

export function partnerRequiredUnseatPartnerConfirmCopy(locale: Locale) {
  return messagesFor(locale).tournament.join.partnerUnseatedConfirm;
}

export type TournamentJoinSide = {
  sideIndex: number;
  left: unknown;
  right: unknown;
};

export type TournamentJoinSeatAvailability = {
  leftTaken: boolean;
  rightTaken: boolean;
};

/**
 * The Take-a-seat sheet is the drawn tournament branch of the shared join
 * drawer. Individual Friendly games stay on two sides; a side-count fallback
 * keeps the existing tournament list when `poolCount` is not passed in.
 */
export function isTournamentJoinSheet(
  format: string | undefined,
  poolCount: number | null | undefined,
  tournamentShape: string | null | undefined,
  sideCount: number,
) {
  return (
    isDrawnTournament(format ?? "", poolCount, tournamentShape) || sideCount > 2
  );
}

export function tournamentJoinHeaderLine(args: {
  name: string;
  roundCount: number | null;
  firstRoundDay: string | null;
  locale: Locale;
}): string {
  const m = messagesFor(args.locale).tournament;
  const name = args.name.trim();
  const rounds =
    args.roundCount == null ? null : m.sizing.roundCount(args.roundCount);
  let lead = name;
  if (name && rounds && args.firstRoundDay) {
    lead = m.join.nameRoundsFrom(name, rounds, args.firstRoundDay);
  } else if (name && rounds) {
    lead = m.join.nameRounds(name, rounds);
  } else if (!name && rounds && args.firstRoundDay) {
    lead = m.join.roundsFrom(rounds, args.firstRoundDay);
  } else if (!name && rounds) {
    lead = rounds;
  }
  if (!lead) {
    return m.join.introSuffix;
  }
  return m.join.headerWithLead(lead);
}

export function tournamentJoinFirstRoundDay(
  start: Date | string | null | undefined,
  locale: Locale,
): string | null {
  if (!start) {
    return null;
  }
  return formatGameCardDay(start, locale);
}

export function tournamentSitWithCountLine(
  halfOpen: number,
  locale: Locale,
): string {
  if (halfOpen <= 0) {
    return "";
  }
  return messagesFor(locale).tournament.join.sitWithCount(halfOpen);
}

export function tournamentJoinOccupantSubline(args: {
  occupantPosition: "left" | "right";
  levelLabel: string | null;
  openPosition: "left" | "right";
  locale: Locale;
}): string {
  const m = messagesFor(args.locale).tournament;
  const plays =
    args.occupantPosition === "left" ? m.join.playsLeft : m.join.playsRight;
  const open =
    args.openPosition === "left" ? m.home.leftSeatOpen : m.home.rightSeatOpen;
  return [plays, args.levelLabel, open].filter(Boolean).join(m.listSeparator);
}

export function tournamentJoinTakeSeatLabel(
  position: "left" | "right",
  locale: Locale,
): string {
  const m = messagesFor(locale).tournament.join;
  return position === "left" ? m.takeTheLeftSeat : m.takeTheRightSeat;
}

export function tournamentJoinSeatsTakenLine(
  seatsTaken: number,
  seatTotal: number,
  locale: Locale,
): string {
  return tournamentSeatsTakenSrLabel(seatsTaken, seatTotal, locale);
}

export function tournamentYourSeatAvailability(
  side:
    | {
        left: unknown;
        right: unknown;
      }
    | null
    | undefined,
): TournamentJoinSeatAvailability {
  if (!side) {
    return { leftTaken: true, rightTaken: true };
  }
  return {
    leftTaken: side.left != null,
    rightTaken: side.right != null,
  };
}

export function isFullyVacantJoinSide(side: { left: unknown; right: unknown }) {
  return side.left == null && side.right == null;
}

export type TournamentJoinSheetOpeningStep = "chooser" | "seat" | "partner";

export function tournamentJoinSheetOpeningStep(args: {
  offersPartner: boolean;
  hasInitialSeat: boolean;
  partnerRequired?: boolean;
}): TournamentJoinSheetOpeningStep {
  if (args.partnerRequired) {
    return "partner";
  }
  if (args.hasInitialSeat) {
    return "seat";
  }
  return args.offersPartner ? "chooser" : "seat";
}

export function tournamentPartnerVacantSideRaceMessage(
  partnerRequired: boolean,
  locale: Locale,
) {
  return partnerRequired
    ? messagesFor(locale).tournament.join.partnerVacantSideRace
    : partnerVacantSideRaceMessage(locale);
}

export function tournamentLeaveOrKickConfirmCopy(args: {
  partnerRequired: boolean;
  drawPosted: boolean;
  locale: Locale;
}) {
  const m = messagesFor(args.locale).tournament.join;
  if (args.partnerRequired && !args.drawPosted) {
    return m.partnerUnseatedConfirm;
  }
  return m.leaveSpotConfirm;
}

export function tournamentShowsTakeSeat(args: {
  canJoin: boolean;
  seated: boolean;
  partnerRequired: boolean;
}) {
  return args.canJoin && !args.seated && !args.partnerRequired;
}

export function tournamentShowsWaitlistCta(args: {
  canWaitlist: boolean;
  partnerRequired: boolean;
}) {
  return args.canWaitlist && !args.partnerRequired;
}

export function tournamentPartnerInviteLandingHref(gameId: string) {
  return `/dashboard/games/${gameId}?join=partner`;
}

export function tournamentInviteLandingOpensPartnerSheet(
  joinQuery: string | null | undefined,
) {
  return joinQuery === "partner";
}

export function tournamentInvitePreviewNeedsSeatPick(args: {
  isIndividualSeatGame: boolean;
  blockedByLevelRange: boolean;
  partnerRequired: boolean;
}) {
  return (
    args.isIndividualSeatGame &&
    !args.blockedByLevelRange &&
    !args.partnerRequired
  );
}

export function tournamentStartOwnSeat(
  sides: readonly TournamentJoinSide[],
  preferredPosition: string | null | undefined,
  current: FriendlyGameJoinSeat | null,
): FriendlyGameJoinSeat | null {
  const sideIndex = firstFullyVacantSideIndex(sides);
  if (sideIndex == null) {
    return null;
  }
  const preferred =
    isPreferredPosition(preferredPosition) && preferredPosition !== "either"
      ? preferredPosition
      : null;
  const position = preferred ?? current?.position ?? "left";
  return { sideIndex, position };
}

export function tournamentJoinResolvedSeat(
  sides: readonly TournamentJoinSide[],
  seat: FriendlyGameJoinSeat | null,
): FriendlyGameJoinSeat | null {
  if (!seat) {
    return null;
  }
  const side = sides.find((row) => row.sideIndex === seat.sideIndex);
  if (!side) {
    return null;
  }
  if (side[seat.position] == null) {
    return seat;
  }
  return remainingJoinSeatOnSide(side);
}

export function tournamentJoinOpeningSeat(
  sides: readonly TournamentJoinSide[],
  preferredPosition: string | null | undefined,
  initialSeat: FriendlyGameJoinSeat | null,
): FriendlyGameJoinSeat | null {
  const raw =
    initialSeat ??
    defaultJoinSeat(sides, preferredPosition) ??
    tournamentStartOwnSeat(sides, preferredPosition, null);
  return tournamentJoinResolvedSeat(sides, raw);
}

export function tournamentJoinSeatExplanation(args: {
  occupantName: string | null;
  occupiedPosition: "left" | "right" | null;
  freePosition: "left" | "right";
  roundCount: number | null;
  locale: Locale;
}): string {
  const m = messagesFor(args.locale).tournament;
  const occupant = firstName(args.occupantName);
  if (occupant && args.occupiedPosition) {
    return m.join.seatExplanationOccupied(
      occupant,
      m.position[`${args.occupiedPosition}Lower`],
      m.position[`${args.freePosition}Lower`],
      args.roundCount,
    );
  }
  return m.join.seatExplanationOpen(args.roundCount);
}

export function tournamentJoinDetailRows(args: {
  roundDates: readonly string[];
  roundCount: number | null;
  priceLabel: string | null;
  locale: Locale;
}): { label: string; value: string }[] {
  const m = messagesFor(args.locale);
  const rows: { label: string; value: string }[] = [];
  const roundsValue = tournamentJoinRoundsValue(
    args.roundDates,
    args.roundCount,
    args.locale,
  );
  if (roundsValue) {
    rows.push({ label: m.tournament.join.roundsRow, value: roundsValue });
  }
  if (args.priceLabel) {
    rows.push({
      label: m.tournament.home.priceRow,
      value:
        args.priceLabel === m.createGame.price.free
          ? args.priceLabel
          : m.tournament.join.pricePerPlayerValue(args.priceLabel),
    });
  }
  rows.push({
    label: m.tournament.home.countsForRating,
    value: m.common.yes,
  });
  rows.push({
    label: m.tournament.join.drawRow,
    value: m.tournament.join.drawRandom,
  });
  return rows;
}

export function tournamentJoinRoundsValue(
  roundDates: readonly string[],
  roundCount: number | null,
  locale: Locale,
): string | null {
  const m = messagesFor(locale).tournament;
  if (roundDates.length > 0) {
    return roundDates.join(m.listSeparator);
  }
  return roundCount == null ? null : m.sizing.roundCount(roundCount);
}

function firstName(name: string | null): string | null {
  const token = name?.trim().split(/\s+/)[0];
  return token && token.length > 0 ? token : null;
}

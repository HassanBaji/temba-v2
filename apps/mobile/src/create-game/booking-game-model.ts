import {
  createFlowSeatsLabel,
  splitCostAcrossPlayers,
} from "@repo/domain/create-game-flow";
import { courtFace } from "@repo/domain/court-sport-copy";
import type { CreateGameDraft } from "@repo/domain/create-game-draft";
import { formatGameClock } from "@repo/domain/format-game-start";
import { UNRATED_LABEL } from "@repo/domain/game-rating-impact";
import {
  footballPlayersAllowedBounds,
  isFootballSideSize,
} from "@repo/domain/game-shape";
import {
  LEVEL_RANGE_INVERTED_MESSAGE,
  parseLevelBandSelectTenths,
} from "@repo/domain/level-range";
import {
  filsToMajorInput,
  parseOptionalPricePerPlayerFils,
} from "@repo/domain/price-per-player";
import { sportOrDefault, type Sport } from "@repo/domain/sport";

import { relativeDay } from "../booking/booking-model";
import type { StepHeaderText } from "./create-header";
import type { FieldErrors } from "./create-model";
import type { ReviewRow } from "./review-card";

const BOOKING_GAME_PLAYERS = 4;

export type BookingGameSource = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  priceFils: number;
  venue: { name: string };
  court: { name: string; sport?: string | null };
};

export function bookingGameHeader(
  booking: BookingGameSource,
  now: Date,
): StepHeaderText {
  return {
    title: ["New game"],
    subtitle:
      "Where and when come from the booking. Only the rest is yours to set.",
    context: {
      icon: "lock",
      parts: [
        `${relativeDay(booking.startsAt, now)} ${formatGameClock(booking.startsAt)}`,
        booking.venue.name,
        booking.court.name,
      ],
    },
  };
}

export function bookingGameSport(booking: BookingGameSource): Sport {
  return sportOrDefault(booking.court.sport);
}

/** The court price shared across the Game's players, rounded up so they cover it. */
export function splitCourtCost(
  priceFils: number,
  players: number = BOOKING_GAME_PLAYERS,
): string {
  return filsToMajorInput(splitCostAcrossPlayers(priceFils, players));
}

export type BookingGameGroup = { name: string; rated: boolean };

export function bookingGameReviewRows(
  booking: BookingGameSource,
  size: { sideSize: number; playersAllowed: number } = {
    sideSize: 0,
    playersAllowed: BOOKING_GAME_PLAYERS,
  },
  group: BookingGameGroup | null = null,
): ReviewRow[] {
  const sport = bookingGameSport(booking);
  return [
    {
      label: courtFace(sport) === "pitch" ? "Pitch" : "Court",
      value: `${booking.venue.name}, ${booking.court.name}`,
    },
    {
      label: "Time",
      value: `${formatGameClock(booking.startsAt)} to ${formatGameClock(booking.endsAt)}`,
    },
    {
      label: sport === "football" ? "Size" : "Seats",
      value: createFlowSeatsLabel(sport, size),
    },
    ...(group ? [{ label: "Group", value: group.name }] : []),
    {
      label: "Who can join",
      value: group
        ? "Group members and people you invite"
        : "People you invite",
    },
    { label: "Rating", value: group?.rated ? "Rated" : UNRATED_LABEL },
  ];
}

export type BookingGameRequest =
  | {
      ok: true;
      input: {
        bookingId: string;
        groupId?: string;
        pricePerPlayerFils?: number;
        levelMinTenths?: number;
        levelMaxTenths?: number;
        sideSize?: number;
        playersAllowed?: number;
      };
    }
  | { ok: false; errors: FieldErrors };

export function bookingGameRequest(
  bookingId: string,
  draft: Pick<CreateGameDraft, "pricePerPlayer" | "levelMin" | "levelMax"> &
    Partial<Pick<CreateGameDraft, "groupId" | "sideSize" | "playersAllowed">>,
  sport: Sport = "padel",
): BookingGameRequest {
  const price = parseOptionalPricePerPlayerFils(draft.pricePerPlayer);
  if (!price.ok) {
    return { ok: false, errors: { pricePerPlayerFils: price.message } };
  }
  const group = draft.groupId ? { groupId: draft.groupId } : {};
  if (sport === "football") {
    const { sideSize, playersAllowed } = draft;
    if (!isFootballSideSize(sideSize)) {
      return { ok: false, errors: { sideSize: "Pick a side size" } };
    }
    const bounds = footballPlayersAllowedBounds(sideSize);
    if (
      playersAllowed == null ||
      !Number.isInteger(playersAllowed) ||
      playersAllowed < bounds.min ||
      playersAllowed > bounds.max
    ) {
      return {
        ok: false,
        errors: {
          playersAllowed: `Players allowed must be between ${bounds.min} and ${bounds.max}`,
        },
      };
    }
    return {
      ok: true,
      input: {
        bookingId,
        ...group,
        sideSize,
        playersAllowed,
        ...(price.fils !== null ? { pricePerPlayerFils: price.fils } : {}),
      },
    };
  }
  const levelMinTenths = parseLevelBandSelectTenths(draft.levelMin, "min");
  const levelMaxTenths = parseLevelBandSelectTenths(draft.levelMax, "max");
  if (
    levelMinTenths != null &&
    levelMaxTenths != null &&
    levelMinTenths > levelMaxTenths
  ) {
    return {
      ok: false,
      errors: { levelMinTenths: LEVEL_RANGE_INVERTED_MESSAGE },
    };
  }
  return {
    ok: true,
    input: {
      bookingId,
      ...group,
      ...(price.fils !== null ? { pricePerPlayerFils: price.fils } : {}),
      ...(levelMinTenths !== null ? { levelMinTenths } : {}),
      ...(levelMaxTenths !== null ? { levelMaxTenths } : {}),
    },
  };
}

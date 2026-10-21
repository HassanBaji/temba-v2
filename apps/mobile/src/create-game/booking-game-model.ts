import { CREATE_FLOW_OPEN_SEATS_LABEL } from "@repo/domain/create-game-flow";
import type { CreateGameDraft } from "@repo/domain/create-game-draft";
import { formatGameClock } from "@repo/domain/format-game-start";
import { UNRATED_LABEL } from "@repo/domain/game-rating-impact";
import {
  LEVEL_RANGE_INVERTED_MESSAGE,
  parseLevelBandSelectTenths,
} from "@repo/domain/level-range";
import {
  filsToMajorInput,
  parseOptionalPricePerPlayerFils,
} from "@repo/domain/price-per-player";

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
  court: { name: string };
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

/** The court price shared by four seats, rounded up so the seats cover it. */
export function splitCourtCost(priceFils: number): string {
  return filsToMajorInput(Math.ceil(priceFils / BOOKING_GAME_PLAYERS));
}

export function bookingGameReviewRows(booking: BookingGameSource): ReviewRow[] {
  return [
    {
      label: "Court",
      value: `${booking.venue.name}, ${booking.court.name}`,
    },
    {
      label: "Time",
      value: `${formatGameClock(booking.startsAt)} to ${formatGameClock(booking.endsAt)}`,
    },
    { label: "Seats", value: CREATE_FLOW_OPEN_SEATS_LABEL },
    { label: "Who can join", value: "People you invite" },
    { label: "Rating", value: UNRATED_LABEL },
  ];
}

export type BookingGameRequest =
  | {
      ok: true;
      input: {
        bookingId: string;
        pricePerPlayerFils?: number;
        levelMinTenths?: number;
        levelMaxTenths?: number;
      };
    }
  | { ok: false; errors: FieldErrors };

export function bookingGameRequest(
  bookingId: string,
  draft: Pick<CreateGameDraft, "pricePerPlayer" | "levelMin" | "levelMax">,
): BookingGameRequest {
  const price = parseOptionalPricePerPlayerFils(draft.pricePerPlayer);
  if (!price.ok) {
    return { ok: false, errors: { pricePerPlayerFils: price.message } };
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
      ...(price.fils !== null ? { pricePerPlayerFils: price.fils } : {}),
      ...(levelMinTenths !== null ? { levelMinTenths } : {}),
      ...(levelMaxTenths !== null ? { levelMaxTenths } : {}),
    },
  };
}

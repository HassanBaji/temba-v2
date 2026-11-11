import {
  createFlowSeatsLabel,
  splitCostAcrossPlayers,
} from "@repo/domain/create-game-flow";
import { courtFace } from "@repo/domain/court-sport-copy";
import type { CreateGameDraft } from "@repo/domain/create-game-draft";
import { formatGameClock } from "@repo/domain/format-game-start";
import {
  gameRatingScopeLabel,
  type GameRatingScope,
} from "@repo/domain/game-rating-scope";
import {
  footballPlayersAllowedBounds,
  isFootballSideSize,
} from "@repo/domain/game-shape";
import {
  levelRangeInvertedMessage,
  parseLevelBandSelectTenths,
} from "@repo/domain/level-range";
import {
  filsToMajorInput,
  parseOptionalPricePerPlayerFils,
} from "@repo/domain/price-per-player";
import { sportOrDefault, type Sport } from "@repo/domain/sport";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

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
  locale: Locale,
): StepHeaderText {
  const m = messagesFor(locale).mobileCreateGame.bookingGame;
  return {
    title: [m.title],
    subtitle: m.subtitle,
    context: {
      icon: "lock",
      parts: [
        m.dayAndClock(
          relativeDay(booking.startsAt, now, locale),
          formatGameClock(booking.startsAt, locale),
        ),
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

export type BookingGameGroup = { name: string; ratingScope: GameRatingScope };

export function bookingGameReviewRows(
  booking: BookingGameSource,
  locale: Locale,
  size: { sideSize: number; playersAllowed: number } = {
    sideSize: 0,
    playersAllowed: BOOKING_GAME_PLAYERS,
  },
  group: BookingGameGroup | null = null,
): ReviewRow[] {
  const messages = messagesFor(locale);
  const m = messages.mobileCreateGame;
  const sport = bookingGameSport(booking);
  return [
    {
      label:
        courtFace(sport) === "pitch" ? m.court.pitchTitle : m.court.courtTitle,
      value: m.review.venueAndCourt(booking.venue.name, booking.court.name),
    },
    {
      label: m.review.time,
      value: m.timeRange(
        formatGameClock(booking.startsAt, locale),
        formatGameClock(booking.endsAt, locale),
      ),
    },
    {
      label: sport === "football" ? m.review.size : m.review.seats,
      value: createFlowSeatsLabel(sport, size, locale),
    },
    ...(group ? [{ label: m.review.group, value: group.name }] : []),
    {
      label: m.review.whoCanJoin,
      value: group ? m.review.groupMembersAndInvited : m.review.invitedOnly,
    },
    {
      label: m.review.rating,
      value: gameRatingScopeLabel(
        group?.ratingScope ?? "unrated",
        locale,
        sport,
      ),
    },
  ];
}

export type BookingGameRequest =
  | {
      ok: true;
      input: {
        bookingId: string;
        groupId?: string;
        rated?: false;
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
    Partial<
      Pick<CreateGameDraft, "groupId" | "sideSize" | "playersAllowed" | "rated">
    >,
  locale: Locale,
  sport: Sport = "padel",
): BookingGameRequest {
  const m = messagesFor(locale).createGame.validation;
  const price = parseOptionalPricePerPlayerFils(draft.pricePerPlayer, locale);
  if (!price.ok) {
    return { ok: false, errors: { pricePerPlayerFils: price.message } };
  }
  const group = draft.groupId ? { groupId: draft.groupId } : {};
  const unrated =
    draft.groupId && draft.rated === false ? { rated: false as const } : {};
  if (sport === "football") {
    const { sideSize, playersAllowed } = draft;
    if (!isFootballSideSize(sideSize)) {
      return { ok: false, errors: { sideSize: m.pickSideSize } };
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
          playersAllowed: m.playersAllowedBetween(bounds.min, bounds.max),
        },
      };
    }
    return {
      ok: true,
      input: {
        bookingId,
        ...group,
        ...unrated,
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
      errors: { levelMinTenths: levelRangeInvertedMessage(locale) },
    };
  }
  return {
    ok: true,
    input: {
      bookingId,
      ...group,
      ...unrated,
      ...(price.fils !== null ? { pricePerPlayerFils: price.fils } : {}),
      ...(levelMinTenths !== null ? { levelMinTenths } : {}),
      ...(levelMaxTenths !== null ? { levelMaxTenths } : {}),
    },
  };
}

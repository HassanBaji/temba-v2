import { formatGameClock } from "@repo/domain/format-game-start";
import {
  formatHomeCountdown,
  formatHomeKickoff,
} from "@repo/domain/home-countdown";
import {
  gameCardView,
  upNextCardDay,
  upNextCardUntil,
  type CardAction,
  type UpNextCardView,
} from "@repo/domain/home-up-next-card";
import { sportLabel } from "@repo/domain/sport";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { minutesBetween } from "../booking/booking-model";
import { nextBookingAction } from "../booking/my-bookings-model";
import type { HomeNavTarget } from "./home-target";
import type { UpNextBooking, UpNextItem } from "./up-next-model";

/** A card action on mobile can also share a Booking or open directions. */
export type MobileCardTarget =
  | HomeNavTarget
  | { kind: "directions" }
  | { kind: "share-booking" };

export type MobileCardView = UpNextCardView<MobileCardTarget>;

type Plan = Pick<MobileCardView, "step" | "secondary" | "primary">;
type MobileAction = CardAction<MobileCardTarget>;

function bookingPlan(booking: UpNextBooking, locale: Locale): Plan {
  const m = messagesFor(locale);
  const card = m.home.upNextCard;
  const share: MobileAction = {
    label: m.mobileHome.upNext.invite,
    icon: "invite",
    target: { kind: "share-booking" },
  };
  switch (nextBookingAction(booking)) {
    case "finish_payment":
      return {
        step: {
          icon: "pay",
          title: card.step.payCourt,
          body: card.step.payCourtBody,
        },
        secondary: share,
        primary: {
          label: m.mobileBooking.finishPayment,
          icon: null,
          target: { kind: "booking-payment", bookingId: booking.id },
        },
      };
    case "make_game":
      return {
        step: {
          icon: "teams",
          title: card.step.makeGame,
          body: card.step.makeGameBody,
        },
        secondary: share,
        primary: {
          label: m.mobileBooking.cards.makeItAGame,
          icon: null,
          target: { kind: "booking-game", bookingId: booking.id },
        },
      };
    case "open_game":
      if (booking.gameId) {
        return {
          step: {
            icon: "court",
            title: card.step.gameSet,
            body: card.step.gameSetBody,
          },
          secondary: share,
          primary: {
            label: m.mobileBooking.openGame,
            icon: null,
            target: { kind: "game", gameId: booking.gameId },
          },
        };
      }
      break;
    default:
      break;
  }
  return {
    step: {
      icon: "court",
      title: card.step.courtBooked,
      body: card.step.courtBookedBody,
    },
    secondary: {
      label: m.home.upNextCard.action.details,
      icon: null,
      target: { kind: "booking", bookingId: booking.id },
    },
    primary: share,
  };
}

export function bookingCardView(
  item: Extract<UpNextItem, { kind: "booking" }>,
  now: Date,
  locale: Locale,
): MobileCardView {
  const m = messagesFor(locale);
  const { booking } = item;
  const startsAt = new Date(booking.startsAt);
  const endsAt = new Date(booking.endsAt);
  const kickoff = formatHomeKickoff(startsAt, locale);
  const day = upNextCardDay(startsAt, locale);
  const place = m.home.comingUp.parts([booking.venue.name, booking.court.name]);
  return {
    key: item.key,
    sport: item.sport,
    sportName: sportLabel(item.sport, locale) ?? "",
    title: m.mobileHome.upNext.kind.booking,
    countdown: formatHomeCountdown(startsAt, now, locale),
    dateLine: day,
    kickoff: { time: kickoff.time, meridiem: kickoff.meridiem },
    until: upNextCardUntil(endsAt, locale),
    place,
    who: {
      kind: "line",
      header: m.mobileHome.upNext.bookingDetail(
        booking.court.name,
        minutesBetween(startsAt, endsAt),
      ),
      scope: null,
    },
    ...bookingPlan(booking, locale),
    open: { kind: "booking", bookingId: booking.id },
    spoken: m.mobileHome.upNext.bookingHeroSpoken(
      day,
      formatGameClock(startsAt, locale),
      booking.court.name,
      booking.venue.name,
    ),
  };
}

export function upNextCardView(
  item: UpNextItem,
  now: Date,
  locale: Locale,
): MobileCardView {
  return item.kind === "game"
    ? gameCardView(item, now, locale)
    : bookingCardView(item, now, locale);
}

import { formatBookingPriceFils } from "@repo/domain/price-per-player";
import { zonedParts } from "@repo/domain/product-timezone";

import type { HoursWindow } from "~/components/hours/opening-hours-model";
import { courtCountLabel as courtCountLabelFor } from "@repo/domain/court-sport-copy";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

/**
 * The labels the mobile App's Venue card and Venue screen show
 * (apps/mobile/src/booking/venues-model.ts), rebuilt from the console's data.
 */

function appClock(minutes: number, locale: Locale): string {
  const m = messagesFor(locale).mobileBooking;
  const ofDay = ((minutes % 1440) + 1440) % 1440;
  if (ofDay === 0) {
    return m.midnight;
  }
  const hour = Math.floor(ofDay / 60);
  const minute = ofDay % 60;
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? m.am : m.pm;
  return m.wallClock(
    minute === 0
      ? String(hour12)
      : `${hour12}:${String(minute).padStart(2, "0")}`,
    suffix,
  );
}

export function openToLabel(
  windows: readonly HoursWindow[],
  locale: Locale,
): string {
  const m = messagesFor(locale).mobileBooking;
  if (windows.length === 0) {
    return m.closedToday;
  }
  const closes = Math.max(...windows.map((window) => window.closesAtMinutes));
  return m.openTo(appClock(closes, locale));
}

export function courtCountLabel(count: number, locale: Locale): string {
  return courtCountLabelFor(count, "padel", locale);
}

export function todayWindows(
  openingHours: readonly (HoursWindow & { weekday: number })[],
  now: Date,
): HoursWindow[] {
  const { year, month, day } = zonedParts(now);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return openingHours.filter((window) => window.weekday === weekday);
}

/** "from 8.000 BD" off the cheapest Pricing rule, or null while the Venue has none. */
export function fromPriceLabel(
  pricingRules: readonly { hourlyRateFils: number }[],
  locale: Locale,
): string | null {
  if (pricingRules.length === 0) {
    return null;
  }
  return formatBookingPriceFils(
    Math.min(...pricingRules.map((rule) => rule.hourlyRateFils)),
    locale,
  );
}

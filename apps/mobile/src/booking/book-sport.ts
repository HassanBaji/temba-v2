import { DEFAULT_SPORT, isSport, type Sport } from "@repo/domain/sport";
import { courtFace } from "@repo/domain/court-sport-copy";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export const BOOK_SPORT_STORAGE_KEY = "temba.book.sport";

export type BookSportStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

export async function readBookSport(storage: BookSportStorage): Promise<Sport> {
  try {
    const stored = await storage.getItem(BOOK_SPORT_STORAGE_KEY);
    return isSport(stored) ? stored : DEFAULT_SPORT;
  } catch {
    return DEFAULT_SPORT;
  }
}

export async function writeBookSport(
  storage: BookSportStorage,
  sport: Sport,
): Promise<void> {
  try {
    await storage.setItem(BOOK_SPORT_STORAGE_KEY, sport);
  } catch {
    // The choice is a convenience; the screen works without storage.
  }
}

/** Padel is the default, so only football travels in the route. */
export function sportQuery(sport: Sport): string {
  return sport === DEFAULT_SPORT ? "" : `sport=${sport}`;
}

export function sportFromParam(value: string | string[] | undefined): Sport {
  const single = Array.isArray(value) ? value[0] : value;
  return isSport(single) ? single : DEFAULT_SPORT;
}

export function bookTitle(sport: Sport, locale: Locale): string {
  return messagesFor(locale).mobileBooking.bookTitle[courtFace(sport)];
}

export function courtStepTitle(sport: Sport, locale: Locale): string {
  return messagesFor(locale).mobileBooking.courtStep[courtFace(sport)];
}

export function courtNounTitle(sport: Sport, locale: Locale): string {
  return messagesFor(locale).mobileBooking.courtNoun[courtFace(sport)];
}

export function courtCoachCopy(sport: Sport, locale: Locale): string {
  return messagesFor(locale).mobileBooking.coach[courtFace(sport)];
}

export function bookingGameBlurb(
  sport: string | null | undefined,
  locale: Locale,
) {
  const m = messagesFor(locale).mobileBooking.gameBlurb;
  return sport === "football" ? m.football : m.padel;
}

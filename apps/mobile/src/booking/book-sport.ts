import { DEFAULT_SPORT, isSport, type Sport } from "@repo/domain/sport";
import { courtFace } from "@repo/domain/court-sport-copy";

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

export function bookTitle(sport: Sport): string {
  return `Book a ${courtFace(sport)}`;
}

export function courtStepTitle(sport: Sport): string {
  return sport === "football" ? `Pick a ${courtFace(sport)}` : "Court";
}

export function courtNounTitle(sport: Sport): string {
  return sport === "football" ? "Pitch" : "Court";
}

export function courtPlural(sport: Sport): string {
  return sport === "football" ? "pitches" : "courts";
}

export function courtCoachCopy(sport: Sport): string {
  return `Pick a start time to see which ${courtPlural(sport)} are free.`;
}

export function bookingGameBlurb(sport: string | null | undefined) {
  return sport === "football"
    ? "Turn the booking into a game and Temba handles the roster and invites."
    : "Turn the booking into a game and Temba handles seats, invites and the score.";
}

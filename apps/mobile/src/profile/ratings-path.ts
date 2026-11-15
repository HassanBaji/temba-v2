import type { Sport } from "@repo/domain/sport";

export function ratingsPath(sport: Sport) {
  return `/profile/ratings?sport=${sport}`;
}

export function ratingHistoryPath(sport: Sport) {
  return `/profile/rating-history?sport=${sport}`;
}

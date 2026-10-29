import type { SportFilter } from "./football-hub";
import { groupGamePlayersNeeded } from "./group-empty-states";
import { sportLabel } from "./sport";

export const GAMES_HUB_EMPTY_TITLE = "No Games yet";

export const GAMES_HISTORY_EMPTY_TITLE = "No Match history yet";

export const GAMES_HISTORY_EMPTY_COPY =
  "Completed Games you played in show up here.";

/** The Played placeholder draws this many not-played result marks. */
export const GAMES_HISTORY_PREVIEW_MARKS = 5;

export const GAMES_HISTORY_PREVIEW_FIGURES = ["Played", "Won", "Lost"] as const;

/** Seats the Upcoming placeholder draws: a padel Match unless the filter is football. */
export function gamesHubEmptySeats(filter: SportFilter) {
  return groupGamePlayersNeeded(filter === "football" ? "football" : "padel");
}

export function gamesHubEmptyLine(filter: SportFilter) {
  const sport = filter === "all" ? null : sportLabel(filter);
  return sport
    ? `${sport} Games you create or join show up here.`
    : "Games you create or join show up here.";
}

import { isHomeUpcomingGame } from "~/server/home/upcoming-games";
import { type GroupGameCandidate } from "~/server/groups/utils";

export function isGroupUpcomingGame(
  game: GroupGameCandidate,
  groupId: string,
  now: Date,
): boolean {
  return isHomeUpcomingGame(game, new Set([groupId]), now);
}

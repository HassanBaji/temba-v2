import { isGameLive } from "~/server/home/upcoming-games";
import { type GroupGameCandidate } from "~/server/groups/utils";

/** Whether a Game row belongs in this Group's history list. */
export function isGroupGameHistory(
  game: GroupGameCandidate,
  groupId: string,
  now: Date,
): boolean {
  if (game.groupId === null || game.groupId !== groupId) {
    return false;
  }
  return !isGameLive(game, now);
}

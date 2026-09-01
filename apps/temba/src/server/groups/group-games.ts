/**
 * Group detail Games lists (TEM-10 / TEM-35).
 * Upcoming: live parent Games scoped to one Group (not Match rows).
 * Soft-archived Club Group Games stay listed (TEM-43). Group membership /
 * page access decides visibility. Public pickup excludes them.
 * History: cancelled, or not live; newest first; capped.
 * Games with null groupId never match a Group id filter.
 */

export {
  filterAndSortGroupGameHistory,
  GROUP_GAME_HISTORY_LIMIT,
} from "~/server/groups/filter-and-sort-group-game-history";
export { filterAndSortGroupUpcomingGames } from "~/server/groups/filter-and-sort-group-upcoming-games";
export { isGroupGameHistory } from "~/server/groups/is-group-game-history";
export { isGroupUpcomingGame } from "~/server/groups/is-group-upcoming-game";
export type { GroupGameCandidate } from "~/server/groups/utils";

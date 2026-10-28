import { gamesHubTabQuery } from "@repo/domain/games-hub-tab";

export function notificationHref(item: {
  type: string;
  group: { id: string } | null;
  game?: { id: string } | null;
}): string | null {
  if (item.type === "group_member_joined" && item.group) {
    return `/dashboard/groups/${item.group.id}`;
  }
  if (
    (item.type === "game_player_joined" ||
      item.type === "game_player_left" ||
      item.type === "game_seated_by_organizer" ||
      item.type === "game_finished") &&
    item.game
  ) {
    return `/dashboard/games/${item.game.id}`;
  }
  if (item.type === "history_linked") {
    return `/dashboard/games${gamesHubTabQuery("history")}`;
  }
  return null;
}

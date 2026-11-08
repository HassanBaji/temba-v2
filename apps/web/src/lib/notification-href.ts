import { challengesTabQuery } from "@repo/domain/challenges-tab";
import { gamesHubTabQuery } from "@repo/domain/games-hub-tab";

export function notificationHref(item: {
  type: string;
  group: { id: string } | null;
  game?: { id: string } | null;
  challenge?: { id: string } | null;
}): string | null {
  if (
    (item.type === "group_member_joined" ||
      item.type === "level_set" ||
      ((item.type === "group_join_requested" ||
        item.type === "group_join_approved" ||
        item.type === "group_join_declined") &&
        !item.game)) &&
    item.group
  ) {
    return `/dashboard/groups/${item.group.id}`;
  }
  if (
    (item.type === "game_player_joined" ||
      item.type === "game_player_left" ||
      item.type === "game_seated_by_organizer" ||
      item.type === "game_side_changed" ||
      item.type === "game_finished" ||
      item.type === "mark_received" ||
      item.type === "mvp_decided" ||
      item.type === "mvp_tie_break" ||
      item.type === "group_join_requested" ||
      item.type === "group_join_approved" ||
      item.type === "group_join_declined" ||
      item.type === "game_level_range_requested" ||
      item.type === "game_level_range_approved" ||
      item.type === "game_level_range_declined" ||
      item.type === "challenge_proposal_confirmed" ||
      item.type === "challenge_squad_due" ||
      item.type === "challenge_squad_named") &&
    item.game
  ) {
    return `/dashboard/games/${item.game.id}`;
  }
  if (item.type === "team_invite_received") {
    return `/dashboard/challenges${challengesTabQuery("teams")}`;
  }
  if (
    (item.type === "challenge_proposal_received" ||
      item.type === "challenge_proposal_declined" ||
      item.type === "challenge_proposal_expired" ||
      item.type === "challenge_proposal_passed_over") &&
    item.challenge
  ) {
    return `/dashboard/challenges/${item.challenge.id}`;
  }
  if (item.type === "challenge_expired") {
    return `/dashboard/challenges${challengesTabQuery("mine")}`;
  }
  if (item.type === "history_linked") {
    return `/dashboard/games${gamesHubTabQuery("history")}`;
  }
  return null;
}

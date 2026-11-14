import { challengesTabQuery } from "@repo/domain/challenges-tab";
import { gamesHubTabQuery } from "@repo/domain/games-hub-tab";
import { isSport } from "@repo/domain/sport";

import { gamePath, gameRatePath } from "../games/games-model";
import { groupTierHistoryPath } from "../groups/groups-model";
import { ratingsPath } from "../profile/ratings-path";

const GROUP_TYPES = new Set([
  "group_member_joined",
  "level_set",
  "tier_band_changed",
]);

const GROUP_JOIN_TYPES = new Set([
  "group_join_requested",
  "group_join_approved",
  "group_join_declined",
]);

const GAME_TYPES = new Set([
  "game_player_joined",
  "game_player_left",
  "game_seated_by_organizer",
  "game_side_changed",
  "game_payment_reminder",
  "game_payment_not_received",
  "game_moved_to_waitlist",
  "game_team_changed",
  "match_score_to_confirm",
  "game_finished",
  "mark_received",
  "mvp_decided",
  "mvp_tie_break",
  "performance_ratings_closed",
  "match_dispute_raised",
  "match_dispute_decided",
  "group_join_requested",
  "group_join_approved",
  "group_join_declined",
  "game_level_range_requested",
  "game_level_range_approved",
  "game_level_range_declined",
  "challenge_proposal_confirmed",
  "challenge_squad_due",
  "challenge_squad_named",
]);

const CHALLENGE_TYPES = new Set([
  "challenge_proposal_received",
  "challenge_proposal_declined",
  "challenge_proposal_expired",
  "challenge_proposal_passed_over",
  "challenge_rematch_nudge",
]);

/** Where a Notification opens in the App; the web mapping, on mobile routes. */
export function notificationPath(item: {
  type: string;
  group: { id: string } | null;
  game?: { id: string; sport?: string | null } | null;
  challenge?: { id: string } | null;
}): string | null {
  const sport = item.game?.sport;
  if (item.type === "level_confirmed" && isSport(sport)) {
    return ratingsPath(sport);
  }
  if (item.game && item.type === "performance_ratings_open") {
    return gameRatePath(item.game.id);
  }
  if (item.group && item.type === "tier_points_adjusted") {
    return groupTierHistoryPath(item.group.id);
  }
  if (
    item.group &&
    (GROUP_TYPES.has(item.type) ||
      (GROUP_JOIN_TYPES.has(item.type) && !item.game))
  ) {
    return `/groups/${item.group.id}`;
  }
  if (item.game && GAME_TYPES.has(item.type)) {
    return gamePath(item.game.id);
  }
  if (item.type === "team_invite_received") {
    return `/challenges${challengesTabQuery("teams")}`;
  }
  if (item.challenge && CHALLENGE_TYPES.has(item.type)) {
    return `/challenges/${item.challenge.id}`;
  }
  if (item.type === "challenge_expired") {
    return `/challenges${challengesTabQuery("mine")}`;
  }
  if (item.type === "history_linked") {
    return `/games${gamesHubTabQuery("history")}`;
  }
  return null;
}

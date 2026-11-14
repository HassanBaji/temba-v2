import type { HomeTarget } from "@repo/domain/home-next-game";
import type { HomeNoGamesCreateAction } from "@repo/domain/home-no-games";
import type { ProfileTaskId } from "@repo/domain/profile-checklist";
import type { Sport } from "@repo/domain/sport";

import { bookingGamePath, bookingPath } from "../booking/booking-model";
import { playerMarksPath } from "../player-profile/player-path";
import { ratingsPath } from "../profile/ratings-path";
import { sportQuery } from "../booking/book-sport";
import {
  COMPLETE_PROFILE_PATH,
  profileTaskPath,
} from "../profile-tasks/profile-tasks-model";

const HOME_TAB = ["(home)"];

export const REQUESTS_PATH = "/requests";

export type HomeNavTarget =
  | HomeTarget
  | HomeNoGamesCreateAction["target"]
  | { kind: "browse-games" }
  | { kind: "group"; groupId: string }
  | { kind: "groups" }
  | { kind: "marks"; userId: string; sport: Sport }
  | { kind: "ratings"; sport: Sport }
  | { kind: "booking"; bookingId: string }
  | { kind: "booking-payment"; bookingId: string }
  | { kind: "booking-game"; bookingId: string }
  | { kind: "book"; sport: Sport }
  | { kind: "invites" }
  | { kind: "notifications" }
  | { kind: "requests" }
  | { kind: "profile-task"; task: ProfileTaskId }
  | { kind: "complete-profile" };

export function homePath(target: HomeNavTarget): string {
  switch (target.kind) {
    case "game":
      return target.intent
        ? `/games/${target.gameId}?intent=${target.intent}`
        : `/games/${target.gameId}`;
    case "group":
      return `/groups/${target.groupId}`;
    case "groups":
      return "/groups";
    case "marks":
      return playerMarksPath(HOME_TAB, target.userId, target.sport);
    case "ratings":
      return ratingsPath(target.sport);
    case "create-game":
      return "/games/new";
    case "create-group":
      return "/groups/new";
    case "browse-games":
      return "/games";
    case "booking":
      return bookingPath(target.bookingId);
    case "booking-payment":
      return `${bookingPath(target.bookingId)}/payment`;
    case "booking-game":
      return bookingGamePath(target.bookingId);
    case "book": {
      const query = sportQuery(target.sport);
      return query ? `/book?${query}` : "/book";
    }
    case "invites":
      return "/profile/invites";
    case "notifications":
      return "/notifications";
    case "requests":
      return REQUESTS_PATH;
    case "profile-task":
      return profileTaskPath(target.task);
    case "complete-profile":
      return COMPLETE_PROFILE_PATH;
  }
}

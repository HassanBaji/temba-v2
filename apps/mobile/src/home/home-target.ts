import type { HomeTarget } from "@repo/domain/home-next-game";
import type { HomeNoGamesCreateAction } from "@repo/domain/home-no-games";
import type { Sport } from "@repo/domain/sport";

import { bookingGamePath, bookingPath } from "../booking/booking-model";
import { sportQuery } from "../booking/book-sport";

export type HomeNavTarget =
  | HomeTarget
  | HomeNoGamesCreateAction["target"]
  | { kind: "browse-games" }
  | { kind: "group"; groupId: string }
  | { kind: "booking"; bookingId: string }
  | { kind: "booking-payment"; bookingId: string }
  | { kind: "booking-game"; bookingId: string }
  | { kind: "book"; sport: Sport }
  | { kind: "invites" };

export function homePath(target: HomeNavTarget): string {
  switch (target.kind) {
    case "game":
      return target.intent
        ? `/games/${target.gameId}?intent=${target.intent}`
        : `/games/${target.gameId}`;
    case "group":
      return `/groups/${target.groupId}`;
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
  }
}

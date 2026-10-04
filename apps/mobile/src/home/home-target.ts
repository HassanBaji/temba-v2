import type { HomeTarget } from "@repo/domain/home-next-game";
import type { HomeNoGamesCreateAction } from "@repo/domain/home-no-games";

export type HomeNavTarget =
  | HomeTarget
  | HomeNoGamesCreateAction["target"]
  | { kind: "browse-games" }
  | { kind: "group"; groupId: string };

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
  }
}

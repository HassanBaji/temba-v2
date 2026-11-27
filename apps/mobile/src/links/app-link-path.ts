import { gamePath } from "../games/games-model";

const WEB_GAME_PAGE =
  /^\/dashboard\/games\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;

/** The path of a link, whether it arrives as a full URL or as a path. */
function linkPath(url: string) {
  const match = /^(?:https?:\/\/[^/?#]*)?(\/[^?#]*)/i.exec(url.trim());
  return match?.[1] ?? null;
}

/**
 * Where a web link opened from outside the App lands on mobile routes, or
 * null when the App has no screen for it. Matches the paths the web App's
 * Apple App Site Association file claims.
 */
export function appLinkPath(url: string): string | null {
  const path = linkPath(url);
  const game = path ? WEB_GAME_PAGE.exec(path) : null;
  return game?.[1] ? gamePath(game[1].toLowerCase()) : null;
}

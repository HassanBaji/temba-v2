import type { DbClient, DbTx } from "@repo/db";

import { isFootballGame } from "@repo/domain/game-shape";

import { isGameOrganizer, type GameRow } from "#src/games/access";

/**
 * Whether the User's score confirmation is an Organizer's, and so final
 * (ADR-0044). Every member of a padel Team acts for it, which makes each
 * player of a padel Challenge Game an organizer of it; they are the players,
 * so they confirm as players and nobody's word settles the score alone. A
 * football Challenge Game that counts for Temba Level needs a confirmation
 * from each Team (ADR-0069): whoever acts for a Team confirms for its side
 * only. An older, Unrated football Challenge Game keeps its final word.
 */
export async function confirmsAsOrganizer(
  database: DbClient | DbTx,
  game: Pick<
    GameRow,
    "createdBy" | "groupId" | "challengeId" | "sport" | "rated"
  >,
  userId: string,
) {
  if (game.challengeId != null && (!isFootballGame(game) || game.rated)) {
    return false;
  }
  return isGameOrganizer(database, game, userId);
}

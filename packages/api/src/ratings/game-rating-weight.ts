import { eq } from "drizzle-orm";

import { groups } from "@repo/db";

import { isPublicGame } from "@repo/domain/game-rating-scope";

import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export const CLUB_GROUP_RATING_WEIGHT = 1;
export const LOOSE_OR_GROUPLESS_RATING_WEIGHT = 0.5;

export type RatedMatchWeight =
  | typeof CLUB_GROUP_RATING_WEIGHT
  | typeof LOOSE_OR_GROUPLESS_RATING_WEIGHT;

/**
 * A Rated Match's weight: 1 on a Club Group and on a Public Game, whose score
 * both sides confirmed (ADR-0071), 0.5 on any other Group or none.
 */
export async function ratingWeightForGame(
  database: DbClient,
  game: { groupId: string | null; isPublic: boolean },
): Promise<RatedMatchWeight> {
  if (isPublicGame(game)) {
    return CLUB_GROUP_RATING_WEIGHT;
  }
  const { groupId } = game;
  if (!groupId) {
    return LOOSE_OR_GROUPLESS_RATING_WEIGHT;
  }

  const group = await database.query.groups.findFirst({
    where: eq(groups.id, groupId),
    columns: { venueId: true },
  });

  if (group?.venueId) {
    return CLUB_GROUP_RATING_WEIGHT;
  }

  return LOOSE_OR_GROUPLESS_RATING_WEIGHT;
}

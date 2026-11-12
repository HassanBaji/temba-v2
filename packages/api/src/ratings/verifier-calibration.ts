import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import {
  MatchStatusEnum,
  gamePlayers,
  games,
  groupMembers,
  groups,
  matches,
  venueVerifiers,
  venues,
  type DbClient,
  type DbTx,
} from "@repo/db";

type DbOrTx = DbClient | DbTx;

export type CalibrationVenue = { id: string; name: string };

/**
 * The Venue a Verifier calibrates a player's Level from (ADR-0072): one where
 * the Verifier holds the role and the player has played a completed Match or
 * belongs to one of its Club Groups. Never the Verifier's own Level. With
 * several such Venues, the Verifier's oldest grant wins. `isVerifier` says
 * whether the User is a Verifier anywhere, so a refusal can say why.
 */
export async function calibrationVenueFor(
  database: DbOrTx,
  args: { verifierUserId: string; targetUserId: string },
): Promise<{ isVerifier: boolean; venue: CalibrationVenue | null }> {
  const grants = await database
    .select({ venueId: venueVerifiers.venueId, name: venues.name })
    .from(venueVerifiers)
    .innerJoin(venues, eq(venues.id, venueVerifiers.venueId))
    .where(eq(venueVerifiers.userId, args.verifierUserId))
    .orderBy(asc(venueVerifiers.createdAt), asc(venueVerifiers.id));
  if (grants.length === 0) {
    return { isVerifier: false, venue: null };
  }
  if (args.verifierUserId === args.targetUserId) {
    return { isVerifier: true, venue: null };
  }

  const venueIds = grants.map((grant) => grant.venueId);
  const [played, clubGroups] = await Promise.all([
    database
      .selectDistinct({ venueId: games.venueId })
      .from(gamePlayers)
      .innerJoin(games, eq(games.id, gamePlayers.gameId))
      .innerJoin(matches, eq(matches.gameId, games.id))
      .where(
        and(
          eq(gamePlayers.userId, args.targetUserId),
          inArray(games.venueId, venueIds),
          isNull(games.cancelledAt),
          eq(matches.status, MatchStatusEnum.COMPLETED),
        ),
      ),
    database
      .selectDistinct({ venueId: groups.venueId })
      .from(groupMembers)
      .innerJoin(groups, eq(groups.id, groupMembers.groupId))
      .where(
        and(
          eq(groupMembers.userId, args.targetUserId),
          inArray(groups.venueId, venueIds),
          isNull(groups.deletedAt),
        ),
      ),
  ]);
  const eligible = new Set(
    [...played, ...clubGroups].flatMap((row) =>
      row.venueId ? [row.venueId] : [],
    ),
  );
  const grant = grants.find((candidate) => eligible.has(candidate.venueId));
  return {
    isVerifier: true,
    venue: grant ? { id: grant.venueId, name: grant.name } : null,
  };
}

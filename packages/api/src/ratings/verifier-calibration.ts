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

async function verifierGrants(database: DbOrTx, verifierUserId: string) {
  return database
    .select({ venueId: venueVerifiers.venueId, name: venues.name })
    .from(venueVerifiers)
    .innerJoin(venues, eq(venues.id, venueVerifiers.venueId))
    .where(eq(venueVerifiers.userId, verifierUserId))
    .orderBy(asc(venueVerifiers.createdAt), asc(venueVerifiers.id));
}

/**
 * The Venues, among those given, each player qualifies at for a calibration
 * (ADR-0072): they played a completed Match in a live Game there, or belong
 * to one of its Club Groups.
 */
async function qualifyingVenueIds(
  database: DbOrTx,
  args: { venueIds: string[]; playerUserIds: string[] },
): Promise<Map<string, Set<string>>> {
  const byPlayer = new Map<string, Set<string>>();
  if (args.venueIds.length === 0 || args.playerUserIds.length === 0) {
    return byPlayer;
  }
  const [played, clubGroups] = await Promise.all([
    database
      .selectDistinct({ userId: gamePlayers.userId, venueId: games.venueId })
      .from(gamePlayers)
      .innerJoin(games, eq(games.id, gamePlayers.gameId))
      .innerJoin(matches, eq(matches.gameId, games.id))
      .where(
        and(
          inArray(gamePlayers.userId, args.playerUserIds),
          inArray(games.venueId, args.venueIds),
          isNull(games.cancelledAt),
          eq(matches.status, MatchStatusEnum.COMPLETED),
        ),
      ),
    database
      .selectDistinct({ userId: groupMembers.userId, venueId: groups.venueId })
      .from(groupMembers)
      .innerJoin(groups, eq(groups.id, groupMembers.groupId))
      .where(
        and(
          inArray(groupMembers.userId, args.playerUserIds),
          inArray(groups.venueId, args.venueIds),
          isNull(groups.deletedAt),
        ),
      ),
  ]);
  for (const row of [...played, ...clubGroups]) {
    if (!row.userId || !row.venueId) {
      continue;
    }
    const venueIds = byPlayer.get(row.userId) ?? new Set<string>();
    venueIds.add(row.venueId);
    byPlayer.set(row.userId, venueIds);
  }
  return byPlayer;
}

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
  const grants = await verifierGrants(database, args.verifierUserId);
  if (grants.length === 0) {
    return { isVerifier: false, venue: null };
  }
  if (args.verifierUserId === args.targetUserId) {
    return { isVerifier: true, venue: null };
  }

  const qualifying = await qualifyingVenueIds(database, {
    venueIds: grants.map((grant) => grant.venueId),
    playerUserIds: [args.targetUserId],
  });
  const eligible = qualifying.get(args.targetUserId);
  const grant = grants.find((candidate) => eligible?.has(candidate.venueId));
  return {
    isVerifier: true,
    venue: grant ? { id: grant.venueId, name: grant.name } : null,
  };
}

/**
 * Whether the Verifier may calibrate every one of these players, by the rule
 * of `calibrationVenueFor`. False for no players, and for a list that holds
 * the Verifier themselves.
 */
export async function mayCalibrateAll(
  database: DbOrTx,
  args: { verifierUserId: string; playerUserIds: readonly string[] },
): Promise<boolean> {
  const playerUserIds = [...new Set(args.playerUserIds)];
  if (
    playerUserIds.length === 0 ||
    playerUserIds.includes(args.verifierUserId)
  ) {
    return false;
  }
  const grants = await verifierGrants(database, args.verifierUserId);
  const qualifying = await qualifyingVenueIds(database, {
    venueIds: grants.map((grant) => grant.venueId),
    playerUserIds,
  });
  return playerUserIds.every((userId) => qualifying.has(userId));
}

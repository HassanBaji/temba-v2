import { eq, inArray } from "drizzle-orm";

import { gamePlayers, games, gameWaitlist, groupMembers } from "@repo/db";

import { type db } from "#src/db";
import { isGameOrganizer } from "#src/games/access";
import { isGroupApprover } from "#src/groups/helpers/is-group-approver";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function organizesAGameTheyAreOn(
  database: DbClient,
  playerId: string,
  callerId: string,
  adderId: string,
) {
  const [seated, waitlisted] = await Promise.all([
    database
      .select({ gameId: gamePlayers.gameId })
      .from(gamePlayers)
      .where(eq(gamePlayers.userId, playerId)),
    database
      .select({ gameId: gameWaitlist.gameId })
      .from(gameWaitlist)
      .where(eq(gameWaitlist.userId, playerId)),
  ]);
  const gameIds = [
    ...new Set([...seated, ...waitlisted].map((row) => row.gameId)),
  ];
  if (gameIds.length === 0) {
    return false;
  }
  const gameRows = await database
    .select({
      createdBy: games.createdBy,
      groupId: games.groupId,
      challengeId: games.challengeId,
    })
    .from(games)
    .where(inArray(games.id, gameIds));
  for (const game of gameRows) {
    if (
      (await isGameOrganizer(database, game, callerId)) &&
      (await isGameOrganizer(database, game, adderId))
    ) {
      return true;
    }
  }
  return false;
}

async function approvesAGroupTheyAreIn(
  database: DbClient,
  playerId: string,
  callerId: string,
  adderId: string,
) {
  const memberships = await database.query.groupMembers.findMany({
    where: eq(groupMembers.userId, playerId),
    columns: { id: true },
    with: { group: true },
  });
  for (const { group } of memberships) {
    if (
      (await isGroupApprover(database, group, callerId)) &&
      (await isGroupApprover(database, group, adderId))
    ) {
      return true;
    }
  }
  return false;
}

/**
 * An existing Unclaimed player can be added to any Group or Game by phone, so
 * a name is fixed only where the person who added them also runs things: a
 * Game or Group the player is on that both the caller and the adder organize.
 * Whether the player is still unclaimed is the caller's check.
 */
export async function mayRenameUnclaimedPlayer(
  database: DbClient,
  args: { playerId: string; adderId: string | null; callerId: string },
) {
  const { adderId } = args;
  if (adderId == null) {
    return false;
  }
  return (
    (await organizesAGameTheyAreOn(
      database,
      args.playerId,
      args.callerId,
      adderId,
    )) ||
    (await approvesAGroupTheyAreIn(
      database,
      args.playerId,
      args.callerId,
      adderId,
    ))
  );
}

import { eq } from "drizzle-orm";

import {
  GamePositionEnum,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  groupMembers,
  groups,
  matches,
  user,
  venues,
} from "@repo/db/schema";
import type { TestDatabase } from "@repo/db/testing";

import { createFriendlyGame } from "#src/games/create-friendly";
import { scoreSet } from "#src/routers/games/scoreSet";

type Player = Awaited<ReturnType<typeof insertUser>>;

export async function insertUser(database: TestDatabase, label: string) {
  const [row] = await database
    .insert(user)
    .values({
      name: label,
      email: `${label}-${crypto.randomUUID()}@example.com`,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

/** Four members of a new Group seated on a scored Friendly game: a and b beat c and d 6–2. */
export async function setUpMatch(
  database: TestDatabase,
  flags: { rated: boolean; groupRated: boolean },
  existing?: {
    players: [Player, Player, Player, Player];
    groupId: string;
    venueId: string;
  },
) {
  const players =
    existing?.players ??
    (await Promise.all(
      ["a", "b", "c", "d"].map((label) => insertUser(database, label)),
    ));
  const [a, b, c, d] = players;
  if (!a || !b || !c || !d) {
    throw new Error("Failed to insert Users");
  }
  let venueId = existing?.venueId;
  let groupId = existing?.groupId;
  if (!venueId || !groupId) {
    const [venue] = await database
      .insert(venues)
      .values({ name: "Club", city: "Manama", country: "BH" })
      .returning();
    const [group] = await database
      .insert(groups)
      .values({ name: "Crew", createdBy: a.id })
      .returning();
    if (!venue || !group) {
      throw new Error("Failed to insert venue or group");
    }
    await database
      .insert(groupMembers)
      .values(
        players.map((member) => ({ groupId: group.id, userId: member.id })),
      );
    venueId = venue.id;
    groupId = group.id;
  }

  const created = await createFriendlyGame(database, {
    createdBy: a.id,
    groupId,
    venueId,
    windowStart: new Date(Date.now() - 2 * 60 * 60 * 1000),
    windowEnd: new Date(Date.now() - 60 * 60 * 1000),
    ...flags,
  });

  const teamIds: string[] = [];
  for (const [sideIndex, pair] of [
    [1, [a, b]],
    [2, [c, d]],
  ] as const) {
    const [team] = await database
      .insert(gameTeams)
      .values({ gameId: created.game.id, sideIndex })
      .returning({ id: gameTeams.id });
    if (!team) {
      throw new Error("Failed to insert game team");
    }
    teamIds.push(team.id);
    for (const [index, member] of pair.entries()) {
      const [player] = await database
        .insert(gamePlayers)
        .values({ gameId: created.game.id, userId: member.id })
        .returning({ id: gamePlayers.id });
      if (!player) {
        throw new Error("Failed to insert game player");
      }
      await database.insert(gameTeamPlayers).values({
        gameTeamId: team.id,
        gamePlayerId: player.id,
        position: index === 0 ? GamePositionEnum.LEFT : GamePositionEnum.RIGHT,
      });
    }
  }
  await database
    .update(matches)
    .set({ slot1GameTeamId: teamIds[0], slot2GameTeamId: teamIds[1] })
    .where(eq(matches.id, created.matchId));

  const set = await database.query.matchSets.findFirst({
    where: (table, { eq: equals }) => equals(table.matchId, created.matchId),
  });
  if (!set) {
    throw new Error("Expected a Set shell");
  }
  await scoreSet(database, {
    gameId: created.game.id,
    matchId: created.matchId,
    setId: set.id,
    userId: a.id,
    slot1GamesWon: 6,
    slot2GamesWon: 2,
  });

  return {
    gameId: created.game.id,
    groupId,
    venueId,
    matchId: created.matchId,
    a,
    b,
    c,
    d,
  };
}

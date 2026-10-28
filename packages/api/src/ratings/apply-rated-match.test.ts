import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GamePositionEnum,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  games,
  groupMembers,
  groups,
  matches,
  ratingEvents,
  ratings,
  user,
  venues,
} from "@repo/db/schema";

import { createFriendlyGame } from "#src/games/create-friendly";
import { completeMatch } from "#src/routers/games/completeMatch";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { gameById } from "#src/routers/games/byId";
import { listMyMatchHistoryRows } from "#src/routers/games/listMyMatchHistory";
import { scoreSet } from "#src/routers/games/scoreSet";
import { loadGroupStandingMembers } from "#src/standing/load-group-standing";
import { loadCompletedMatchesForUser } from "#src/stats/completed-matches";
import { summarizeCompletedMatchStats } from "@repo/domain/completed-matches";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

async function insertUser(database: TestDatabase, label: string) {
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

async function setUpMatch(database: TestDatabase, options: { rated: boolean }) {
  const [a, b, c, d] = await Promise.all(
    ["a", "b", "c", "d"].map((label) => insertUser(database, label)),
  );
  if (!a || !b || !c || !d) {
    throw new Error("Failed to insert Users");
  }
  const [venue] = await database
    .insert(venues)
    .values({ name: "Club", city: "Lisbon", country: "PT" })
    .returning();
  const [group] = await database
    .insert(groups)
    .values({ name: "Crew", createdBy: a.id })
    .returning();
  if (!venue || !group) {
    throw new Error("Failed to insert venue or group");
  }
  await database.insert(groupMembers).values(
    [a, b, c, d].map((member) => ({
      groupId: group.id,
      userId: member.id,
    })),
  );

  const windowStart = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const windowEnd = new Date(Date.now() - 60 * 60 * 1000);
  const created = await createFriendlyGame(database, {
    createdBy: a.id,
    groupId: group.id,
    venueId: venue.id,
    windowStart,
    windowEnd,
  });
  await database
    .update(games)
    .set({ rated: options.rated })
    .where(eq(games.id, created.game.id));

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
    groupId: group.id,
    matchId: created.matchId,
    a,
    b,
    c,
    d,
  };
}

async function seedRating(database: TestDatabase, userId: string) {
  const [row] = await database
    .insert(ratings)
    .values({
      userId,
      sport: "padel",
      mu: 0,
      phi: 1.2,
      sigma: 0.06,
      levelBand: "C2",
    })
    .returning();
  if (!row) {
    throw new Error("Failed to seed rating");
  }
  return row;
}

describe("Unrated Games", () => {
  it("writes no rating events and leaves ratings untouched when the organizer completes", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { gameId, matchId, a, b, c, d } = await setUpMatch(db, {
        rated: false,
      });
      const before = await seedRating(db, a.id);

      await completeMatch(db, { gameId, matchId, userId: a.id });

      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, matchId),
        }),
      ).toHaveLength(0);
      const after = await db.query.ratings.findMany();
      expect(after).toEqual([before]);
      expect(after.map((row) => row.userId)).not.toContain(b.id);
      expect(after.map((row) => row.userId)).not.toContain(c.id);
      expect(after.map((row) => row.userId)).not.toContain(d.id);
    } finally {
      await close();
    }
  });

  it("writes no rating events and leaves ratings untouched when the last confirmation completes", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { gameId, matchId, b, c, d } = await setUpMatch(db, {
        rated: false,
      });
      const before = await seedRating(db, b.id);

      await confirmMatchResult(db, { gameId, matchId, userId: b.id });
      await confirmMatchResult(db, { gameId, matchId, userId: c.id });
      await confirmMatchResult(db, { gameId, matchId, userId: d.id });

      const match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
      });
      expect(match?.status).toBe("completed");
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, matchId),
        }),
      ).toHaveLength(0);
      expect(await db.query.ratings.findMany()).toEqual([before]);
    } finally {
      await close();
    }
  });

  it("still rates a rated Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { gameId, matchId, a } = await setUpMatch(db, { rated: true });

      await completeMatch(db, { gameId, matchId, userId: a.id });

      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, matchId),
        }),
      ).toHaveLength(4);
    } finally {
      await close();
    }
  });

  it("keeps an unrated Game out of the Group Standing", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const unrated = await setUpMatch(db, { rated: false });
      await completeMatch(db, {
        gameId: unrated.gameId,
        matchId: unrated.matchId,
        userId: unrated.a.id,
      });
      const standing = await loadGroupStandingMembers(db, [unrated.groupId]);
      const members = standing.get(unrated.groupId) ?? [];
      expect(members).toHaveLength(4);
      expect(members.every((member) => member.totalGamesPlayed === 0)).toBe(
        true,
      );
    } finally {
      await close();
    }
  });

  it("counts a rated Game in the Group Standing", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const rated = await setUpMatch(db, { rated: true });
      await completeMatch(db, {
        gameId: rated.gameId,
        matchId: rated.matchId,
        userId: rated.a.id,
      });
      const standing = await loadGroupStandingMembers(db, [rated.groupId]);
      const members = standing.get(rated.groupId) ?? [];
      expect(members.every((member) => member.totalGamesPlayed === 1)).toBe(
        true,
      );
    } finally {
      await close();
    }
  });

  it("still counts an unrated Match as played and marks it in stats and history", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { gameId, matchId, a } = await setUpMatch(db, { rated: false });
      await completeMatch(db, { gameId, matchId, userId: a.id });

      const played = await loadCompletedMatchesForUser(db, a.id);
      expect(played).toHaveLength(1);
      expect(played[0]?.rated).toBe(false);
      expect(summarizeCompletedMatchStats(played)).toMatchObject({
        gamesPlayed: 1,
        gamesWon: 1,
        gamesLost: 0,
      });

      const history = await listMyMatchHistoryRows(db, a.id);
      expect(history).toHaveLength(1);
      expect(history[0]?.rated).toBe(false);
    } finally {
      await close();
    }
  });

  it("returns rated false and no rating impact from games.byId", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { gameId, matchId, a } = await setUpMatch(db, { rated: false });
      await completeMatch(db, { gameId, matchId, userId: a.id });

      const detail = await gameById(db, { gameId, userId: a.id });
      expect(detail.phase).toBe("final");
      expect(detail.rated).toBe(false);
      expect(detail.ratingImpact).toBeNull();
    } finally {
      await close();
    }
  });

  it("returns rated true and a rating impact for a rated Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { gameId, matchId, a } = await setUpMatch(db, { rated: true });
      await completeMatch(db, { gameId, matchId, userId: a.id });

      const detail = await gameById(db, { gameId, userId: a.id });
      expect(detail.rated).toBe(true);
      expect(detail.ratingImpact).not.toBeNull();
    } finally {
      await close();
    }
  });
});

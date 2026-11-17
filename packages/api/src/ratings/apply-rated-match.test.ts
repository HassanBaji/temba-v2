import { and, eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

import {
  GamePositionEnum,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  games,
  groupMembers,
  groups,
  matchRatingWindows,
  matchResultConfirmations,
  matches,
  notifications,
  ratingEvents,
  ratings,
  user,
  venueVerifiers,
  venues,
} from "@repo/db/schema";

import { createFriendlyGame } from "#src/games/create-friendly";
import { PUBLIC_GAME_CONFIRM_WINDOW_MS } from "#src/games/match-result-confirmations";
import { recordJobs } from "#src/jobs/job-sink.test-support";
import { ratingWindowSettleJobKey } from "#src/jobs/specs";
import { completeMatch } from "#src/routers/games/completeMatch";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { gameById } from "#src/routers/games/byId";
import { listMyMatchHistoryRows } from "#src/routers/games/listMyMatchHistory";
import {
  confirmedPublicGame,
  seatedPublicGame,
} from "#src/routers/games/public-game.test-support";
import { scoreSet } from "#src/routers/games/scoreSet";
import { stampMatch } from "#src/routers/games/stampMatch";
import { loadGroupStandings } from "#src/standing/load-group-standing";
import { loadCompletedMatchesForUser } from "#src/stats/completed-matches";
import { summarizeCompletedMatchStats } from "@repo/domain/completed-matches";
import { glicko2Step } from "@repo/domain/glicko2";
import { formatLevel, levelFromMu } from "@repo/domain/level";
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

type TestUser = Awaited<ReturnType<typeof insertUser>>;

async function setUpMatch(
  database: TestDatabase,
  options: {
    rated: boolean;
    players?: [TestUser, TestUser, TestUser, TestUser];
  },
) {
  const [a, b, c, d] =
    options.players ??
    (await Promise.all(
      ["a", "b", "c", "d"].map((label) => insertUser(database, label)),
    ));
  if (!a || !b || !c || !d) {
    throw new Error("Failed to insert Users");
  }
  const [venue] = await database
    .insert(venues)
    .values({
      name: `Club ${crypto.randomUUID()}`,
      city: "Lisbon",
      country: "PT",
    })
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

async function seedPadelRating(
  database: TestDatabase,
  userId: string,
  mu: number,
) {
  await database.insert(ratings).values({
    userId,
    sport: "padel",
    mu,
    phi: 200,
    sigma: 0.06,
    levelBand: "C2",
  });
}

async function eventFor(
  database: TestDatabase,
  matchId: string,
  userId: string,
) {
  const event = await database.query.ratingEvents.findFirst({
    where: and(
      eq(ratingEvents.matchId, matchId),
      eq(ratingEvents.userId, userId),
    ),
  });
  if (!event) {
    throw new Error("Expected a rating event");
  }
  return event;
}

/** μ after the step ADR-0009 took: the opposing pair's mean, the partner ignored. */
function muAfterIgnoringPartner(
  event: Awaited<ReturnType<typeof eventFor>>,
  opposingPair: { mu: number; phi: number },
) {
  const before = {
    mu: event.muBefore,
    phi: event.phiBefore,
    sigma: event.sigmaBefore,
  };
  const star = glicko2Step(before, opposingPair, event.outcomeScore);
  return before.mu + event.weight * (star.mu - before.mu);
}

describe("Partner weighting (ADR-0070)", () => {
  it("moves four players of equal μ exactly as before", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { gameId, matchId, a, b, c, d } = await setUpMatch(db, {
        rated: true,
      });
      for (const member of [a, b, c, d]) {
        await seedPadelRating(db, member.id, 1500);
      }

      await completeMatch(db, { gameId, matchId, userId: a.id });

      for (const member of [a, b, c, d]) {
        const event = await eventFor(db, matchId, member.id);
        expect(event.muAfter).toBe(
          muAfterIgnoringPartner(event, { mu: 1500, phi: 200 }),
        );
      }
    } finally {
      await close();
    }
  });

  it("gives the 1300 player beside a 1700 partner less for beating two 1500s, and the partner more", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { gameId, matchId, a, b, c, d } = await setUpMatch(db, {
        rated: true,
      });
      await seedPadelRating(db, a.id, 1300);
      await seedPadelRating(db, b.id, 1700);
      await seedPadelRating(db, c.id, 1500);
      await seedPadelRating(db, d.id, 1500);

      await completeMatch(db, { gameId, matchId, userId: a.id });

      const weak = await eventFor(db, matchId, a.id);
      const strongPartner = await eventFor(db, matchId, b.id);
      const opposingPair = { mu: 1500, phi: 200 };
      expect(weak.outcomeScore).toBe(1);
      expect(weak.muAfter).toBeGreaterThan(weak.muBefore);
      expect(weak.muAfter).toBeLessThan(
        muAfterIgnoringPartner(weak, opposingPair),
      );
      expect(strongPartner.muAfter).toBeGreaterThan(
        muAfterIgnoringPartner(strongPartner, opposingPair),
      );

      const detail = await gameById(db, { gameId, userId: a.id });
      expect(detail.ratingImpact?.levelChange).toBe(
        Math.round(
          (Number(formatLevel(levelFromMu(weak.muAfter))) -
            Number(formatLevel(levelFromMu(weak.muBefore)))) *
            10,
        ) / 10,
      );
    } finally {
      await close();
    }
  });

  it("leaves the rating events of earlier Matches untouched", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const first = await setUpMatch(db, { rated: true });
      const { a, b, c, d } = first;
      await seedPadelRating(db, a.id, 1300);
      await seedPadelRating(db, b.id, 1700);
      await seedPadelRating(db, c.id, 1500);
      await seedPadelRating(db, d.id, 1500);
      await completeMatch(db, {
        gameId: first.gameId,
        matchId: first.matchId,
        userId: a.id,
      });
      const earlier = await db.query.ratingEvents.findMany({
        where: eq(ratingEvents.matchId, first.matchId),
      });

      const second = await setUpMatch(db, {
        rated: true,
        players: [a, b, c, d],
      });
      await completeMatch(db, {
        gameId: second.gameId,
        matchId: second.matchId,
        userId: a.id,
      });

      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, first.matchId),
        }),
      ).toEqual(earlier);
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, second.matchId),
        }),
      ).toHaveLength(4);
    } finally {
      await close();
    }
  });
});

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

  it("counts an unrated Game in the Group Standing without rating it", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const unrated = await setUpMatch(db, { rated: false });
      await completeMatch(db, {
        gameId: unrated.gameId,
        matchId: unrated.matchId,
        userId: unrated.a.id,
      });
      const standing = await loadGroupStandings(db, [unrated.groupId]);
      const byUserId = new Map(
        (standing.get(unrated.groupId)?.rows ?? []).map((member) => [
          member.userId,
          member,
        ]),
      );
      expect(byUserId.size).toBe(4);
      for (const winner of [unrated.a, unrated.b]) {
        expect(byUserId.get(winner.id)).toMatchObject({
          played: 1,
          wins: 1,
          points: 3,
          diff: 1,
        });
      }
      for (const loser of [unrated.c, unrated.d]) {
        expect(byUserId.get(loser.id)).toMatchObject({
          played: 1,
          losses: 1,
          points: 0,
          diff: -1,
        });
      }
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, unrated.matchId),
        }),
      ).toHaveLength(0);
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
      const standing = await loadGroupStandings(db, [rated.groupId]);
      const members = standing.get(rated.groupId)?.rows ?? [];
      expect(members.every((member) => member.played === 1)).toBe(true);
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

describe("A padel Public Game's Rating window (ADR-0099)", () => {
  const jobs = recordJobs();

  function api(database: TestDatabase) {
    return database as unknown as Parameters<typeof completeMatch>[0];
  }

  async function withDb(run: (database: TestDatabase) => Promise<void>) {
    const { db, close } = await createPgliteDb();
    try {
      await run(db);
    } finally {
      await close();
    }
  }

  async function windowOf(database: TestDatabase, matchId: string) {
    return database.query.matchRatingWindows.findFirst({
      where: eq(matchRatingWindows.matchId, matchId),
    });
  }

  async function askedToRate(database: TestDatabase, gameId: string) {
    const rows = await database.query.notifications.findMany({
      where: and(
        eq(notifications.gameId, gameId),
        eq(notifications.type, "performance_ratings_open"),
      ),
      columns: { recipientUserId: true },
    });
    return rows.map((row) => row.recipientUserId).sort();
  }

  /** The creator enters 6-3, which confirms their side only. */
  async function enteredPublicGame(database: TestDatabase) {
    const g = await seatedPublicGame(database);
    await scoreSet(api(database), {
      gameId: g.gameId,
      matchId: g.matchId,
      setId: g.setId,
      userId: g.creator,
      slot1GamesWon: 6,
      slot2GamesWon: 3,
    });
    return g;
  }

  it("opens once the other side confirms, in Everyone mode for 24 hours, and asks the four seated players", async () => {
    await withDb(async (db) => {
      const g = await confirmedPublicGame(db);

      const window = await windowOf(db, g.matchId);
      expect(window).toMatchObject({
        mode: "everyone",
        countsForLevel: true,
        weightPercent: 0,
        settledAt: null,
        suspendedAt: null,
      });
      expect(window!.closesAt.getTime() - window!.createdAt.getTime()).toBe(
        24 * 60 * 60 * 1000,
      );
      expect(
        jobs.added.some(
          (job) => job.key === ratingWindowSettleJobKey(g.matchId),
        ),
      ).toBe(true);
      expect(await askedToRate(db, g.gameId)).toEqual(
        [g.creator, g.b, g.c, g.d].sort(),
      );

      const details = await gameById(api(db), {
        gameId: g.gameId,
        userId: g.d,
      });
      expect(details.ratingWindow).toMatchObject({
        mode: "everyone",
        state: "open",
        viewerMayRate: true,
        countsForLevel: true,
        sport: "padel",
      });
    });
  });

  it("opens when a Verifier stamps a Match only one side confirmed", async () => {
    await withDb(async (db) => {
      const g = await enteredPublicGame(db);
      const game = await db.query.games.findFirst({
        where: eq(games.id, g.gameId),
        columns: { venueId: true },
      });
      const verifier = await insertUser(db, "verifier");
      await db.insert(venueVerifiers).values({
        venueId: game!.venueId!,
        userId: verifier.id,
        kind: "referee",
      });

      await stampMatch(api(db), { matchId: g.matchId, userId: verifier.id });

      expect(await windowOf(db, g.matchId)).toMatchObject({
        mode: "everyone",
        countsForLevel: true,
      });
      expect(await askedToRate(db, g.gameId)).toEqual(
        [g.creator, g.b, g.c, g.d].sort(),
      );
    });
  });

  it("opens none while the Level check is off, and the Match still moves the Level", async () => {
    vi.stubEnv("PADEL_LEVEL_CHECK_ENABLED", "");
    try {
      await withDb(async (db) => {
        const g = await confirmedPublicGame(db);

        expect(await windowOf(db, g.matchId)).toBeUndefined();
        expect(await askedToRate(db, g.gameId)).toEqual([]);
        expect(
          await db.query.ratingEvents.findMany({
            where: eq(ratingEvents.matchId, g.matchId),
          }),
        ).toHaveLength(4);
      });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("opens none when the score stood without the other side's confirmation", async () => {
    await withDb(async (db) => {
      const g = await enteredPublicGame(db);
      await db
        .update(matchResultConfirmations)
        .set({
          confirmedAt: new Date(
            Date.now() - PUBLIC_GAME_CONFIRM_WINDOW_MS - 60_000,
          ),
        })
        .where(eq(matchResultConfirmations.matchId, g.matchId));
      await confirmMatchResult(api(db), {
        gameId: g.gameId,
        matchId: g.matchId,
        userId: g.c,
      });

      const match = await db.query.matches.findFirst({
        where: eq(matches.id, g.matchId),
      });
      expect(match?.stoodUnconfirmedAt).not.toBeNull();
      expect(await windowOf(db, g.matchId)).toBeUndefined();
      expect(await askedToRate(db, g.gameId)).toEqual([]);
    });
  });

  it("opens none on a groupless Game that is not public, as a padel Challenge Game is, nor on a tournament Match", async () => {
    await withDb(async (db) => {
      const groupless = await setUpMatch(db, { rated: true });
      await db
        .update(games)
        .set({ groupId: null, isPublic: false })
        .where(eq(games.id, groupless.gameId));
      await completeMatch(api(db), {
        gameId: groupless.gameId,
        matchId: groupless.matchId,
        userId: groupless.a.id,
      });

      const tournament = await setUpMatch(db, { rated: true });
      await db
        .update(games)
        .set({ format: "friendly_tournament" })
        .where(eq(games.id, tournament.gameId));
      await completeMatch(api(db), {
        gameId: tournament.gameId,
        matchId: tournament.matchId,
        userId: tournament.a.id,
      });

      for (const { matchId } of [groupless, tournament]) {
        expect(
          await db.query.ratingEvents.findMany({
            where: eq(ratingEvents.matchId, matchId),
          }),
        ).toHaveLength(4);
        expect(await windowOf(db, matchId)).toBeUndefined();
      }
    });
  });
});

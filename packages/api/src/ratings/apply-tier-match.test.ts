import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  games,
  groupMembers,
  groupRatingEvents,
  groupTierEvents,
  groupTierPoints,
  matches,
  notifications,
  ratingEvents,
  ratings,
  user,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { ovrFromLevel } from "@repo/domain/football-ovr";
import { muFromLevel } from "@repo/domain/level";
import { tierHintReference } from "@repo/domain/tier-bands";
import { tierExpectedScore, tierHintFor } from "@repo/domain/tier-points";

import { type GameRow } from "#src/games/access";
import {
  addMember,
  footballGame,
  playScore,
  setUpMatch,
  tierEvents,
  type FootballFixture,
} from "#src/ratings/group-rated-match.test-support";
import { applyRatedMatch } from "#src/ratings/apply-rated-match";
import { addGuestPlayer } from "#src/routers/games/addGuestPlayer";
import { completeMatch } from "#src/routers/games/completeMatch";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { footballBoard } from "#src/routers/games/footballBoard";
import { reportWrongScore } from "#src/routers/games/reportWrongScore";
import { saveFootballScore } from "#src/routers/games/saveFootballScore";
import { register } from "#src/routers/games/register";
import { createUnclaimedPlayer } from "#src/unclaimed-players/create-unclaimed-player";

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${name}-${crypto.randomUUID()}@example.com` })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row.id;
}

async function addUnclaimed(f: FootballFixture, phoneNumber: string) {
  const created = await f.db.transaction((tx) =>
    createUnclaimedPlayer(tx, {
      phoneNumber,
      name: `Unclaimed ${phoneNumber}`,
      addedByUserId: f.organizerId,
      startingLevel: { sport: "football", placement: "competitive" },
    }),
  );
  await f.db
    .insert(groupMembers)
    .values({ groupId: f.groupId, userId: created.user.id });
  await register(f.db, { gameId: f.gameId, userId: created.user.id });
  return created.user.id;
}

async function setFootballLevel(
  database: TestDatabase,
  userId: string,
  level: number,
) {
  await database.insert(ratings).values({
    userId,
    sport: "football",
    mu: muFromLevel(level),
    phi: 150,
    sigma: 0.06,
    levelBand: "C1",
  });
}

async function withDb(run: (database: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

describe("Tier points on a completed football Match (ADR-0067)", () => {
  it("gives a Guest player no Tier points (ADR-0079)", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const c = await addMember(f, "c");
      const guest = await addGuestPlayer(db, {
        gameId: f.gameId,
        organizerUserId: f.organizerId,
        name: "Fahad",
      });
      const matchId = await playScore(f, [a, b], [c, guest.userId], {
        slot1: 3,
        slot2: 1,
      });

      const events = (await tierEvents(db, matchId)).filter(
        (event) => event.kind === "game",
      );
      expect(events.map((event) => event.userId).sort()).toEqual(
        [a, b, c].sort(),
      );
      expect(
        await db.query.groupTierPoints.findFirst({
          where: eq(groupTierPoints.userId, guest.userId),
        }),
      ).toBeUndefined();
    });
  });

  it("writes one game event per seated player, Unclaimed included, and no Rating event", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const c = await addMember(f, "c");
      const unclaimed = await addUnclaimed(f, "+97336100001");
      const matchId = await playScore(f, [a, b], [c, unclaimed], {
        slot1: 3,
        slot2: 1,
      });

      const game = await db.query.games.findFirst({
        where: eq(games.id, f.gameId),
      });
      expect(game).toMatchObject({ rated: false, groupRated: true });

      const events = await tierEvents(db, matchId);
      const games_ = events.filter((event) => event.kind === "game");
      expect(games_.map((event) => event.userId).sort()).toEqual(
        [a, b, c, unclaimed].sort(),
      );
      for (const event of games_) {
        expect(event.pointsAfter).toBe(event.pointsBefore + event.delta);
        expect(event.performanceDelta).toBe(0);
        expect(event.delta).toBe(event.resultDelta);
        expect(event.pointsBefore).toBe(1200);
        expect(event.expectedScore).toBe(0.5);
      }
      const deltaOf = (userId: string) =>
        games_.find((event) => event.userId === userId)?.delta;
      expect(deltaOf(a)).toBe(24);
      expect(deltaOf(unclaimed)).toBe(-24);

      const rows = await db.query.groupTierPoints.findMany({
        where: eq(groupTierPoints.groupId, f.groupId),
      });
      expect(
        rows.map((row) => [row.userId, row.points, row.gamesCounted]).sort(),
      ).toEqual(
        [
          [a, 1224, 1],
          [b, 1224, 1],
          [c, 1176, 1],
          [unclaimed, 1176, 1],
        ].sort(),
      );
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, matchId),
        }),
      ).toHaveLength(0);
      expect(
        await db.query.groupRatingEvents.findMany({
          where: eq(groupRatingEvents.matchId, matchId),
        }),
      ).toHaveLength(0);
    });
  });

  it("weighs a player with no Tier points as their start hint, and still starts their points at 1,200", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      const levels = [4, 3.5, 3, 2.5];
      const points = [1300, 1250, 1200, 1100];
      const ranked: string[] = [];
      for (const [index, level] of levels.entries()) {
        const seated = index === 1 || index === 2;
        const userId = seated
          ? await addMember(f, `ranked${index}`)
          : await insertUser(db, `ranked${index}`);
        if (!seated) {
          await db.insert(groupMembers).values({ groupId: f.groupId, userId });
        }
        ranked.push(userId);
        await setFootballLevel(db, userId, level);
        await db.insert(groupTierPoints).values({
          groupId: f.groupId,
          userId,
          points: points[index]!,
          gamesCounted: 9,
        });
      }
      const newcomer = await addMember(f, "newcomer");
      await setFootballLevel(db, newcomer, 4);
      const noLevel = await addMember(f, "noLevel");

      const hint = tierHintFor(
        ovrFromLevel(4),
        tierHintReference(
          levels.map((level, index) => ({
            points: points[index]!,
            provisional: false,
            ovr: ovrFromLevel(level),
          })),
        ),
      )!;
      expect(hint).toBeGreaterThan(1250);
      const board = await footballBoard(db, {
        gameId: f.gameId,
        userId: f.organizerId,
      });
      expect(
        board.players.find((player) => player.userId === newcomer)
          ?.balanceStrength,
      ).toBe(hint);

      const matchId = await playScore(
        f,
        [newcomer, noLevel],
        [ranked[1]!, ranked[2]!],
        { slot1: 1, slot2: 0 },
      );
      const events = new Map(
        (await tierEvents(db, matchId))
          .filter((event) => event.kind === "game")
          .map((event) => [event.userId, event]),
      );
      const expected = tierExpectedScore((hint + 1200) / 2, (1250 + 1200) / 2);
      expect(expected).toBeGreaterThan(0.5);
      expect(events.get(newcomer)?.expectedScore).toBeCloseTo(expected, 10);
      expect(events.get(ranked[1]!)?.expectedScore).toBeCloseTo(
        1 - expected,
        10,
      );
      for (const userId of [newcomer, noLevel]) {
        const event = events.get(userId)!;
        expect(event.pointsBefore).toBe(1200);
        expect(event.pointsAfter).toBe(1200 + event.delta);
      }

      await reportWrongScore(db, {
        gameId: f.gameId,
        matchId,
        userId: f.organizerId,
      });
      await saveFootballScore(
        db,
        {
          gameId: f.gameId,
          userId: f.organizerId,
          slot1Goals: 2,
          slot2Goals: 0,
          scorers: [],
        },
        new Date(f.kickoff.getTime() + 2 * 60 * 60 * 1000),
      );
      await confirmMatchResult(db, {
        gameId: f.gameId,
        matchId,
        userId: f.organizerId,
      });
      const again = (await tierEvents(db, matchId)).find(
        (event) => event.kind === "game" && event.userId === newcomer,
      );
      expect(again?.expectedScore).toBeCloseTo(expected, 10);
      expect(again?.pointsBefore).toBe(1200);
    });
  });

  it("writes nothing when the same Match completes a second time", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const matchId = await playScore(f, [a], [b], { slot1: 2, slot2: 2 });
      const before = await tierEvents(db, matchId);
      const pointsBefore = await db.query.groupTierPoints.findMany();

      const game = (await db.query.games.findFirst({
        where: eq(games.id, f.gameId),
      })) as GameRow;
      const match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
      });
      await applyRatedMatch(db, game, match!, "draw");
      await applyRatedMatch(db, game, match!, "slot1");

      expect(await tierEvents(db, matchId)).toEqual(before);
      expect(await db.query.groupTierPoints.findMany()).toEqual(pointsBefore);
    });
  });

  it("writes a band_change event when a Match moves someone's fish", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      const p1 = await addMember(f, "p1");
      const p2 = await addMember(f, "p2");
      const p3 = await insertUser(db, "p3");
      const p4 = await insertUser(db, "p4");
      const top1 = await insertUser(db, "top1");
      const top2 = await insertUser(db, "top2");
      await db.insert(groupMembers).values([
        { groupId: f.groupId, userId: p3 },
        { groupId: f.groupId, userId: p4 },
        { groupId: f.groupId, userId: top1 },
        { groupId: f.groupId, userId: top2 },
      ]);
      await db.insert(groupTierPoints).values([
        {
          groupId: f.groupId,
          userId: top1,
          points: 1500,
          gamesCounted: 9,
          band: "shark",
        },
        {
          groupId: f.groupId,
          userId: top2,
          points: 1450,
          gamesCounted: 9,
          band: "shark",
        },
        {
          groupId: f.groupId,
          userId: p1,
          points: 1300,
          gamesCounted: 9,
          band: "shark",
        },
        {
          groupId: f.groupId,
          userId: p2,
          points: 1290,
          gamesCounted: 9,
          band: "kanaad",
        },
        {
          groupId: f.groupId,
          userId: p3,
          points: 1200,
          gamesCounted: 9,
          band: "safi",
        },
        {
          groupId: f.groupId,
          userId: p4,
          points: 1100,
          gamesCounted: 9,
          band: "safi",
        },
      ]);

      const matchId = await playScore(f, [p2], [p1], { slot1: 4, slot2: 0 });

      const changes = (await tierEvents(db, matchId))
        .filter((event) => event.kind === "band_change")
        .map((event) => [event.userId, event.bandBefore, event.bandAfter]);
      expect(changes.sort()).toEqual(
        [
          [p1, "shark", "kanaad"],
          [p2, "kanaad", "shark"],
        ].sort(),
      );
      const winner = await db.query.groupTierEvents.findFirst({
        where: and(
          eq(groupTierEvents.matchId, matchId),
          eq(groupTierEvents.userId, p2),
          eq(groupTierEvents.kind, "game"),
        ),
      });
      expect(winner).toMatchObject({
        bandBefore: "kanaad",
        bandAfter: "shark",
        placeAfter: 3,
        rankedCount: 6,
        memberCount: 7,
      });
      const stored = await db.query.groupTierPoints.findFirst({
        where: eq(groupTierPoints.userId, p2),
      });
      expect(stored?.band).toBe("shark");

      const told = await db.query.notifications.findMany({
        where: eq(notifications.type, "tier_band_changed"),
        with: { groupTierEvent: true },
      });
      expect(
        told
          .map((row) => [
            row.recipientUserId,
            row.audience,
            row.groupId,
            row.groupTierEvent?.kind,
            row.groupTierEvent?.userId,
            row.groupTierEvent?.bandAfter,
          ])
          .sort(),
      ).toEqual(
        [
          [p1, "player", f.groupId, "band_change", p1, "kanaad"],
          [p2, "player", f.groupId, "band_change", p2, "shark"],
        ].sort(),
      );
    });
  });

  it("writes no tier event on a Verified Group or an Unrated football Game", async () => {
    await withDb(async (db) => {
      for (const options of [{ verified: true }, { rated: false }]) {
        const f = await footballGame(db, options);
        const a = await addMember(f, `a${crypto.randomUUID()}`);
        const b = await addMember(f, `b${crypto.randomUUID()}`);
        const matchId = await playScore(f, [a], [b], { slot1: 1, slot2: 0 });
        expect(await tierEvents(db, matchId)).toHaveLength(0);
      }
      expect(await db.query.groupTierPoints.findMany()).toHaveLength(0);
    });
  });

  it("writes no tier event for a padel Game", async () => {
    await withDb(async (db) => {
      const { gameId, matchId, a } = await setUpMatch(db, {
        rated: false,
        groupRated: true,
      });
      await completeMatch(db, { gameId, matchId, userId: a.id });
      expect(
        await db.query.groupRatingEvents.findMany({
          where: eq(groupRatingEvents.matchId, matchId),
        }),
      ).toHaveLength(0);
      expect(await tierEvents(db, matchId)).toHaveLength(0);
      expect(await db.query.groupTierPoints.findMany()).toHaveLength(0);
    });
  });
});

import { and, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  MatchStatusEnum,
  groupMembers,
  groupTierEvents,
  groupTierPoints,
  matches,
  notifications,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import {
  addMember,
  footballGame,
  insertUser,
  nextFootballGame,
  playScore,
  tierEvents,
  type FootballFixture,
} from "#src/ratings/group-rated-match.test-support";
import { gameById } from "#src/routers/games/byId";
import { leaveGroup } from "#src/routers/groups/leave";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { register } from "#src/routers/games/register";
import { reportWrongScore } from "#src/routers/games/reportWrongScore";
import { saveFootballScore } from "#src/routers/games/saveFootballScore";

const HOUR = 60 * 60 * 1000;

async function withDb(run: (database: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

async function pointsByUser(database: TestDatabase, groupId: string) {
  const rows = await database.query.groupTierPoints.findMany({
    where: eq(groupTierPoints.groupId, groupId),
  });
  return new Map(rows.map((row) => [row.userId, row]));
}

async function gameDeltas(database: TestDatabase, matchId: string) {
  const events = await tierEvents(database, matchId);
  return new Map(
    events
      .filter((event) => event.kind === "game")
      .map((event) => [event.userId, event.delta]),
  );
}

async function laterGame(
  f: FootballFixture,
  startsInHours: number,
  players: string[],
) {
  const next = await nextFootballGame(f, startsInHours);
  for (const userId of players) {
    await register(f.db, { gameId: next.gameId, userId });
  }
  return next;
}

describe("reportWrongScore on a football Group Game (ADR-0067)", () => {
  it("takes back the Match's Tier points past three later tier Games and a Tier adjustment", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const c = await addMember(f, "c");
      const d = await addMember(f, "d");
      const players = [a, b, c, d];
      const reported = await playScore(f, [a, b], [c, d], {
        slot1: 3,
        slot2: 1,
      });
      const reportedEvents = await tierEvents(db, reported);
      const before = new Map(
        reportedEvents
          .filter((event) => event.kind === "game")
          .map((event) => [event.userId, event.pointsBefore]),
      );

      const later: Map<string, number>[] = [];
      for (const [index, sides] of [
        [
          [a, c],
          [b, d],
        ],
        [
          [c, d],
          [a, b],
        ],
        [
          [a, d],
          [b, c],
        ],
      ].entries()) {
        const next = await laterGame(f, 3 + index * 2, players);
        const matchId = await playScore(next, sides[0]!, sides[1]!, {
          slot1: 2,
          slot2: 1,
        });
        later.push(await gameDeltas(db, matchId));
      }

      const rows = await pointsByUser(db, f.groupId);
      const adjustedAt = new Date();
      await db.insert(groupTierEvents).values({
        groupId: f.groupId,
        userId: c,
        kind: "adjustment",
        delta: 50,
        pointsBefore: rows.get(c)!.points,
        pointsAfter: rows.get(c)!.points + 50,
        setByUserId: f.organizerId,
        reason: "plays_above_results",
      });
      await db
        .update(groupTierPoints)
        .set({ points: rows.get(c)!.points + 50, confirmedAt: adjustedAt })
        .where(eq(groupTierPoints.id, rows.get(c)!.id));

      const organizerView = await gameById(db, {
        gameId: f.gameId,
        userId: f.organizerId,
      });
      expect(organizerView.canReportWrongScore).toEqual({ eligible: true });
      await reportWrongScore(db, {
        gameId: f.gameId,
        matchId: reported,
        userId: f.organizerId,
      });

      const after = await pointsByUser(db, f.groupId);
      for (const userId of players) {
        const afterMatch = later.reduce(
          (sum, deltas) => sum + (deltas.get(userId) ?? 0),
          userId === c ? 50 : 0,
        );
        expect(after.get(userId)?.points).toBe(
          before.get(userId)! + afterMatch,
        );
        expect(after.get(userId)?.gamesCounted).toBe(3);
      }
      expect(after.get(c)?.confirmedAt).toEqual(adjustedAt);
      expect(
        await db.query.groupTierEvents.findMany({
          where: and(
            eq(groupTierEvents.userId, c),
            eq(groupTierEvents.kind, "adjustment"),
          ),
        }),
      ).toHaveLength(1);
      expect(await tierEvents(db, reported)).toHaveLength(0);

      const match = await db.query.matches.findFirst({
        where: eq(matches.id, reported),
      });
      expect(match?.status).toBe(MatchStatusEnum.PENDING);
    });
  });

  it("re-cuts the fish and writes one band_change for each player whose fish moved back", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      const p1 = await addMember(f, "p1");
      const p2 = await addMember(f, "p2");
      const p3 = (await insertUser(db, "p3")).id;
      const p4 = (await insertUser(db, "p4")).id;
      await db.insert(groupMembers).values([
        { groupId: f.groupId, userId: p3 },
        { groupId: f.groupId, userId: p4 },
      ]);
      const ranked = { gamesCounted: 9, groupId: f.groupId };
      await db.insert(groupTierPoints).values([
        { ...ranked, userId: p1, points: 1300, band: "shark" },
        { ...ranked, userId: p2, points: 1290, band: "kanaad" },
        { ...ranked, userId: p3, points: 1200, band: "safi" },
        { ...ranked, userId: p4, points: 1100, band: "safi" },
      ]);
      const settled = await pointsByUser(db, f.groupId);

      const reported = await playScore(f, [p2], [p1], { slot1: 4, slot2: 0 });
      const moved = await pointsByUser(db, f.groupId);
      expect(moved.get(p1)?.band).toBe("kanaad");
      expect(moved.get(p2)?.band).toBe("shark");

      await reportWrongScore(db, {
        gameId: f.gameId,
        matchId: reported,
        userId: f.organizerId,
      });

      const after = await pointsByUser(db, f.groupId);
      expect(after.get(p1)?.band).toBe("shark");
      expect(after.get(p2)?.band).toBe("kanaad");
      expect(after.get(p1)?.points).toBe(settled.get(p1)?.points);
      expect(after.get(p2)?.points).toBe(settled.get(p2)?.points);

      const reversalChanges = await db.query.groupTierEvents.findMany({
        where: and(
          eq(groupTierEvents.groupId, f.groupId),
          eq(groupTierEvents.kind, "band_change"),
          isNull(groupTierEvents.matchId),
        ),
      });
      expect(
        reversalChanges
          .map((event) => [event.userId, event.bandBefore, event.bandAfter])
          .sort(),
      ).toEqual(
        [
          [p1, "kanaad", "shark"],
          [p2, "shark", "kanaad"],
        ].sort(),
      );
      expect(await tierEvents(db, reported)).toHaveLength(0);

      const told = await db.query.notifications.findMany({
        where: eq(notifications.type, "tier_band_changed"),
        with: { groupTierEvent: true },
      });
      expect(
        told
          .map((row) => [
            row.recipientUserId,
            row.groupTierEvent?.matchId,
            row.groupTierEvent?.bandAfter,
          ])
          .sort(),
      ).toEqual(
        [
          [p1, null, "shark"],
          [p2, null, "kanaad"],
        ].sort(),
      );
    });
  });

  it("leaves the points of a member who left the Group alone", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const reported = await playScore(f, [a], [b], { slot1: 1, slot2: 0 });
      await db
        .delete(groupMembers)
        .where(
          and(eq(groupMembers.groupId, f.groupId), eq(groupMembers.userId, b)),
        );
      await db
        .delete(groupTierPoints)
        .where(
          and(
            eq(groupTierPoints.groupId, f.groupId),
            eq(groupTierPoints.userId, b),
          ),
        );

      await reportWrongScore(db, {
        gameId: f.gameId,
        matchId: reported,
        userId: f.organizerId,
      });

      const after = await pointsByUser(db, f.groupId);
      expect(after.get(a)).toMatchObject({ points: 1200, gamesCounted: 0 });
      expect(after.has(b)).toBe(false);
      expect(await tierEvents(db, reported)).toHaveLength(0);
    });
  });

  it("leaves the fresh points of a member who left and joined again alone", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const reported = await playScore(f, [a], [b], { slot1: 1, slot2: 0 });
      const oldDelta = (await gameDeltas(db, reported)).get(b)!;
      expect(oldDelta).toBeLessThan(0);

      await leaveGroup(db, { groupId: f.groupId, userId: b });
      expect((await pointsByUser(db, f.groupId)).has(b)).toBe(false);
      await db.insert(groupMembers).values({ groupId: f.groupId, userId: b });

      const next = await laterGame(f, 3, [a, b]);
      const later = await playScore(next, [b], [a], { slot1: 2, slot2: 0 });
      const laterDeltas = await gameDeltas(db, later);
      const fresh = (await pointsByUser(db, f.groupId)).get(b);
      expect(fresh).toMatchObject({
        points: 1200 + laterDeltas.get(b)!,
        gamesCounted: 1,
      });

      await reportWrongScore(db, {
        gameId: f.gameId,
        matchId: reported,
        userId: f.organizerId,
      });

      const after = await pointsByUser(db, f.groupId);
      expect(after.get(b)).toMatchObject({
        points: fresh!.points,
        gamesCounted: 1,
      });
      expect(after.get(a)).toMatchObject({
        points: 1200 + laterDeltas.get(a)!,
        gamesCounted: 1,
      });
      expect(await tierEvents(db, reported)).toHaveLength(0);
    });
  });

  it("moves Tier points afresh when the corrected Score completes the Match again", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const reported = await playScore(f, [a], [b], { slot1: 3, slot2: 0 });
      await reportWrongScore(db, {
        gameId: f.gameId,
        matchId: reported,
        userId: f.organizerId,
      });

      await saveFootballScore(
        db,
        {
          gameId: f.gameId,
          userId: f.organizerId,
          slot1Goals: 0,
          slot2Goals: 3,
          scorers: [],
        },
        new Date(f.kickoff.getTime() + 2 * HOUR),
      );
      await confirmMatchResult(db, {
        gameId: f.gameId,
        matchId: reported,
        userId: f.organizerId,
      });

      const deltas = await gameDeltas(db, reported);
      expect(deltas.get(a)).toBeLessThan(0);
      expect(deltas.get(b)).toBeGreaterThan(0);
      const after = await pointsByUser(db, f.groupId);
      expect(after.get(a)).toMatchObject({
        points: 1200 + deltas.get(a)!,
        gamesCounted: 1,
      });
    });
  });
});

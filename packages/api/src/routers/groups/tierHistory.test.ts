import { TRPCError } from "@trpc/server";
import { and, eq, sql, type SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  groupMembers,
  groupTierEvents,
  groupTierPoints,
  user,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import {
  addMember,
  footballGame,
  nextFootballGame,
  playScore,
  type FootballFixture,
} from "#src/ratings/group-rated-match.test-support";
import { adjustTierPoints } from "#src/routers/groups/adjustTierPoints";
import { register } from "#src/routers/games/register";
import { leaveGroup } from "#src/routers/groups/leave";
import { removePlayer } from "#src/routers/groups/removePlayer";
import { tierHistory } from "#src/routers/groups/tierHistory";

type ApiDb = Parameters<typeof tierHistory>[0];

function apiDb(database: TestDatabase) {
  return database as unknown as ApiDb;
}

function at(stamp: string): SQL {
  return sql`${sql.raw(`'${stamp}'`)}::timestamp`;
}

async function withDb(run: (database: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

async function rejection(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(TRPCError);
  return error as TRPCError;
}

async function nameOf(database: TestDatabase, userId: string) {
  const row = await database.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { name: true },
  });
  return row!.name;
}

/**
 * Four players and two Games: a 5–3 then a 2–4 for `a`, and between them the
 * Organizer's Tier adjustment of `a` with a reason and a note.
 */
async function playedGroup(database: TestDatabase) {
  const f = await footballGame(database);
  const a = await addMember(f, "a");
  const b = await addMember(f, "b");
  const c = await addMember(f, "c");
  const d = await addMember(f, "d");
  const firstMatch = await playScore(f, [a, b], [c, d], { slot1: 5, slot2: 3 });

  const adjusted = await adjustTierPoints(apiDb(database), {
    groupId: f.groupId,
    organizerUserId: f.organizerId,
    userId: a,
    points: 1260,
    reason: "plays_above_results",
    note: "Plays above this group.",
  });

  const second: FootballFixture = await nextFootballGame(f, 30);
  for (const userId of [a, b, c, d]) {
    await register(apiDb(database), { gameId: second.gameId, userId });
  }
  const secondMatch = await playScore(second, [c, a], [b, d], {
    slot1: 2,
    slot2: 4,
  });
  return { f, a, b, c, d, firstMatch, secondMatch, adjusted };
}

describe("groups.tierHistory (screen 2e)", () => {
  it("lists a member's Games and Tier adjustments, newest first, with who and why", async () => {
    await withDb(async (db) => {
      const { f, a } = await playedGroup(db);

      const history = await tierHistory(apiDb(db), {
        groupId: f.groupId,
        viewerUserId: a,
      });

      expect(history.group).toEqual({
        id: f.groupId,
        name: "Thursday Football",
      });
      expect(history.member).toMatchObject({ userId: a, isViewer: true });
      expect(history.entries.map((entry) => entry.kind)).toEqual([
        "tier_game",
        "tier_adjustment",
        "tier_game",
      ]);
      const [latest, adjustment, first] = history.entries;
      expect(latest).toMatchObject({
        kind: "tier_game",
        score: { own: 2, opponent: 4 },
      });
      expect(latest!.delta).toBeLessThan(0);
      expect(first).toMatchObject({
        kind: "tier_game",
        score: { own: 5, opponent: 3 },
        resultDelta: first!.delta,
        performanceDelta: 0,
        ratingHundredths: null,
      });
      expect(first!.delta).toBeGreaterThan(0);
      expect(adjustment).toEqual({
        kind: "tier_adjustment",
        id: expect.any(String),
        at: expect.any(Date),
        delta: 1260 - (1200 + first!.delta),
        pointsBefore: 1200 + first!.delta,
        pointsAfter: 1260,
        setBy: { userId: f.organizerId, name: await nameOf(db, f.organizerId) },
        reason: "plays_above_results",
        note: "Plays above this group.",
      });
      expect(history.tier).toMatchObject({
        points: latest!.pointsAfter,
        gamesCounted: 2,
        provisional: false,
      });
      expect(history.nextCursor).toBeNull();
    });
  });

  it("leaves band changes out of what moved the points", async () => {
    await withDb(async (db) => {
      const { f, a } = await playedGroup(db);
      const bandChanges = await db.query.groupTierEvents.findMany({
        where: and(
          eq(groupTierEvents.userId, a),
          eq(groupTierEvents.kind, "band_change"),
        ),
      });
      const history = await tierHistory(apiDb(db), {
        groupId: f.groupId,
        viewerUserId: f.organizerId,
        userId: a,
      });
      const ids = new Set(history.entries.map((entry) => entry.id));
      expect(bandChanges.every((event) => !ids.has(event.id))).toBe(true);
    });
  });

  it("refuses a member reading another member's history", async () => {
    await withDb(async (db) => {
      const { f, a, b } = await playedGroup(db);
      const error = await rejection(
        tierHistory(apiDb(db), {
          groupId: f.groupId,
          viewerUserId: b,
          userId: a,
        }),
      );
      expect(error.code).toBe("FORBIDDEN");
      expect(error.message).toBe(
        "Only the player and this group’s organizers can see these points.",
      );
    });
  });

  it("lets an Organizer read any member's history", async () => {
    await withDb(async (db) => {
      const { f, a } = await playedGroup(db);
      const history = await tierHistory(apiDb(db), {
        groupId: f.groupId,
        viewerUserId: f.organizerId,
        userId: a,
      });
      expect(history.member).toMatchObject({ userId: a, isViewer: false });
      expect(history.entries).toHaveLength(3);
    });
  });

  it("lets an Appointed Organizer read it too", async () => {
    await withDb(async (db) => {
      const { f, a, b } = await playedGroup(db);
      await db
        .update(groupMembers)
        .set({ role: "organizer" })
        .where(
          and(eq(groupMembers.groupId, f.groupId), eq(groupMembers.userId, b)),
        );
      const history = await tierHistory(apiDb(db), {
        groupId: f.groupId,
        viewerUserId: b,
        userId: a,
      });
      expect(history.entries).toHaveLength(3);
    });
  });

  it("refuses someone outside the Group, even for themself", async () => {
    await withDb(async (db) => {
      const { f, a } = await playedGroup(db);
      await leaveGroup(apiDb(db), { groupId: f.groupId, userId: a });
      const error = await rejection(
        tierHistory(apiDb(db), { groupId: f.groupId, viewerUserId: a }),
      );
      expect(error.code).toBe("FORBIDDEN");
    });
  });

  it("pages with a cursor", async () => {
    await withDb(async (db) => {
      const { f, a } = await playedGroup(db);
      const first = await tierHistory(apiDb(db), {
        groupId: f.groupId,
        viewerUserId: a,
        limit: 2,
      });
      expect(first.entries).toHaveLength(2);
      expect(first.nextCursor).not.toBeNull();
      const rest = await tierHistory(apiDb(db), {
        groupId: f.groupId,
        viewerUserId: a,
        limit: 2,
        cursor: first.nextCursor!,
      });
      expect(rest.entries.map((entry) => entry.kind)).toEqual(["tier_game"]);
      expect(rest.nextCursor).toBeNull();
    });
  });

  it("pages at every limit without skipping rows one transaction wrote", async () => {
    await withDb(async (db) => {
      const { f, a } = await playedGroup(db);
      const events = await db.query.groupTierEvents.findMany({
        where: and(
          eq(groupTierEvents.groupId, f.groupId),
          eq(groupTierEvents.userId, a),
        ),
      });
      const adjustment = events.find((event) => event.kind === "adjustment")!;
      const [earlier, later] = events
        .filter((event) => event.kind === "game")
        .sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime());

      // The adjustment and the later Game share one microsecond, as rows one
      // transaction writes do, so the id alone orders them.
      for (const event of [adjustment, later!]) {
        await db
          .update(groupTierEvents)
          .set({ createdAt: at("2026-10-04 09:00:00.123456") })
          .where(eq(groupTierEvents.id, event.id));
      }
      await db
        .update(groupTierEvents)
        .set({ createdAt: at("2026-10-03 09:00:00.5") })
        .where(eq(groupTierEvents.id, earlier!.id));

      const tied = [adjustment.id, later!.id].sort().reverse();
      const expected = [...tied, earlier!.id];
      for (let limit = 1; limit <= expected.length; limit += 1) {
        const ids: string[] = [];
        let cursor: Parameters<typeof tierHistory>[1]["cursor"];
        do {
          const page = await tierHistory(apiDb(db), {
            groupId: f.groupId,
            viewerUserId: a,
            limit,
            cursor,
          });
          ids.push(...page.entries.map((entry) => entry.id));
          cursor = page.nextCursor ?? undefined;
        } while (cursor && ids.length <= expected.length);
        expect(ids, `limit ${limit}`).toEqual(expected);
      }

      // A released client's cursor is the row's time as a Date and its id.
      const first = await db.query.groupTierEvents.findFirst({
        where: eq(groupTierEvents.id, tied[0]!),
      });
      const afterFirst = await tierHistory(apiDb(db), {
        groupId: f.groupId,
        viewerUserId: a,
        cursor: { createdAt: first!.createdAt, id: first!.id },
      });
      expect(afterFirst.entries.map((entry) => entry.id)).toEqual(
        expected.slice(1),
      );
    });
  });

  it("finds no one for an Organizer asking after a stranger to the Group", async () => {
    await withDb(async (db) => {
      const { f } = await playedGroup(db);
      const [stranger] = await db
        .insert(user)
        .values({ name: "Stranger", email: `s-${crypto.randomUUID()}@x.com` })
        .returning({ id: user.id });
      const error = await rejection(
        tierHistory(apiDb(db), {
          groupId: f.groupId,
          viewerUserId: f.organizerId,
          userId: stranger!.id,
        }),
      );
      expect(error.code).toBe("NOT_FOUND");
    });
  });

  it("has no tier and no entries for a member who has not played", async () => {
    await withDb(async (db) => {
      const { f } = await playedGroup(db);
      const history = await tierHistory(apiDb(db), {
        groupId: f.groupId,
        viewerUserId: f.organizerId,
      });
      expect(history.entries).toEqual([]);
      expect(history.tier).toMatchObject({
        provisional: true,
        gamesCounted: 0,
        points: 1200,
      });
    });
  });
});

describe("leaving or being removed clears Tier points and keeps the events", () => {
  async function pointsRow(
    database: TestDatabase,
    groupId: string,
    userId: string,
  ) {
    return database.query.groupTierPoints.findFirst({
      where: and(
        eq(groupTierPoints.groupId, groupId),
        eq(groupTierPoints.userId, userId),
      ),
    });
  }

  async function rejoin(
    database: TestDatabase,
    groupId: string,
    userId: string,
  ) {
    await database.insert(groupMembers).values({ groupId, userId });
  }

  it("after removal and re-joining the member starts with no points row and keeps their events", async () => {
    await withDb(async (db) => {
      const { f, a } = await playedGroup(db);
      expect(await pointsRow(db, f.groupId, a)).toBeDefined();

      await removePlayer(apiDb(db), {
        groupId: f.groupId,
        approverUserId: f.organizerId,
        userId: a,
      });
      expect(await pointsRow(db, f.groupId, a)).toBeUndefined();

      await rejoin(db, f.groupId, a);
      expect(await pointsRow(db, f.groupId, a)).toBeUndefined();
      const history = await tierHistory(apiDb(db), {
        groupId: f.groupId,
        viewerUserId: a,
      });
      expect(history.entries.map((entry) => entry.kind)).toEqual([
        "tier_game",
        "tier_adjustment",
        "tier_game",
      ]);
      expect(history.tier).toMatchObject({
        points: 1200,
        gamesCounted: 0,
        provisional: true,
        place: null,
      });
    });
  });

  it("leaving clears the points row and keeps the events", async () => {
    await withDb(async (db) => {
      const { f, b } = await playedGroup(db);
      const before = await db.query.groupTierEvents.findMany({
        where: eq(groupTierEvents.userId, b),
      });

      await leaveGroup(apiDb(db), { groupId: f.groupId, userId: b });
      expect(await pointsRow(db, f.groupId, b)).toBeUndefined();
      const after = await db.query.groupTierEvents.findMany({
        where: eq(groupTierEvents.userId, b),
      });
      expect(after.map((event) => event.id).sort()).toEqual(
        before.map((event) => event.id).sort(),
      );

      await rejoin(db, f.groupId, b);
      const history = await tierHistory(apiDb(db), {
        groupId: f.groupId,
        viewerUserId: b,
      });
      expect(history.entries).toHaveLength(2);
    });
  });

  it("leaves other members' points alone", async () => {
    await withDb(async (db) => {
      const { f, a, b } = await playedGroup(db);
      const kept = await pointsRow(db, f.groupId, b);
      await removePlayer(apiDb(db), {
        groupId: f.groupId,
        approverUserId: f.organizerId,
        userId: a,
      });
      expect(await pointsRow(db, f.groupId, b)).toEqual(kept);
    });
  });
});

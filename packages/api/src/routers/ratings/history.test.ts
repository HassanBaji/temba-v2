import { eq, sql, type SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  groupTierEvents,
  levelOverrides,
  ratingEvents,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { ratingHistoryLine } from "@repo/domain/rating-history";

import {
  addMember,
  footballGame,
  insertUser,
  playScore,
} from "#src/ratings/group-rated-match.test-support";
import { adjustTierPoints } from "#src/routers/groups/adjustTierPoints";
import { historyProcedure, ratingHistory } from "#src/routers/ratings/history";
import { setLevelAsVerifier } from "#src/routers/ratings/setLevelAsVerifier";
import { addVerifier } from "#src/routers/venues/addVerifier";

type ApiDb = Parameters<typeof ratingHistory>[0];

function apiDb(database: TestDatabase) {
  return database as unknown as ApiDb;
}

async function withDb(run: (database: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

function at(stamp: string): SQL {
  return sql`${sql.raw(`'${stamp}'`)}::timestamp`;
}

/**
 * A tier Group where `a` played a 5–3 win, was adjusted by the Organizer and
 * calibrated by a Verifier at the Game's Venue, plus one Rated Match each
 * for `a` and `b` written straight to `rating_events`.
 */
async function history(database: TestDatabase) {
  const f = await footballGame(database);
  await database
    .update(venues)
    .set({ name: "Fantasy FC" })
    .where(eq(venues.id, f.venueId));
  const a = await addMember(f, "Ahmed");
  const b = await addMember(f, "Bader");
  const c = await addMember(f, "Cyrus");
  const d = await addMember(f, "Dana");
  const matchId = await playScore(f, [a, b], [c, d], { slot1: 5, slot2: 3 });

  const adjusted = await adjustTierPoints(apiDb(database), {
    groupId: f.groupId,
    organizerUserId: f.organizerId,
    userId: a,
    points: 1150,
    reason: "back_from_injury",
    note: "Start him lower and let him climb.",
  });

  const verifier = await insertUser(database, "Yaser");
  await addVerifier(database, {
    venueId: f.venueId,
    userId: verifier.id,
    kind: "coach",
    grantedByUserId: null,
  });
  await setLevelAsVerifier(apiDb(database), {
    verifierUserId: verifier.id,
    targetUserId: a,
    sport: "football",
    ovr: 71,
    reason: "plays_above_results",
    note: "Assessed over two sessions.",
  });

  const rated = await database
    .insert(ratingEvents)
    .values(
      [a, b].map((userId) => ({
        userId,
        sport: "football" as const,
        matchId,
        outcomeScore: 1,
        weight: 1,
        muBefore: 1500,
        phiBefore: 200,
        sigmaBefore: 0.06,
        muAfter: 1530,
        phiAfter: 190,
        sigmaAfter: 0.06,
      })),
    )
    .returning({ id: ratingEvents.id, userId: ratingEvents.userId });

  return { f, a, b, verifier, adjusted, rated, matchId };
}

async function allPages(
  database: TestDatabase,
  args: Omit<Parameters<typeof ratingHistory>[1], "cursor">,
) {
  const ids: string[] = [];
  let cursor: Parameters<typeof ratingHistory>[1]["cursor"];
  for (let page = 0; page < 50; page += 1) {
    const result = await ratingHistory(apiDb(database), { ...args, cursor });
    ids.push(...result.entries.map((entry) => entry.id));
    if (!result.nextCursor) {
      return ids;
    }
    cursor = result.nextCursor;
  }
  throw new Error("The cursor never ran out");
}

describe("ratings.history (screen 1c)", () => {
  it("interleaves Rated Matches, Level overrides and tier moves by time and pages across a cursor", async () => {
    await withDb(async (db) => {
      const { a, rated } = await history(db);
      const ratedOfA = rated.find((row) => row.userId === a)!;
      const override = (
        await db.query.levelOverrides.findMany({
          where: eq(levelOverrides.userId, a),
        })
      )[0]!;
      const tier = await db.query.groupTierEvents.findMany({
        where: eq(groupTierEvents.userId, a),
      });
      const adjustment = tier.find((event) => event.kind === "adjustment")!;
      const game = tier.find((event) => event.kind === "game")!;
      const others = tier.filter(
        (event) => event.id !== adjustment.id && event.id !== game.id,
      );

      // The Rated Match and the override share one microsecond, as rows one
      // transaction writes do, so the id alone orders them.
      await db
        .update(groupTierEvents)
        .set({ createdAt: at("2026-10-05 09:00:00.000100") })
        .where(eq(groupTierEvents.id, adjustment.id));
      await db
        .update(ratingEvents)
        .set({ createdAt: at("2026-10-04 09:00:00.123456") })
        .where(eq(ratingEvents.id, ratedOfA.id));
      await db
        .update(levelOverrides)
        .set({ createdAt: at("2026-10-04 09:00:00.123456") })
        .where(eq(levelOverrides.id, override.id));
      await db
        .update(groupTierEvents)
        .set({ createdAt: at("2026-10-03 09:00:00.5") })
        .where(eq(groupTierEvents.id, game.id));
      for (const [index, event] of others.entries()) {
        await db
          .update(groupTierEvents)
          .set({ createdAt: at(`2026-10-0${2 - index} 09:00:00`) })
          .where(eq(groupTierEvents.id, event.id));
      }

      const tied = [ratedOfA.id, override.id].sort().reverse();
      const expected = [
        adjustment.id,
        ...tied,
        game.id,
        ...others.map((event) => event.id),
      ];

      const whole = await ratingHistory(apiDb(db), {
        userId: a,
        ladder: "all",
      });
      expect(whole.entries.map((entry) => entry.id)).toEqual(expected);
      expect(whole.nextCursor).toBeNull();

      for (let limit = 1; limit <= expected.length; limit += 1) {
        expect(await allPages(db, { userId: a, ladder: "all", limit })).toEqual(
          expected,
        );
      }

      expect(
        await allPages(db, { userId: a, ladder: "level", limit: 1 }),
      ).toEqual(tied);
      expect(
        await allPages(db, { userId: a, ladder: "tier", limit: 1 }),
      ).toEqual([adjustment.id, game.id, ...others.map((event) => event.id)]);
    });
  });

  it("reads a Verifier's calibration with the name and Venue, and an Organizer's adjustment as set by an organizer", async () => {
    await withDb(async (db) => {
      const { a } = await history(db);
      const result = await ratingHistory(apiDb(db), {
        userId: a,
        ladder: "all",
      });

      const override = result.entries.find(
        (entry) => entry.kind === "level_override",
      )!;
      expect(override).toMatchObject({
        setByRole: "verifier",
        setBy: { name: "Yaser" },
        venueName: "Fantasy FC",
        reason: "plays_above_results",
        note: "Assessed over two sessions.",
      });
      expect(ratingHistoryLine(override, a, "en")).toMatchObject({
        icon: { kind: "override" },
        title: "Level calibrated by a verifier",
        detail: "Football, 65 to 71",
        byline:
          "Yaser (Fantasy FC), Playing above this: “Assessed over two sessions.”",
        after: "71",
      });

      const adjustment = result.entries.find(
        (entry) => entry.kind === "tier_adjustment",
      )!;
      const line = ratingHistoryLine(adjustment, a, "en");
      expect(line).toMatchObject({
        title: "Tier points set by an organizer",
        after: "1,150",
        byline:
          "organizer, Back from a break: “Start him lower and let him climb.”",
      });
      expect(line.detail).toMatch(/^Thursday Football, 1,2\d\d to 1,150$/);
    });
  });

  it("never reads another player's history", async () => {
    await withDb(async (db) => {
      const { a, b, rated } = await history(db);
      const ofB = await ratingHistory(apiDb(db), { userId: b, ladder: "all" });
      const ids = ofB.entries.map((entry) => entry.id);
      expect(ids).toContain(rated.find((row) => row.userId === b)!.id);
      expect(ids).not.toContain(rated.find((row) => row.userId === a)!.id);
      expect(
        ofB.entries.some(
          (entry) =>
            entry.kind === "level_override" || entry.kind === "tier_adjustment",
        ),
      ).toBe(false);
      expect(ofB.viewerUserId).toBe(b);

      const [input] = historyProcedure._def.inputs as [
        { parse: (value: unknown) => unknown },
      ];
      expect(input.parse({ ladder: "all", userId: a })).toEqual({
        ladder: "all",
      });
    });
  });

  it("returns nothing on the Rank filter, and no tier on padel", async () => {
    await withDb(async (db) => {
      const { a } = await history(db);
      expect(
        await ratingHistory(apiDb(db), { userId: a, ladder: "rank" }),
      ).toEqual({ viewerUserId: a, entries: [], nextCursor: null });
      expect(
        (
          await ratingHistory(apiDb(db), {
            userId: a,
            ladder: "tier",
            sport: "padel",
          })
        ).entries,
      ).toEqual([]);
      const football = await ratingHistory(apiDb(db), {
        userId: a,
        ladder: "level",
        sport: "football",
      });
      expect(football.entries.map((entry) => entry.kind).sort()).toEqual([
        "level_match",
        "level_override",
      ]);
    });
  });
});

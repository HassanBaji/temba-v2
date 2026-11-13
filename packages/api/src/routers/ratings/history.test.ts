import { eq, sql, type SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  groupTierEvents,
  levelOverrides,
  matches,
  ratingEvents,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { muFromOvr } from "@repo/domain/football-ovr";
import {
  ratingHistoryLine,
  type RatingHistoryItemData,
} from "@repo/domain/rating-history";

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
  key: (entry: RatingHistoryItemData) => string = (entry) => entry.id,
) {
  const ids: string[] = [];
  let cursor: Parameters<typeof ratingHistory>[1]["cursor"];
  for (let page = 0; page < 50; page += 1) {
    const result = await ratingHistory(apiDb(database), { ...args, cursor });
    ids.push(...result.entries.map(key));
    if (!result.nextCursor) {
      return ids;
    }
    cursor = result.nextCursor;
  }
  throw new Error("The cursor never ran out");
}

function kindAndId(entry: RatingHistoryItemData) {
  return `${entry.kind}:${entry.id}`;
}

/**
 * Rated Matches for `userId` written straight to `rating_events`, one a day
 * from `day`, each with the φ it took the Level from and to.
 */
async function ratedMatches(
  database: TestDatabase,
  args: {
    gameId: string;
    userId: string;
    sport: "padel" | "football";
    phis: [number, number][];
    day: number;
  },
) {
  const ids: string[] = [];
  for (const [index, [phiBefore, phiAfter]] of args.phis.entries()) {
    const [match] = await database
      .insert(matches)
      .values({ gameId: args.gameId })
      .returning({ id: matches.id });
    const day = String(args.day + index).padStart(2, "0");
    const [event] = await database
      .insert(ratingEvents)
      .values({
        userId: args.userId,
        sport: args.sport,
        matchId: match!.id,
        outcomeScore: 1,
        weight: 1,
        muBefore: muFromOvr(60 + index),
        phiBefore,
        sigmaBefore: 0.06,
        muAfter: muFromOvr(61 + index),
        phiAfter,
        sigmaAfter: 0.06,
        createdAt: at(`2026-09-${day} 09:00:00.250`),
      })
      .returning({ id: ratingEvents.id });
    ids.push(event!.id);
  }
  return ids;
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

  it("marks Level confirmed once per sport, just before the Match that took it out of Provisional, and pages across it", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      const p = await addMember(f, "Parveen");
      const football = await ratedMatches(db, {
        gameId: f.gameId,
        userId: p,
        sport: "football",
        phis: [
          [350, 320],
          [320, 290],
          [290, 260],
          [260, 230],
          [230, 150],
          [150, 150],
        ],
        day: 1,
      });
      // Padel's φ crosses at the fourth Match, but the Level confirms on the
      // fifth Rated Match in a Verified Group (ADR-0074).
      const padel = await ratedMatches(db, {
        gameId: f.gameId,
        userId: p,
        sport: "padel",
        phis: [
          [350, 290],
          [290, 250],
          [250, 215],
          [215, 196],
          [230, 205],
          [205, 192],
        ],
        day: 10,
      });

      const whole = await ratingHistory(apiDb(db), {
        userId: p,
        ladder: "level",
      });
      const expected = [
        ...[...padel]
          .reverse()
          .flatMap((id) =>
            id === padel[4]
              ? [`level_confirmed:${id}`, `level_match:${id}`]
              : [`level_match:${id}`],
          ),
        ...[...football]
          .reverse()
          .flatMap((id) =>
            id === football[4]
              ? [`level_confirmed:${id}`, `level_match:${id}`]
              : [`level_match:${id}`],
          ),
      ];
      expect(whole.entries.map(kindAndId)).toEqual(expected);

      const confirmed = whole.entries.filter(
        (entry) => entry.kind === "level_confirmed",
      );
      expect(confirmed).toEqual([
        {
          kind: "level_confirmed",
          id: padel[4],
          at: new Date("2026-09-14T09:00:00.250Z"),
          sport: "padel",
          muAfter: muFromOvr(65),
          matchesCounted: 5,
        },
        {
          kind: "level_confirmed",
          id: football[4],
          at: new Date("2026-09-05T09:00:00.250Z"),
          sport: "football",
          muAfter: muFromOvr(65),
          matchesCounted: 5,
        },
      ]);
      expect(ratingHistoryLine(confirmed[1]!, p, "en")).toMatchObject({
        title: "Level confirmed",
        detail: "Fifth verified match. The track is no longer hatched",
        delta: "65",
        after: "set",
      });

      for (let limit = 1; limit <= expected.length; limit += 1) {
        expect(
          await allPages(db, { userId: p, ladder: "level", limit }, kindAndId),
        ).toEqual(expected);
      }
      expect(
        await allPages(
          db,
          { userId: p, ladder: "all", sport: "football", limit: 1 },
          kindAndId,
        ),
      ).toEqual(expected.slice(-7));
      expect(
        (await ratingHistory(apiDb(db), { userId: p, ladder: "tier" })).entries,
      ).toEqual([]);
    });
  });

  it("has no Level confirmed row when a Level override confirmed it first", async () => {
    await withDb(async (db) => {
      const { a } = await history(db);
      const f = await footballGame(db);
      await ratedMatches(db, {
        gameId: f.gameId,
        userId: a,
        sport: "football",
        phis: [
          [150, 150],
          [150, 150],
        ],
        day: 20,
      });
      const result = await ratingHistory(apiDb(db), {
        userId: a,
        ladder: "all",
      });
      expect(
        result.entries.some((entry) => entry.kind === "level_confirmed"),
      ).toBe(false);
    });
  });

  it("shows a change of fish an adjustment of someone else caused in the moved player's history", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      const members = await Promise.all(
        ["Ali", "Bader", "Cyrus", "Dana"].map((name) => addMember(f, name)),
      );
      const [ali, , , dana] = members;
      const start = Date.parse("2026-10-01T09:00:00Z");
      for (const [index, [userId, points]] of [
        [members[0]!, 1350],
        [members[1]!, 1300],
        [members[2]!, 1250],
        [members[3]!, 1100],
      ].entries()) {
        await adjustTierPoints(apiDb(db), {
          groupId: f.groupId,
          organizerUserId: f.organizerId,
          userId: userId as string,
          points: points as number,
          reason: "new_to_group",
          now: new Date(start + index * 60_000),
        });
      }
      await adjustTierPoints(apiDb(db), {
        groupId: f.groupId,
        organizerUserId: f.organizerId,
        userId: dana!,
        points: 1450,
        reason: "plays_above_results",
        now: new Date(start + 10 * 60_000),
      });

      const ofAli = await ratingHistory(apiDb(db), {
        userId: ali!,
        ladder: "tier",
      });
      const [latest] = ofAli.entries;
      expect(latest).toMatchObject({
        kind: "tier_band",
        bandBefore: "shark",
        bandAfter: "kanaad",
        place: 2,
        rankedCount: 4,
        memberCount: 5,
        points: 1350,
      });
      expect(ratingHistoryLine(latest!, ali!, "en")).toMatchObject({
        title: "Down to Kanaad",
        detail: "Thursday Football, now #2 of 5",
        delta: "tier",
        after: "1,350",
      });
      expect(
        ofAli.entries.filter((entry) => entry.kind === "tier_adjustment"),
      ).toHaveLength(1);
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

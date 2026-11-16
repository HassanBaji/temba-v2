import { and, eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { games, matches, ratingEvents, ratings } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { muFromBand, type LevelBand } from "@repo/domain/level";

import { applyLevelOverride } from "#src/ratings/apply-level-override";
import { applyRatedMatch } from "#src/ratings/apply-rated-match";
import { setUpMatch } from "#src/ratings/group-rated-match.test-support";
import { gameById } from "#src/routers/games/byId";
import { completeMatch } from "#src/routers/games/completeMatch";
import { reportWrongScore } from "#src/routers/games/reportWrongScore";

type ApiDb = Parameters<typeof completeMatch>[0];

async function withDb(run: (database: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

function api(database: TestDatabase) {
  return database as unknown as ApiDb & Parameters<typeof gameById>[0];
}

type PadelMatch = Awaited<ReturnType<typeof setUpMatch>>;
type Player = PadelMatch["a"];

const C_MU = muFromBand("C2");
const START = { mu: C_MU, phi: 250, sigma: 0.06, levelBand: "C2" as const };

/** a and b beat c and d 6–2 on a Game that counts for Temba Level, scored but not yet completed. */
async function scoredPadel(database: TestDatabase, previous?: PadelMatch) {
  return setUpMatch(
    database,
    { rated: true, groupRated: false },
    previous
      ? {
          players: [previous.a, previous.b, previous.c, previous.d],
          groupId: previous.groupId,
          venueId: previous.venueId,
        }
      : undefined,
  );
}

async function complete(database: TestDatabase, match: PadelMatch) {
  await completeMatch(api(database), {
    gameId: match.gameId,
    matchId: match.matchId,
    userId: match.a.id,
  });
}

/** Padel Ratings for the four at C, with c's Declared band. */
async function seedRatings(
  database: TestDatabase,
  match: PadelMatch,
  declared: Partial<Record<"a" | "b" | "c" | "d", LevelBand>> = { c: "C2" },
) {
  await database.insert(ratings).values(
    (["a", "b", "c", "d"] as const).map((seat) => ({
      userId: match[seat].id,
      sport: "padel" as const,
      ...START,
      declaredBand: declared[seat] ?? null,
    })),
  );
}

/** Puts the four back at the same Level, so c's loss and d's are the same loss. */
async function evenUp(
  database: TestDatabase,
  players: Player[],
  mu: number = C_MU,
) {
  await database
    .update(ratings)
    .set({ ...START, mu, lastRatedAt: null })
    .where(
      inArray(
        ratings.userId,
        players.map((player) => player.id),
      ),
    );
}

async function eventOf(
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

function moveOf(event: { muBefore: number; muAfter: number }) {
  return event.muAfter - event.muBefore;
}

function seats(match: PadelMatch) {
  return [match.a, match.b, match.c, match.d];
}

/** Plays `count` more Matches, the four evened up before each, and returns the last. */
async function playMore(
  database: TestDatabase,
  first: PadelMatch,
  count: number,
) {
  let last = first;
  for (let played = 0; played < count; played += 1) {
    await evenUp(database, seats(first));
    last = await scoredPadel(database, first);
    await complete(database, last);
  }
  return last;
}

describe("the Prove-it rule (ADR-0097)", () => {
  it("moves a declared C who lost to a pair at their level one and a half times as far on their fifth Verified Group Match, and stores the extra", async () => {
    await withDb(async (db) => {
      const first = await scoredPadel(db);
      await seedRatings(db, first);
      await complete(db, first);
      await playMore(db, first, 3);

      const fifth = await playMore(db, first, 1);
      const lost = await eventOf(db, fifth.matchId, first.c.id);
      const partner = await eventOf(db, fifth.matchId, first.d.id);

      const plainLoss = moveOf(partner);
      expect(plainLoss).toBeLessThan(0);
      expect(moveOf(lost)).toBeCloseTo(plainLoss * 1.5, 8);
      expect(lost.proveItPart).toBeCloseTo(plainLoss * 0.5, 8);
      expect(lost.reliabilityPart).toBeNull();
      expect(lost.reliabilityLossFactor).toBeNull();
      expect(partner.proveItPart).toBeNull();
      for (const winner of [first.a, first.b]) {
        expect((await eventOf(db, fifth.matchId, winner.id)).proveItPart).toBe(
          null,
        );
      }

      const sixth = await playMore(db, first, 1);
      const confirmed = await eventOf(db, sixth.matchId, first.c.id);
      expect(confirmed.proveItPart).toBeNull();
      expect(moveOf(confirmed)).toBe(
        moveOf(await eventOf(db, sixth.matchId, first.d.id)),
      );
    });
  });

  it("moves the partner and both opponents exactly as a Match without the rule", async () => {
    async function playedEvents(declared: Partial<Record<"c", LevelBand>>) {
      let events: Awaited<ReturnType<typeof eventOf>>[] = [];
      await withDb(async (db) => {
        const match = await scoredPadel(db);
        await seedRatings(db, match, declared);
        await complete(db, match);
        events = await Promise.all(
          seats(match).map((player) => eventOf(db, match.matchId, player.id)),
        );
      });
      return events;
    }
    const covered = await playedEvents({ c: "C2" });
    const plain = await playedEvents({});

    for (const seat of [0, 1, 3]) {
      expect(covered[seat]?.muAfter).toBe(plain[seat]?.muAfter);
      expect(covered[seat]?.phiAfter).toBe(plain[seat]?.phiAfter);
      expect(covered[seat]?.sigmaAfter).toBe(plain[seat]?.sigmaAfter);
      expect(covered[seat]?.proveItPart).toBeNull();
    }
    const c = covered[2]!;
    expect(c.muAfter - (c.proveItPart ?? 0)).toBeCloseTo(plain[2]!.muAfter, 8);
    expect(c.phiAfter).toBe(plain[2]!.phiAfter);
  });

  it("adds nothing on a win, to a D+ or C- or no Declared band, or on a loss to a much stronger pair", async () => {
    await withDb(async (db) => {
      const match = await scoredPadel(db);
      await seedRatings(db, match, { a: "B2", c: "C3", d: "D1" });
      await complete(db, match);
      for (const player of seats(match)) {
        expect(
          (await eventOf(db, match.matchId, player.id)).proveItPart,
        ).toBeNull();
      }

      await db
        .update(ratings)
        .set({ declaredBand: "C2" })
        .where(eq(ratings.userId, match.c.id));
      await evenUp(db, [match.c, match.d]);
      await evenUp(db, [match.a, match.b], C_MU + 500);
      const lopsided = await scoredPadel(db, match);
      await complete(db, lopsided);
      expect(
        (await eventOf(db, lopsided.matchId, match.c.id)).proveItPart,
      ).toBeNull();
    });
  });

  it("adds nothing on any Match after a Level override", async () => {
    await withDb(async (db) => {
      const match = await scoredPadel(db);
      await seedRatings(db, match);
      await applyLevelOverride(api(db), {
        sport: "padel",
        setterUserId: match.a.id,
        setByRole: "operator",
        targetUserId: match.c.id,
        groupId: null,
        level: 3,
        reason: "new_to_group",
      });
      await evenUp(db, seats(match));
      await complete(db, match);

      const lost = await eventOf(db, match.matchId, match.c.id);
      expect(lost.proveItPart).toBeNull();
      expect(moveOf(lost)).toBe(
        moveOf(await eventOf(db, match.matchId, match.d.id)),
      );
    });
  });

  it("takes the larger of its factor and Reliability's, splits the extra between the two, and stores the Reliability factor", async () => {
    await withDb(async (db) => {
      const match = await scoredPadel(db);
      await seedRatings(db, match);
      await db
        .update(ratings)
        .set({ reliability: 60 })
        .where(inArray(ratings.userId, [match.a.id, match.c.id]));
      await complete(db, match);

      const lost = await eventOf(db, match.matchId, match.c.id);
      const plainLoss = moveOf(await eventOf(db, match.matchId, match.d.id));
      // At 60 Reliability a loss costs 1.2 times; the rule lifts it to 1.5.
      expect(moveOf(lost)).toBeCloseTo(plainLoss * 1.5, 8);
      expect(lost.reliabilityPart).toBeCloseTo(plainLoss * 0.2, 8);
      expect(lost.proveItPart).toBeCloseTo(plainLoss * 0.3, 8);
      expect(lost.reliabilityLossFactor).toBeCloseTo(1.2, 12);

      const won = await eventOf(db, match.matchId, match.a.id);
      expect(won.reliabilityLossFactor).toBeCloseTo(1.2, 12);
      expect(won.reliabilityPart).toBeNull();
      expect(
        (await eventOf(db, match.matchId, match.d.id)).reliabilityLossFactor,
      ).toBeNull();
    });
  });

  it("never multiplies with Reliability at its lowest", async () => {
    await withDb(async (db) => {
      const match = await scoredPadel(db);
      await seedRatings(db, match);
      await db
        .update(ratings)
        .set({ reliability: 0 })
        .where(eq(ratings.userId, match.c.id));
      await complete(db, match);

      const lost = await eventOf(db, match.matchId, match.c.id);
      const plainLoss = moveOf(await eventOf(db, match.matchId, match.d.id));
      expect(moveOf(lost)).toBeCloseTo(plainLoss * 1.5, 8);
      expect(lost.proveItPart).toBeNull();
      expect(lost.reliabilityLossFactor).toBe(1.5);
    });
  });

  it("applies on a Public Game", async () => {
    await withDb(async (db) => {
      const match = await scoredPadel(db);
      await seedRatings(db, match);
      const [game] = await db
        .update(games)
        .set({ isPublic: true, groupId: null })
        .where(eq(games.id, match.gameId))
        .returning();
      const matchRow = await db.query.matches.findFirst({
        where: eq(matches.id, match.matchId),
      });
      if (!game || !matchRow) {
        throw new Error("Expected the Game and its Match");
      }
      await applyRatedMatch(api(db), game, matchRow, "slot1");

      const lost = await eventOf(db, match.matchId, match.c.id);
      expect(lost.weight).toBe(1);
      expect(moveOf(lost)).toBeCloseTo(
        moveOf(await eventOf(db, match.matchId, match.d.id)) * 1.5,
        8,
      );
    });
  });

  it("names the declared band on the played Game, for the player it covered only", async () => {
    await withDb(async (db) => {
      const match = await scoredPadel(db);
      await seedRatings(db, match);
      await complete(db, match);

      const covered = await gameById(api(db), {
        gameId: match.gameId,
        userId: match.c.id,
      });
      const lost = await eventOf(db, match.matchId, match.c.id);
      expect(covered.ratingImpact?.proveIt).toEqual({
        part: lost.proveItPart,
        declaredBand: "C2",
      });

      const partner = await gameById(api(db), {
        gameId: match.gameId,
        userId: match.d.id,
      });
      expect(partner.ratingImpact?.proveIt).toBeNull();
    });
  });

  it("is taken back with the rest of the Match by a wrong-score report", async () => {
    await withDb(async (db) => {
      const match = await scoredPadel(db);
      await seedRatings(db, match);
      await complete(db, match);
      expect(
        (await eventOf(db, match.matchId, match.c.id)).proveItPart,
      ).not.toBeNull();

      await reportWrongScore(api(db), {
        gameId: match.gameId,
        matchId: match.matchId,
        userId: match.a.id,
      });

      const restored = await db.query.ratings.findMany({
        where: inArray(
          ratings.userId,
          seats(match).map((player) => player.id),
        ),
      });
      for (const row of restored) {
        expect({ mu: row.mu, phi: row.phi, sigma: row.sigma }).toEqual({
          mu: START.mu,
          phi: START.phi,
          sigma: START.sigma,
        });
      }
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, match.matchId),
        }),
      ).toEqual([]);
    });
  });
});

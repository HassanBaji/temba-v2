import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { ratings, user } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { INITIAL_MU, INITIAL_PHI, muFromBand } from "@repo/domain/level";

import { applyLevelOverride } from "#src/ratings/apply-level-override";
import { setUpMatch } from "#src/ratings/group-rated-match.test-support";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { loadRatingsMe } from "#src/routers/ratings/me";
import { selfDeclareRating } from "#src/routers/ratings/selfDeclare";

type ApiDb = Parameters<typeof selfDeclareRating>[0];

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

async function insertUser(database: TestDatabase, label: string) {
  const [row] = await database
    .insert(user)
    .values({ name: label, email: `${label}-${crypto.randomUUID()}@x.com` })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row.id;
}

async function ratingOf(
  database: TestDatabase,
  userId: string,
  sport: "padel" | "football",
) {
  return database.query.ratings.findFirst({
    where: and(eq(ratings.userId, userId), eq(ratings.sport, sport)),
  });
}

describe("selfDeclareRating", () => {
  it("starts a padel declaration at the band's midpoint and φ, and keeps the Declared band", async () => {
    await withDb(async (db) => {
      for (const [band, phi] of [
        ["D3", 150],
        ["D1", 150],
        ["C3", 200],
        ["C2", 250],
        ["A", 250],
      ] as const) {
        const userId = await insertUser(db, band);
        await selfDeclareRating(apiDb(db), userId, "padel", band);
        expect(await ratingOf(db, userId, "padel")).toMatchObject({
          mu: muFromBand(band),
          phi,
          levelBand: band,
          declaredBand: band,
        });
      }
    });
  });

  it('starts "I don\'t know" at μ 1500 and φ 350 with no Declared band', async () => {
    await withDb(async (db) => {
      const userId = await insertUser(db, "unknown");
      await selfDeclareRating(apiDb(db), userId, "padel", "unknown");
      expect(await ratingOf(db, userId, "padel")).toMatchObject({
        mu: INITIAL_MU,
        phi: INITIAL_PHI,
        levelBand: "C2",
        declaredBand: null,
      });
    });
  });

  it("starts a football self-placement at φ 350, Provisional as before", async () => {
    await withDb(async (db) => {
      const userId = await insertUser(db, "football");
      const view = await selfDeclareRating(apiDb(db), userId, "football", "D3");
      expect(await ratingOf(db, userId, "football")).toMatchObject({
        mu: muFromBand("D3"),
        phi: INITIAL_PHI,
        declaredBand: "D3",
      });
      expect(view.provisional).toBe(true);
    });
  });

  it("returns a new D declarer as Provisional with none of five played, as ratings.me reads it", async () => {
    await withDb(async (db) => {
      const userId = await insertUser(db, "d");
      const view = await selfDeclareRating(apiDb(db), userId, "padel", "D3");
      expect(view).toMatchObject({
        provisional: true,
        ratedMatchesRemaining: 5,
      });

      const me = await loadRatingsMe(apiDb(db), { userId, sport: "padel" });
      expect(me.rating).toMatchObject({
        provisional: true,
        ratedMatchesRemaining: 5,
      });
    });
  });

  it("keeps the Declared band through a Rated Match and a Level override", async () => {
    await withDb(async (db) => {
      const m = await setUpMatch(db, { rated: true, groupRated: false });
      for (const [player, band] of [
        [m.a, "D3"],
        [m.b, "C3"],
        [m.c, "C2"],
        [m.d, "B1"],
      ] as const) {
        await selfDeclareRating(apiDb(db), player.id, "padel", band);
      }
      for (const player of [m.b, m.c, m.d]) {
        await confirmMatchResult(apiDb(db), {
          gameId: m.gameId,
          matchId: m.matchId,
          userId: player.id,
        });
      }

      const afterMatch = await ratingOf(db, m.a.id, "padel");
      expect(afterMatch?.lastRatedAt).toBeInstanceOf(Date);
      expect(afterMatch?.mu).toBeGreaterThan(muFromBand("D3"));
      expect(afterMatch?.declaredBand).toBe("D3");

      await applyLevelOverride(apiDb(db), {
        sport: "padel",
        setterUserId: m.b.id,
        setByRole: "operator",
        targetUserId: m.a.id,
        groupId: null,
        level: 4,
        reason: "plays_above_results",
      });
      expect(await ratingOf(db, m.a.id, "padel")).toMatchObject({
        levelBand: "C1",
        declaredBand: "D3",
      });
    });
  });
});

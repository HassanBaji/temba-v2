import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { games, groupTierPoints, ratings } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { balancedSides } from "@repo/domain/football-board";
import { muFromLevel } from "@repo/domain/level";

import {
  addMember,
  footballGame,
  type FootballFixture,
} from "#src/ratings/group-rated-match.test-support";
import { footballBoard } from "#src/routers/games/footballBoard";

/** Eight ranked members of the tier Group, all on the same Temba Level. */
const RANKED_POINTS = [1412, 1356, 1301, 1248, 1214, 1180, 1160, 1064];

async function setLevel(database: TestDatabase, userId: string, level: number) {
  await database.insert(ratings).values({
    userId,
    sport: "football",
    mu: muFromLevel(level),
    phi: 350,
    sigma: 0.06,
    levelBand: "C2",
  });
}

async function seedRoster(f: FootballFixture) {
  const ranked: string[] = [];
  for (const [index, points] of RANKED_POINTS.entries()) {
    const userId = await addMember(f, `ranked${index}`);
    ranked.push(userId);
    await setLevel(f.db, userId, 3);
    await f.db.insert(groupTierPoints).values({
      groupId: f.groupId,
      userId,
      points,
      gamesCounted: 8,
    });
  }
  const newcomer = await addMember(f, "newcomer");
  await setLevel(f.db, newcomer, 4.4);
  await f.db.insert(groupTierPoints).values({
    groupId: f.groupId,
    userId: newcomer,
    points: 1200,
    gamesCounted: 2,
  });
  return { ranked, newcomer };
}

function playerOf(
  board: Awaited<ReturnType<typeof footballBoard>>,
  userId: string,
) {
  const player = board.players.find((entry) => entry.userId === userId);
  if (!player) {
    throw new Error("Expected the player on the board");
  }
  return player;
}

describe("games.footballBoard on a tier Group", () => {
  it("gives every player their tier and balances on Tier points", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await footballGame(db);
      const { ranked } = await seedRoster(f);
      const board = await footballBoard(db, {
        gameId: f.gameId,
        userId: f.organizerId,
      });

      expect(playerOf(board, ranked[0]!)).toMatchObject({
        balanceStrength: 1412,
        tier: { band: "shark", place: 1, points: 1412, provisional: false },
      });
      expect(playerOf(board, ranked[7]!).tier).toMatchObject({
        band: "safi",
        place: 8,
      });
      expect(
        ranked.map((userId) => playerOf(board, userId).balanceStrength),
      ).toEqual(RANKED_POINTS);
    } finally {
      await close();
    }
  });

  it("places a Provisional member by the start hint, not by 1,200", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await footballGame(db);
      const { newcomer } = await seedRoster(f);
      const board = await footballBoard(db, {
        gameId: f.gameId,
        userId: f.organizerId,
      });

      // Median of the ranked points is 1,231; a Level of 4.4 against their
      // 3.0 is 11.8 OVR higher, ten points each.
      expect(playerOf(board, newcomer)).toMatchObject({
        balanceStrength: 1349,
        tier: { provisional: true, place: null, band: null, points: 1200 },
      });

      const sides = balancedSides(board.players);
      const strongestFirst = [...board.players].sort(
        (left, right) =>
          (right.balanceStrength ?? 0) - (left.balanceStrength ?? 0),
      );
      expect(strongestFirst[2]?.userId).toBe(newcomer);
      // A, B, B, A: the third strongest goes with the second.
      expect(sides[newcomer]).toBe(sides[strongestFirst[1]!.userId]);
      expect(sides[newcomer]).not.toBe(sides[strongestFirst[0]!.userId]);
    } finally {
      await close();
    }
  });

  it("shows a member no strength and no Provisional points of others", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await footballGame(db);
      const { ranked, newcomer } = await seedRoster(f);
      const asMember = await footballBoard(db, {
        gameId: f.gameId,
        userId: ranked[3]!,
      });

      expect(
        asMember.players.every((player) => player.balanceStrength === null),
      ).toBe(true);
      expect(playerOf(asMember, newcomer).tier).toMatchObject({
        provisional: true,
        points: null,
      });
      expect(playerOf(asMember, ranked[0]!).tier?.points).toBe(1412);

      const asNewcomer = await footballBoard(db, {
        gameId: f.gameId,
        userId: newcomer,
      });
      expect(playerOf(asNewcomer, newcomer).tier?.points).toBe(1200);
    } finally {
      await close();
    }
  });
});

describe("games.footballBoard outside a tier Group", () => {
  it("leaves a Verified Group's Game to the Level band", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await footballGame(db, { verified: true });
      const { ranked } = await seedRoster(f);
      const board = await footballBoard(db, {
        gameId: f.gameId,
        userId: f.organizerId,
      });

      const player = playerOf(board, ranked[0]!);
      expect(player.tier).toBeNull();
      expect(player.balanceStrength).toBeNull();
      expect(Object.keys(balancedSides(board.players))).toHaveLength(
        board.players.length,
      );
    } finally {
      await close();
    }
  });

  it("leaves a groupless Game to the Level band", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await footballGame(db);
      const { ranked } = await seedRoster(f);
      await db
        .update(games)
        .set({ groupId: null })
        .where(eq(games.id, f.gameId));
      const board = await footballBoard(db, {
        gameId: f.gameId,
        userId: f.organizerId,
      });

      expect(
        board.players.every(
          (player) => player.tier === null && player.balanceStrength === null,
        ),
      ).toBe(true);
      expect(playerOf(board, ranked[0]!).levelBand).toBe("C2");
    } finally {
      await close();
    }
  });
});

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  games,
  groupTierPoints,
  ratings,
  venueVerifiers,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { balancedSides } from "@repo/domain/football-board";
import { muFromOvr } from "@repo/domain/football-ovr";
import { muFromLevel } from "@repo/domain/level";

import {
  addMember,
  footballGame,
  insertUser,
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

describe("games.footballBoard for a Verifier (ADR-0072)", () => {
  it("opens a private Group Game at the Verifier's Venue without the Group's tiers or anything to do", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await footballGame(db);
      const { ranked } = await seedRoster(f);
      const verifier = await insertUser(db, "verifier");
      await db
        .insert(venueVerifiers)
        .values({ venueId: f.venueId, userId: verifier.id, kind: "referee" });

      const board = await footballBoard(db, {
        gameId: f.gameId,
        userId: verifier.id,
      });

      expect(board.players.map((player) => player.userId)).toEqual(
        expect.arrayContaining(ranked),
      );
      expect(
        board.players.every(
          (player) => player.tier === null && player.balanceStrength === null,
        ),
      ).toBe(true);
      expect(board.isOrganizer).toBe(false);
      expect(board.viewer).toEqual({
        sideIndex: null,
        canMakeTeams: false,
        canEnterScore: false,
        canConfirm: false,
        canConfirmAsOrganizer: false,
        canConfirmForSlots: [],
      });
    } finally {
      await close();
    }
  });

  it("stays closed to a Verifier of another Venue", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await footballGame(db);
      const [elsewhere] = await db
        .insert(venues)
        .values({ name: "Elsewhere", city: "Manama", country: "BH" })
        .returning({ id: venues.id });
      const verifier = await insertUser(db, "verifier");
      await db.insert(venueVerifiers).values({
        venueId: elsewhere!.id,
        userId: verifier.id,
        kind: "referee",
      });

      await expect(
        footballBoard(db, { gameId: f.gameId, userId: verifier.id }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    } finally {
      await close();
    }
  });
});

describe("games.footballBoard outside a tier Group", () => {
  async function seedOvrRoster(f: FootballFixture) {
    const ovrs = [84, 78, 72, 61, 55];
    const rated: string[] = [];
    for (const [index, ovr] of ovrs.entries()) {
      const userId = await addMember(f, `rated${index}`);
      rated.push(userId);
      await f.db.insert(ratings).values({
        userId,
        sport: "football",
        mu: muFromOvr(ovr),
        phi: 150,
        sigma: 0.06,
        levelBand: "C2",
      });
    }
    const unrated = await addMember(f, "unrated");
    return { rated, unrated, ovrs };
  }

  it("balances a Verified Group's Game on OVR for every player", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await footballGame(db, { verified: true });
      const { rated, unrated, ovrs } = await seedOvrRoster(f);
      const board = await footballBoard(db, {
        gameId: f.gameId,
        userId: f.organizerId,
      });

      expect(board.balanceOn).toBe("ovr");
      expect(rated.map((userId) => playerOf(board, userId).ovr)).toEqual(ovrs);
      expect(
        rated.map((userId) => playerOf(board, userId).balanceStrength),
      ).toEqual(ovrs);
      expect(playerOf(board, unrated)).toMatchObject({
        ovr: null,
        balanceStrength: 65,
        tier: null,
      });
      expect(
        board.players.every(
          (player) => player.tier === null && player.balanceStrength != null,
        ),
      ).toBe(true);

      const sides = balancedSides(board.players);
      expect(sides[rated[0]!]).not.toBe(sides[rated[1]!]);
      expect(sides[rated[1]!]).toBe(sides[rated[2]!]);
    } finally {
      await close();
    }
  });

  it("balances a groupless Game on OVR", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await footballGame(db);
      const { rated, ovrs } = await seedOvrRoster(f);
      await db
        .update(games)
        .set({ groupId: null })
        .where(eq(games.id, f.gameId));
      const board = await footballBoard(db, {
        gameId: f.gameId,
        userId: f.organizerId,
      });

      expect(board.balanceOn).toBe("ovr");
      expect(
        rated.map((userId) => playerOf(board, userId).balanceStrength),
      ).toEqual(ovrs);
      expect(board.players.every((player) => player.tier === null)).toBe(true);
      expect(playerOf(board, rated[0]!).levelBand).toBe("C2");
    } finally {
      await close();
    }
  });

  it("gives a player who cannot make teams the OVR but no strength", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await footballGame(db, { verified: true });
      const { rated } = await seedOvrRoster(f);
      const asMember = await footballBoard(db, {
        gameId: f.gameId,
        userId: rated[3]!,
      });

      expect(playerOf(asMember, rated[0]!).ovr).toBe(84);
      expect(
        asMember.players.every((player) => player.balanceStrength === null),
      ).toBe(true);
    } finally {
      await close();
    }
  });
});

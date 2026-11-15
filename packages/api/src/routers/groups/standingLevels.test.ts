import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import {
  games,
  groupMembers,
  groupSeasons,
  groupTierEvents,
  groupTierPoints,
  groups,
  kingPlaceAwards,
  levelOverrides,
  matches,
  ratingEvents,
  ratings,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { muFromOvr } from "@repo/domain/football-ovr";
import { INITIAL_PHI, INITIAL_SIGMA, muFromLevel } from "@repo/domain/level";
import type { LevelBand } from "@repo/domain/level-bands";

import { standingLevels } from "#src/routers/groups/standingLevels";

type ApiDb = Parameters<typeof standingLevels>[0];

const NOW = new Date("2026-12-05T10:00:00Z");

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

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${name}@example.com` })
    .returning({ id: user.id });
  return row!.id;
}

async function insertGroup(
  database: TestDatabase,
  args: {
    createdBy: string;
    members: string[];
    sport: "padel" | "football";
    verified: boolean;
  },
) {
  const [row] = await database
    .insert(groups)
    .values({
      name: "Tuesday Night",
      createdBy: args.createdBy,
      sport: args.sport,
      verifiedAt: args.verified ? new Date("2026-01-01T00:00:00Z") : null,
    })
    .returning({ id: groups.id });
  for (const userId of [args.createdBy, ...args.members]) {
    await database.insert(groupMembers).values({ groupId: row!.id, userId });
  }
  return row!.id;
}

async function insertSeason(
  database: TestDatabase,
  args: {
    groupId: string;
    name: string;
    startsOn: string;
    endsOn: string;
    createdBy: string;
  },
) {
  const [row] = await database
    .insert(groupSeasons)
    .values(args)
    .returning({ id: groupSeasons.id });
  return row!.id;
}

async function insertRating(
  database: TestDatabase,
  args: {
    userId: string;
    sport: "padel" | "football";
    mu: number;
    levelBand: LevelBand;
  },
) {
  await database.insert(ratings).values({
    ...args,
    phi: INITIAL_PHI,
    sigma: INITIAL_SIGMA,
  });
}

async function insertOverride(
  database: TestDatabase,
  args: {
    userId: string;
    setBy: string;
    sport: "padel" | "football";
    muBefore: number;
    bandBefore: LevelBand;
    muAfter: number;
    bandAfter: LevelBand;
    createdAt: Date;
  },
) {
  await database.insert(levelOverrides).values({
    userId: args.userId,
    sport: args.sport,
    setByUserId: args.setBy,
    setByRole: "operator",
    hadRating: true,
    muBefore: args.muBefore,
    phiBefore: INITIAL_PHI,
    sigmaBefore: INITIAL_SIGMA,
    levelBandBefore: args.bandBefore,
    muAfter: args.muAfter,
    phiAfter: INITIAL_PHI,
    sigmaAfter: INITIAL_SIGMA,
    levelBandAfter: args.bandAfter,
    createdAt: args.createdAt,
  });
}

async function insertGame(database: TestDatabase, createdBy: string) {
  const [venue] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Doha",
      country: "QA",
    })
    .returning({ id: venues.id });
  const [game] = await database
    .insert(games)
    .values({ name: "Tuesday", venueId: venue!.id, createdBy })
    .returning({ id: games.id });
  return game!.id;
}

type LevelMove = {
  userId: string;
  sport: "padel" | "football";
  muBefore: number;
  bandBefore: LevelBand;
  muAfter: number;
  createdAt: Date;
};

async function insertRatedMatch(
  database: TestDatabase,
  args: LevelMove & { createdBy: string },
) {
  const gameId = await insertGame(database, args.createdBy);
  const [match] = await database
    .insert(matches)
    .values({ gameId })
    .returning({ id: matches.id });
  await database.insert(ratingEvents).values({
    userId: args.userId,
    sport: args.sport,
    matchId: match!.id,
    outcomeScore: 1,
    weight: 1,
    muBefore: args.muBefore,
    phiBefore: INITIAL_PHI,
    sigmaBefore: INITIAL_SIGMA,
    muAfter: args.muAfter,
    phiAfter: INITIAL_PHI,
    sigmaAfter: INITIAL_SIGMA,
    levelBandBefore: args.bandBefore,
    createdAt: args.createdAt,
  });
}

async function insertPlaceAward(
  database: TestDatabase,
  args: LevelMove & { createdBy: string },
) {
  const gameId = await insertGame(database, args.createdBy);
  await database.insert(kingPlaceAwards).values({
    userId: args.userId,
    sport: args.sport,
    gameId,
    finalPlace: 1,
    wins: 3,
    fieldMu: args.muBefore,
    fieldPhi: INITIAL_PHI,
    hadRating: true,
    muBefore: args.muBefore,
    phiBefore: INITIAL_PHI,
    sigmaBefore: INITIAL_SIGMA,
    muAfter: args.muAfter,
    phiAfter: INITIAL_PHI,
    sigmaAfter: INITIAL_SIGMA,
    levelBandBefore: args.bandBefore,
    createdAt: args.createdAt,
  });
}

describe("standingLevels", () => {
  it("reads a Verified padel Group's Level now and at close, gained by Games only", async () => {
    await withDb(async (database) => {
      const owner = await insertUser(database, "owner");
      const noor = await insertUser(database, "noor");
      const khalil = await insertUser(database, "khalil");
      const groupId = await insertGroup(database, {
        createdBy: owner,
        members: [noor, khalil],
        sport: "padel",
        verified: true,
      });
      const autumn = await insertSeason(database, {
        groupId,
        name: "Season 1",
        startsOn: "2026-09-01",
        endsOn: "2026-09-30",
        createdBy: owner,
      });
      const winter = await insertSeason(database, {
        groupId,
        name: "Season 2",
        startsOn: "2026-11-01",
        endsOn: "2027-01-31",
        createdBy: owner,
      });
      await insertRating(database, {
        userId: noor,
        sport: "padel",
        mu: muFromLevel(3.75),
        levelBand: "C1",
      });
      await insertRating(database, {
        userId: khalil,
        sport: "padel",
        mu: muFromLevel(3.1),
        levelBand: "C2",
      });
      await insertRatedMatch(database, {
        createdBy: owner,
        userId: noor,
        sport: "padel",
        muBefore: muFromLevel(3.3),
        bandBefore: "C2",
        muAfter: muFromLevel(3.45),
        createdAt: new Date("2026-10-10T09:00:00Z"),
      });
      await insertRatedMatch(database, {
        createdBy: owner,
        userId: noor,
        sport: "padel",
        muBefore: muFromLevel(3.45),
        bandBefore: "C2",
        muAfter: muFromLevel(3.48),
        createdAt: new Date("2026-11-10T09:00:00Z"),
      });
      await insertOverride(database, {
        userId: noor,
        setBy: owner,
        sport: "padel",
        muBefore: muFromLevel(3.48),
        bandBefore: "C2",
        muAfter: muFromLevel(3.65),
        bandAfter: "C1",
        createdAt: new Date("2026-11-15T09:00:00Z"),
      });
      await insertPlaceAward(database, {
        createdBy: owner,
        userId: noor,
        sport: "padel",
        muBefore: muFromLevel(3.65),
        bandBefore: "C1",
        muAfter: muFromLevel(3.75),
        createdAt: new Date("2026-11-20T09:00:00Z"),
      });

      const current = await standingLevels(apiDb(database), {
        groupId,
        seasonId: winter,
        userId: khalil,
        now: NOW,
      });
      expect(current.ladder).toBe("level");
      const byUser = new Map(current.members.map((row) => [row.userId, row]));
      // Opened at 3.45; the override's +0.17 moves the start, so the gain is
      // the Rated Match's +0.03 and the Place award's +0.10.
      expect(byUser.get(noor)).toEqual({
        userId: noor,
        band: "C1",
        ovr: null,
        start: 362,
        end: 375,
        startBand: "C1",
        endBand: "C1",
      });
      expect(byUser.get(khalil)).toEqual(
        expect.objectContaining({ start: 310, end: 310, band: "C2" }),
      );
      expect(byUser.has(owner)).toBe(false);

      const closed = await standingLevels(apiDb(database), {
        groupId,
        seasonId: autumn,
        userId: khalil,
        now: NOW,
      });
      expect(closed.members.find((row) => row.userId === noor)).toEqual(
        expect.objectContaining({
          band: "C2",
          start: 330,
          end: 330,
          endBand: "C2",
        }),
      );

      const allTime = await standingLevels(apiDb(database), {
        groupId,
        seasonId: null,
        userId: khalil,
        now: NOW,
      });
      expect(allTime.members.find((row) => row.userId === noor)).toEqual(
        expect.objectContaining({ band: "C1", start: null, end: null }),
      );
    });
  });

  it("reads a Verified football Group in whole OVR, gained by Games only", async () => {
    await withDb(async (database) => {
      const owner = await insertUser(database, "owner");
      const groupId = await insertGroup(database, {
        createdBy: owner,
        members: [],
        sport: "football",
        verified: true,
      });
      const season = await insertSeason(database, {
        groupId,
        name: "Season 1",
        startsOn: "2026-11-01",
        endsOn: "2027-01-31",
        createdBy: owner,
      });
      await insertRating(database, {
        userId: owner,
        sport: "football",
        mu: muFromOvr(70),
        levelBand: "C1",
      });
      await insertOverride(database, {
        userId: owner,
        setBy: owner,
        sport: "football",
        muBefore: muFromOvr(66),
        bandBefore: "C2",
        muAfter: muFromOvr(68),
        bandAfter: "C1",
        createdAt: new Date("2026-11-15T09:00:00Z"),
      });
      await insertRatedMatch(database, {
        createdBy: owner,
        userId: owner,
        sport: "football",
        muBefore: muFromOvr(68),
        bandBefore: "C1",
        muAfter: muFromOvr(70),
        createdAt: new Date("2026-11-20T09:00:00Z"),
      });

      const result = await standingLevels(apiDb(database), {
        groupId,
        seasonId: season,
        userId: owner,
        now: NOW,
      });
      expect(result.members).toEqual([
        {
          userId: owner,
          band: null,
          ovr: 70,
          start: 68,
          end: 70,
          startBand: null,
          endBand: null,
        },
      ]);
    });
  });

  it("reads a tier Group's Tier points gained by Games and hides Provisional points from other members", async () => {
    await withDb(async (database) => {
      const owner = await insertUser(database, "owner");
      const ali = await insertUser(database, "ali");
      const sami = await insertUser(database, "sami");
      const groupId = await insertGroup(database, {
        createdBy: owner,
        members: [ali, sami],
        sport: "football",
        verified: false,
      });
      const season = await insertSeason(database, {
        groupId,
        name: "Season 1",
        startsOn: "2026-11-01",
        endsOn: "2027-01-31",
        createdBy: owner,
      });
      await database.insert(groupTierPoints).values([
        {
          groupId,
          userId: ali,
          points: 1300,
          gamesCounted: 7,
          confirmedAt: new Date("2026-11-20T09:00:00Z"),
          createdAt: new Date("2026-10-01T09:00:00Z"),
        },
        {
          groupId,
          userId: sami,
          points: 1215,
          gamesCounted: 2,
          createdAt: new Date("2026-11-10T09:00:00Z"),
        },
      ]);
      await database.insert(groupTierEvents).values([
        {
          groupId,
          userId: ali,
          kind: "game",
          delta: 30,
          pointsBefore: 1200,
          pointsAfter: 1230,
          createdAt: new Date("2026-10-20T09:00:00Z"),
        },
        {
          groupId,
          userId: ali,
          kind: "game",
          delta: 30,
          pointsBefore: 1230,
          pointsAfter: 1260,
          createdAt: new Date("2026-11-03T09:00:00Z"),
        },
        {
          groupId,
          userId: ali,
          kind: "adjustment",
          delta: 40,
          pointsBefore: 1260,
          pointsAfter: 1300,
          setByUserId: owner,
          createdAt: new Date("2026-11-20T09:00:00Z"),
        },
        {
          groupId,
          userId: sami,
          kind: "game",
          delta: 15,
          pointsBefore: 1200,
          pointsAfter: 1215,
          createdAt: new Date("2026-11-10T09:00:00Z"),
        },
      ]);

      const asSami = await standingLevels(apiDb(database), {
        groupId,
        seasonId: season,
        userId: sami,
        now: NOW,
      });
      expect(asSami.ladder).toBe("tier");
      const byUser = new Map(asSami.members.map((row) => [row.userId, row]));
      expect(byUser.get(ali)).toEqual(
        expect.objectContaining({ start: 1270, end: 1300 }),
      );
      expect(byUser.get(sami)).toEqual(
        expect.objectContaining({ start: 1200, end: 1215 }),
      );

      const asAli = await standingLevels(apiDb(database), {
        groupId,
        seasonId: season,
        userId: ali,
        now: NOW,
      });
      expect(asAli.members.find((row) => row.userId === sami)).toEqual(
        expect.objectContaining({ start: null, end: null }),
      );

      const asOrganizer = await standingLevels(apiDb(database), {
        groupId,
        seasonId: season,
        userId: owner,
        now: NOW,
      });
      expect(asOrganizer.members.find((row) => row.userId === sami)).toEqual(
        expect.objectContaining({ start: 1200, end: 1215 }),
      );
    });
  });

  it("has no ladder on a padel Group that is not Verified", async () => {
    await withDb(async (database) => {
      const owner = await insertUser(database, "owner");
      const groupId = await insertGroup(database, {
        createdBy: owner,
        members: [],
        sport: "padel",
        verified: false,
      });
      expect(
        await standingLevels(apiDb(database), {
          groupId,
          seasonId: null,
          userId: owner,
          now: NOW,
        }),
      ).toEqual({ ladder: null, sport: "padel", members: [] });
    });
  });

  it("refuses a viewer who is not a member", async () => {
    await withDb(async (database) => {
      const owner = await insertUser(database, "owner");
      const stranger = await insertUser(database, "stranger");
      const groupId = await insertGroup(database, {
        createdBy: owner,
        members: [],
        sport: "padel",
        verified: true,
      });
      const error = await standingLevels(apiDb(database), {
        groupId,
        seasonId: null,
        userId: stranger,
        now: NOW,
      }).then(
        () => null,
        (caught: unknown) => caught,
      );
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("FORBIDDEN");
    });
  });
});

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  MatchStatusEnum,
  courts,
  gameTeams,
  games,
  groups,
  matches,
  user,
  venues,
} from "@repo/db/schema";

import { addSet } from "~/server/api/routers/games/addSet";
import { gameById } from "~/server/api/routers/games/byId";
import { cancelMatch } from "~/server/api/routers/games/cancelMatch";
import { completeMatch } from "~/server/api/routers/games/completeMatch";
import { createGame } from "~/server/api/routers/games/create";
import { createTournament } from "~/server/api/routers/games/createTournament";
import { drawPools } from "~/server/api/routers/games/drawPools";
import { listPoolTables } from "~/server/api/routers/games/poolTables";
import { postPoolDraw } from "~/server/api/routers/games/postPoolDraw";
import { registerSeat } from "~/server/api/routers/games/registerSeat";
import { scoreSet } from "~/server/api/routers/games/scoreSet";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

async function insertUser(
  database: TestDatabase,
  email: string,
  name?: string,
) {
  const [row] = await database
    .insert(user)
    .values({ name: name ?? email.split("@")[0] ?? "User", email })
    .returning({ id: user.id, name: user.name });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertVenue(database: TestDatabase) {
  const [row] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Lisbon",
      country: "PT",
    })
    .returning({ id: venues.id });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

async function insertCourt(
  database: TestDatabase,
  venueId: string,
  name: string,
) {
  const [row] = await database
    .insert(courts)
    .values({ venueId, name })
    .returning({ id: courts.id, name: courts.name });
  if (!row) {
    throw new Error("Failed to insert court");
  }
  return row;
}

function identityShuffle<T>(items: readonly T[]): T[] {
  return [...items];
}

async function insertNamedUsers(
  database: TestDatabase,
  prefix: string,
  count: number,
) {
  const rows = [];
  for (let index = 0; index < count; index += 1) {
    rows.push(
      await insertUser(
        database,
        `${prefix}-${index}@example.com`,
        `${prefix}-${index + 1}`,
      ),
    );
  }
  return rows;
}

async function fillCompleteTeams(
  database: TestDatabase,
  gameId: string,
  players: { id: string }[],
  teamCount: number,
) {
  for (let index = 0; index < teamCount; index += 1) {
    const left = players[index * 2];
    const right = players[index * 2 + 1];
    if (!left || !right) {
      throw new Error("Not enough players to fill Game teams");
    }
    await registerSeat(database, {
      gameId,
      userId: left.id,
      sideIndex: index + 1,
      position: "left",
    });
    await registerSeat(database, {
      gameId,
      userId: right.id,
      sideIndex: index + 1,
      position: "right",
    });
  }
}

async function seedPostedTournament(
  database: TestDatabase,
  prefix: string,
  args?: { teamCount?: number; poolCount?: number },
) {
  const teamCount = args?.teamCount ?? 4;
  const poolCount = args?.poolCount ?? 1;
  const owner = await insertUser(database, `${prefix}-owner@example.com`);
  const venue = await insertVenue(database);
  const courtA = await insertCourt(database, venue.id, "Court 1");
  const courtB = await insertCourt(database, venue.id, "Court 2");
  const [group] = await database
    .insert(groups)
    .values({ name: `Group ${prefix}`, createdBy: owner.id })
    .returning({ id: groups.id });
  if (!group) {
    throw new Error("Failed to insert group");
  }
  const created = await createTournament(database, {
    createdBy: owner.id,
    name: "Autumn Friendly",
    groupId: group.id,
    isPublic: true,
    registrationMode: "individual",
    teamCount,
    poolCount,
    venueId: venue.id,
    courtIds: [courtA.id, courtB.id],
    windowStart: new Date("2026-09-20T10:00:00"),
    windowEnd: new Date("2026-09-20T16:00:00"),
  });
  const players = await insertNamedUsers(database, prefix, teamCount * 2);
  await fillCompleteTeams(database, created.id, players, teamCount);
  await drawPools(database, {
    gameId: created.id,
    organizerUserId: owner.id,
    shuffle: identityShuffle,
  });
  await postPoolDraw(database, {
    gameId: created.id,
    organizerUserId: owner.id,
  });
  return {
    owner,
    gameId: created.id,
    players,
  };
}

async function teamIdForSide(
  database: TestDatabase,
  gameId: string,
  sideIndex: number,
) {
  const teams = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, gameId),
  });
  const team = teams.find((item) => item.sideIndex === sideIndex);
  if (!team) {
    throw new Error(`Expected Game team on side ${sideIndex}`);
  }
  return team.id;
}

async function matchBetweenSides(
  database: TestDatabase,
  gameId: string,
  sideA: number,
  sideB: number,
) {
  const idA = await teamIdForSide(database, gameId, sideA);
  const idB = await teamIdForSide(database, gameId, sideB);
  const rows = await database.query.matches.findMany({
    where: eq(matches.gameId, gameId),
  });
  const match = rows.find(
    (row) =>
      (row.slot1GameTeamId === idA && row.slot2GameTeamId === idB) ||
      (row.slot1GameTeamId === idB && row.slot2GameTeamId === idA),
  );
  if (!match) {
    throw new Error(`Expected a Match between sides ${sideA} and ${sideB}`);
  }
  return match;
}

async function completeSets(
  database: TestDatabase,
  args: {
    gameId: string;
    matchId: string;
    organizerUserId: string;
    sets: { slot1GamesWon: number; slot2GamesWon: number }[];
  },
) {
  for (const set of args.sets) {
    const created = await addSet(database, {
      gameId: args.gameId,
      matchId: args.matchId,
      userId: args.organizerUserId,
    });
    await scoreSet(database, {
      gameId: args.gameId,
      matchId: args.matchId,
      setId: created.id,
      userId: args.organizerUserId,
      slot1GamesWon: set.slot1GamesWon,
      slot2GamesWon: set.slot2GamesWon,
    });
  }
  await completeMatch(database, {
    gameId: args.gameId,
    matchId: args.matchId,
    userId: args.organizerUserId,
  });
}

function dashRow(row: {
  played: number | null;
  won: number | null;
  drawn: number | null;
  lost: number | null;
}) {
  return {
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
  };
}

describe("listPoolTables", () => {
  it("shows every Pool, a part-played record, and an unplayed Game team as a dash", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedTournament(db, "part", {
        teamCount: 8,
        poolCount: 2,
      });
      const viewer = seeded.players[0];
      if (!viewer) {
        throw new Error("Expected a seated viewer");
      }
      const match = await matchBetweenSides(db, seeded.gameId, 1, 4);
      await completeSets(db, {
        gameId: seeded.gameId,
        matchId: match.id,
        organizerUserId: seeded.owner.id,
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 3 }],
      });

      const tables = await listPoolTables(db, {
        gameId: seeded.gameId,
        userId: viewer.id,
      });
      expect(tables).not.toBeNull();
      expect(tables?.pools.map((pool) => pool.poolIndex)).toEqual([1, 2]);
      expect(tables?.viewerPoolIndex).toBe(1);
      expect(tables?.finished).toBe(false);

      const poolOne = tables?.pools.find((pool) => pool.poolIndex === 1);
      const poolTwo = tables?.pools.find((pool) => pool.poolIndex === 2);
      expect(poolOne?.finished).toBe(false);
      expect(poolOne?.winnerGameTeamId).toBeNull();
      expect(poolTwo?.rows.every((row) => row.played == null)).toBe(true);

      const slot1Won =
        match.slot1GameTeamId === (await teamIdForSide(db, seeded.gameId, 1));
      const winnerId = slot1Won ? match.slot1GameTeamId : match.slot2GameTeamId;
      const loserId = slot1Won ? match.slot2GameTeamId : match.slot1GameTeamId;
      const rows = poolOne?.rows ?? [];
      expect(rows[0]?.gameTeamId).toBe(winnerId);
      expect(
        dashRow(rows[0] ?? { played: 0, won: 0, drawn: 0, lost: 0 }),
      ).toEqual({ played: 1, won: 1, drawn: 0, lost: 0 });
      expect(rows[1]?.gameTeamId).toBe(loserId);
      expect(
        dashRow(rows[1] ?? { played: 0, won: 0, drawn: 0, lost: 0 }),
      ).toEqual({ played: 1, won: 0, drawn: 0, lost: 1 });
      expect(
        dashRow(rows[2] ?? { played: 0, won: 0, drawn: 0, lost: 0 }),
      ).toEqual({ played: null, won: null, drawn: null, lost: null });
      expect(
        dashRow(rows[3] ?? { played: 0, won: 0, drawn: 0, lost: 0 }),
      ).toEqual({ played: null, won: null, drawn: null, lost: null });

      const viewerRound = poolOne?.viewerRounds.find(
        (round) => round.matchId === match.id,
      );
      expect(viewerRound?.scoreLabel).toBe(slot1Won ? "6-3" : "3-6");
      expect(viewerRound?.viewerOutcome).toBe(slot1Won ? "won" : "lost");
      expect(
        poolOne?.matches.some(
          (item) =>
            item.matchId !== match.id &&
            item.slot1GameTeamId !== winnerId &&
            item.slot2GameTeamId !== winnerId,
        ),
      ).toBe(true);
    } finally {
      await close();
    }
  });

  it("increments drawn for both Game teams and wins for neither", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedTournament(db, "drawn");
      const viewer = seeded.players[0];
      if (!viewer) {
        throw new Error("Expected a seated viewer");
      }
      const match = await matchBetweenSides(db, seeded.gameId, 1, 4);
      await completeSets(db, {
        gameId: seeded.gameId,
        matchId: match.id,
        organizerUserId: seeded.owner.id,
        sets: [
          { slot1GamesWon: 6, slot2GamesWon: 4 },
          { slot1GamesWon: 4, slot2GamesWon: 6 },
        ],
      });

      const tables = await listPoolTables(db, {
        gameId: seeded.gameId,
        userId: viewer.id,
      });
      const pool = tables?.pools[0];
      const played = (pool?.rows ?? []).filter((row) => row.played != null);
      expect(played).toHaveLength(2);
      expect(played.map((row) => dashRow(row))).toEqual([
        { played: 1, won: 0, drawn: 1, lost: 0 },
        { played: 1, won: 0, drawn: 1, lost: 0 },
      ]);
      const viewerRound = pool?.viewerRounds.find(
        (round) => round.matchId === match.id,
      );
      expect(viewerRound?.viewerOutcome).toBe("draw");
      expect(viewerRound?.scoreLabel).toBe(
        match.slot1GameTeamId === (await teamIdForSide(db, seeded.gameId, 1))
          ? "6-4 4-6"
          : "4-6 6-4",
      );
    } finally {
      await close();
    }
  });

  it("counts a cancelled Pool Match as not played", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedTournament(db, "cancel");
      const viewer = seeded.players[0];
      if (!viewer) {
        throw new Error("Expected a seated viewer");
      }
      const played = await matchBetweenSides(db, seeded.gameId, 1, 4);
      await completeSets(db, {
        gameId: seeded.gameId,
        matchId: played.id,
        organizerUserId: seeded.owner.id,
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 1 }],
      });
      const cancelled = await matchBetweenSides(db, seeded.gameId, 2, 3);
      await cancelMatch(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        matchId: cancelled.id,
      });

      const tables = await listPoolTables(db, {
        gameId: seeded.gameId,
        userId: viewer.id,
      });
      const pool = tables?.pools[0];
      const cancelledSides = new Set([
        await teamIdForSide(db, seeded.gameId, 2),
        await teamIdForSide(db, seeded.gameId, 3),
      ]);
      const cancelledRows = (pool?.rows ?? []).filter((row) =>
        cancelledSides.has(row.gameTeamId),
      );
      expect(cancelledRows).toHaveLength(2);
      expect(cancelledRows.every((row) => row.played == null)).toBe(true);
      expect(
        pool?.matches.find((item) => item.matchId === cancelled.id)?.cancelled,
      ).toBe(true);
      const row = await db.query.matches.findFirst({
        where: eq(matches.id, cancelled.id),
      });
      expect(row?.status).toBe(MatchStatusEnum.CANCELLED);
    } finally {
      await close();
    }
  });

  it("marks a Pool winner once every Match is completed or cancelled, and finishes the tournament without an overall winner", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedTournament(db, "finish");
      const viewer = seeded.players[0];
      if (!viewer) {
        throw new Error("Expected a seated viewer");
      }
      const pairings: [number, number][] = [
        [1, 4],
        [2, 3],
        [1, 3],
        [4, 2],
        [1, 2],
        [3, 4],
      ];
      for (const [sideA, sideB] of pairings) {
        const match = await matchBetweenSides(db, seeded.gameId, sideA, sideB);
        const slot1IsA =
          match.slot1GameTeamId ===
          (await teamIdForSide(db, seeded.gameId, sideA));
        const aWins = sideA === 1 || (sideA === 2 && sideB === 3);
        await completeSets(db, {
          gameId: seeded.gameId,
          matchId: match.id,
          organizerUserId: seeded.owner.id,
          sets: [
            {
              slot1GamesWon: aWins === slot1IsA ? 6 : 3,
              slot2GamesWon: aWins === slot1IsA ? 3 : 6,
            },
          ],
        });
      }

      const tables = await listPoolTables(db, {
        gameId: seeded.gameId,
        userId: viewer.id,
      });
      expect(tables?.finished).toBe(true);
      expect(tables).not.toHaveProperty("winnerGameTeamId");
      expect(tables).not.toHaveProperty("tournamentWinnerGameTeamId");
      const pool = tables?.pools[0];
      expect(pool?.finished).toBe(true);
      const winnerId = await teamIdForSide(db, seeded.gameId, 1);
      expect(pool?.winnerGameTeamId).toBe(winnerId);
      expect(pool?.rows[0]?.gameTeamId).toBe(winnerId);
      expect(pool?.rows[0]?.isWinner).toBe(true);
      expect(
        dashRow(pool?.rows[0] ?? { played: 0, won: 0, drawn: 0, lost: 0 }),
      ).toEqual({ played: 3, won: 3, drawn: 0, lost: 0 });

      const home = await gameById(db, {
        gameId: seeded.gameId,
        userId: viewer.id,
      });
      expect(home.poolTables?.finished).toBe(true);
      expect(home.poolTables?.pools[0]?.winnerGameTeamId).toBe(winnerId);
    } finally {
      await close();
    }
  });

  it("shows nothing for a legacy Friendly tournament with no Pool count", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "legacy-owner@example.com");
      const venue = await insertVenue(db);
      const [group] = await db
        .insert(groups)
        .values({ name: "Legacy Group", createdBy: owner.id })
        .returning({ id: groups.id });
      if (!group) {
        throw new Error("Failed to insert group");
      }
      const created = await createGame(db, {
        createdBy: owner.id,
        name: "Old tournament",
        groupId: group.id,
        isPublic: false,
        format: "friendly_tournament",
        registrationMode: "individual",
        playersAllowed: 8,
        windowStart: new Date("2026-09-20T10:00:00"),
        windowEnd: new Date("2026-09-20T11:00:00"),
        venueId: venue.id,
      });
      const row = await db.query.games.findFirst({
        where: eq(games.id, created.id),
      });
      expect(row?.poolCount).toBeNull();

      const tables = await listPoolTables(db, {
        gameId: created.id,
        userId: owner.id,
      });
      expect(tables).toBeNull();

      const home = await gameById(db, {
        gameId: created.id,
        userId: owner.id,
      });
      expect(home.poolTables).toBeNull();
    } finally {
      await close();
    }
  });
});

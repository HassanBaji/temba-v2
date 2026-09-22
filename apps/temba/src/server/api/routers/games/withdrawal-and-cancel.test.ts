import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  MatchStatusEnum,
  courts,
  gameTeams,
  games,
  groupMembers,
  groups,
  matches,
  ratingEvents,
  user,
  venues,
} from "@repo/db/schema";

import { addSet } from "~/server/api/routers/games/addSet";
import { gameById } from "~/server/api/routers/games/byId";
import { cancelGame } from "~/server/api/routers/games/cancel";
import { cancelMatch } from "~/server/api/routers/games/cancelMatch";
import { completeMatch } from "~/server/api/routers/games/completeMatch";
import { createTournament } from "~/server/api/routers/games/createTournament";
import { drawPools } from "~/server/api/routers/games/drawPools";
import { kick } from "~/server/api/routers/games/kick";
import { listPoolTables } from "~/server/api/routers/games/poolTables";
import { postPoolDraw } from "~/server/api/routers/games/postPoolDraw";
import { registerSeat } from "~/server/api/routers/games/registerSeat";
import { scoreSet } from "~/server/api/routers/games/scoreSet";
import { listMyGamesHubRows } from "~/server/games/list-my-games";
import { listHomeCarouselGames } from "~/server/home/carousel-games";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

const NOW = new Date("2026-09-20T16:00:00.000Z");

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

async function seedPostedTournament(database: TestDatabase, prefix: string) {
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
  await database.insert(groupMembers).values({
    groupId: group.id,
    userId: owner.id,
  });
  const windowStart = new Date("2026-09-20T18:00:00.000Z");
  const windowEnd = new Date("2026-10-04T18:45:00.000Z");
  const created = await createTournament(database, {
    createdBy: owner.id,
    name: "Autumn Friendly",
    groupId: group.id,
    isPublic: false,
    registrationMode: "individual",
    teamCount: 4,
    poolCount: 1,
    venueId: venue.id,
    courtIds: [courtA.id, courtB.id],
    matchMinutes: 45,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 24 * 60 * 60 * 1000),
  });
  // Legacy multi-week rows still schedule. Create refuses this window.
  await database
    .update(games)
    .set({ windowEnd })
    .where(eq(games.id, created.id));
  const players = await insertNamedUsers(database, prefix, 8);
  for (const player of players) {
    await database.insert(groupMembers).values({
      groupId: group.id,
      userId: player.id,
    });
  }
  await fillCompleteTeams(database, created.id, players, 4);
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
    groupId: group.id,
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
  return team;
}

async function matchBetweenSides(
  database: TestDatabase,
  gameId: string,
  sideA: number,
  sideB: number,
) {
  const idA = (await teamIdForSide(database, gameId, sideA)).id;
  const idB = (await teamIdForSide(database, gameId, sideB)).id;
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

async function completeSideAWin(
  database: TestDatabase,
  args: {
    gameId: string;
    organizerUserId: string;
    sideA: number;
    sideB: number;
  },
) {
  const match = await matchBetweenSides(
    database,
    args.gameId,
    args.sideA,
    args.sideB,
  );
  const slot1IsA =
    match.slot1GameTeamId ===
    (await teamIdForSide(database, args.gameId, args.sideA)).id;
  await completeSets(database, {
    gameId: args.gameId,
    matchId: match.id,
    organizerUserId: args.organizerUserId,
    sets: [
      {
        slot1GamesWon: slot1IsA ? 6 : 3,
        slot2GamesWon: slot1IsA ? 3 : 6,
      },
    ],
  });
  return match;
}

async function kickGameTeam(
  database: TestDatabase,
  args: {
    gameId: string;
    organizerUserId: string;
    players: { id: string }[];
    sideIndex: number;
  },
) {
  const left = args.players[(args.sideIndex - 1) * 2];
  const right = args.players[(args.sideIndex - 1) * 2 + 1];
  if (!left || !right) {
    throw new Error(`Expected both Players on side ${args.sideIndex}`);
  }
  await kick(database, {
    gameId: args.gameId,
    organizerUserId: args.organizerUserId,
    userId: left.id,
  });
  await kick(database, {
    gameId: args.gameId,
    organizerUserId: args.organizerUserId,
    userId: right.id,
  });
}

async function poolIndexesBySide(database: TestDatabase, gameId: string) {
  const teams = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, gameId),
  });
  return Object.fromEntries(
    [...teams]
      .sort((left, right) => (left.sideIndex ?? 0) - (right.sideIndex ?? 0))
      .map((team) => [String(team.sideIndex), team.poolIndex]),
  );
}

describe("withdrawal and cancel after the Pool draw", () => {
  it("lets an Organizer kick a Game team mid-tournament, cancelling only unplayed Pool Matches", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedTournament(db, "withdraw");
      const played = await completeSideAWin(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        sideA: 1,
        sideB: 4,
      });
      const playedEventsBefore = await db.query.ratingEvents.findMany({
        where: eq(ratingEvents.matchId, played.id),
      });
      expect(playedEventsBefore).toHaveLength(4);

      const unplayedVsTwo = await matchBetweenSides(db, seeded.gameId, 4, 2);
      const unplayedVsThree = await matchBetweenSides(db, seeded.gameId, 3, 4);
      const leftover = await matchBetweenSides(db, seeded.gameId, 2, 3);
      const poolsBefore = await poolIndexesBySide(db, seeded.gameId);
      const matchIdsBefore = (
        await db.query.matches.findMany({
          where: eq(matches.gameId, seeded.gameId),
        })
      )
        .map((row) => row.id)
        .sort();

      const kicked = await kick(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        userId: seeded.players[6]!.id,
      });
      expect(kicked).toEqual({ ok: true });
      await kick(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        userId: seeded.players[7]!.id,
      });

      const detail = await gameById(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      const side4 = detail.sides.find((side) => side.sideIndex === 4);
      expect(side4?.left).toBeNull();
      expect(side4?.right).toBeNull();

      const playedAfter = await db.query.matches.findFirst({
        where: eq(matches.id, played.id),
      });
      expect(playedAfter?.status).toBe(MatchStatusEnum.COMPLETED);
      expect(playedAfter?.slot1GameTeamId).toBe(played.slot1GameTeamId);
      expect(playedAfter?.slot2GameTeamId).toBe(played.slot2GameTeamId);
      const playedEventsAfter = await db.query.ratingEvents.findMany({
        where: eq(ratingEvents.matchId, played.id),
      });
      expect(playedEventsAfter).toHaveLength(4);

      const cancelledTwo = await db.query.matches.findFirst({
        where: eq(matches.id, unplayedVsTwo.id),
      });
      const cancelledThree = await db.query.matches.findFirst({
        where: eq(matches.id, unplayedVsThree.id),
      });
      const leftoverAfter = await db.query.matches.findFirst({
        where: eq(matches.id, leftover.id),
      });
      expect(cancelledTwo?.status).toBe(MatchStatusEnum.CANCELLED);
      expect(cancelledThree?.status).toBe(MatchStatusEnum.CANCELLED);
      expect(leftoverAfter?.status).toBe(MatchStatusEnum.PENDING);
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, unplayedVsTwo.id),
        }),
      ).toHaveLength(0);
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, unplayedVsThree.id),
        }),
      ).toHaveLength(0);

      const tables = await listPoolTables(db, {
        gameId: seeded.gameId,
        userId: seeded.players[0]!.id,
      });
      const pool = tables?.pools[0];
      const team1 = await teamIdForSide(db, seeded.gameId, 1);
      const team4 = await teamIdForSide(db, seeded.gameId, 4);
      const team2 = await teamIdForSide(db, seeded.gameId, 2);
      const team3 = await teamIdForSide(db, seeded.gameId, 3);
      const rowFor = (gameTeamId: string) =>
        pool?.rows.find((row) => row.gameTeamId === gameTeamId);
      expect(rowFor(team1.id)).toMatchObject({
        played: 1,
        won: 1,
        drawn: 0,
        lost: 0,
      });
      expect(rowFor(team4.id)).toMatchObject({
        played: 1,
        won: 0,
        drawn: 0,
        lost: 1,
      });
      expect(rowFor(team2.id)).toMatchObject({
        played: null,
        won: null,
        drawn: null,
        lost: null,
      });
      expect(rowFor(team3.id)).toMatchObject({
        played: null,
        won: null,
        drawn: null,
        lost: null,
      });
      expect(
        pool?.matches.find((item) => item.matchId === unplayedVsTwo.id)
          ?.cancelled,
      ).toBe(true);
      expect(
        pool?.matches.find((item) => item.matchId === unplayedVsTwo.id)
          ?.outcome,
      ).toBe("none");
      expect(tables?.finished).toBe(false);

      expect(await poolIndexesBySide(db, seeded.gameId)).toEqual(poolsBefore);
      const matchIdsAfter = (
        await db.query.matches.findMany({
          where: eq(matches.gameId, seeded.gameId),
        })
      )
        .map((row) => row.id)
        .sort();
      expect(matchIdsAfter).toEqual(matchIdsBefore);
    } finally {
      await close();
    }
  });

  it("finishes a Pool whose only remaining Matches were cancelled, without awarding walkovers", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedTournament(db, "finish-void");
      await completeSideAWin(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        sideA: 1,
        sideB: 4,
      });
      await completeSideAWin(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        sideA: 2,
        sideB: 3,
      });
      await completeSideAWin(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        sideA: 1,
        sideB: 3,
      });
      await completeSideAWin(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        sideA: 1,
        sideB: 2,
      });

      await kickGameTeam(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        players: seeded.players,
        sideIndex: 4,
      });

      const remainingTwo = await matchBetweenSides(db, seeded.gameId, 4, 2);
      const remainingThree = await matchBetweenSides(db, seeded.gameId, 3, 4);
      expect(
        (
          await db.query.matches.findFirst({
            where: eq(matches.id, remainingTwo.id),
          })
        )?.status,
      ).toBe(MatchStatusEnum.CANCELLED);
      expect(
        (
          await db.query.matches.findFirst({
            where: eq(matches.id, remainingThree.id),
          })
        )?.status,
      ).toBe(MatchStatusEnum.CANCELLED);

      const tables = await listPoolTables(db, {
        gameId: seeded.gameId,
        userId: seeded.players[0]!.id,
      });
      expect(tables?.finished).toBe(true);
      const pool = tables?.pools[0];
      expect(pool?.finished).toBe(true);
      const winnerId = (await teamIdForSide(db, seeded.gameId, 1)).id;
      expect(pool?.winnerGameTeamId).toBe(winnerId);
      expect(pool?.rows[0]?.gameTeamId).toBe(winnerId);
      expect(pool?.rows[0]?.isWinner).toBe(true);
      expect(pool?.rows[0]).toMatchObject({
        played: 3,
        won: 3,
        drawn: 0,
        lost: 0,
      });
      const team2 = await teamIdForSide(db, seeded.gameId, 2);
      const team3 = await teamIdForSide(db, seeded.gameId, 3);
      expect(
        pool?.rows.find((row) => row.gameTeamId === team2.id),
      ).toMatchObject({ played: 2, won: 1, drawn: 0, lost: 1 });
      expect(
        pool?.rows.find((row) => row.gameTeamId === team3.id),
      ).toMatchObject({ played: 2, won: 0, drawn: 0, lost: 2 });
    } finally {
      await close();
    }
  });

  it("cancels one Pool Match without touching the rest of the schedule or Pool assignments", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedTournament(db, "one-match");
      const target = await matchBetweenSides(db, seeded.gameId, 2, 3);
      const other = await matchBetweenSides(db, seeded.gameId, 1, 4);
      const poolsBefore = await poolIndexesBySide(db, seeded.gameId);

      const cancelled = await cancelMatch(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        matchId: target.id,
      });
      expect(cancelled).toEqual({ cancelledGame: false });

      expect(
        (
          await db.query.matches.findFirst({
            where: eq(matches.id, target.id),
          })
        )?.status,
      ).toBe(MatchStatusEnum.CANCELLED);
      expect(
        (
          await db.query.matches.findFirst({
            where: eq(matches.id, other.id),
          })
        )?.status,
      ).toBe(MatchStatusEnum.PENDING);
      expect(await poolIndexesBySide(db, seeded.gameId)).toEqual(poolsBefore);

      const tables = await listPoolTables(db, {
        gameId: seeded.gameId,
        userId: seeded.players[2]!.id,
      });
      const pool = tables?.pools[0];
      expect(
        pool?.matches.find((item) => item.matchId === target.id)?.cancelled,
      ).toBe(true);
      expect(
        pool?.rows.every((row) => row.played == null && row.won == null),
      ).toBe(true);
    } finally {
      await close();
    }
  });

  it("cancels the tournament's pending Pool Matches, keeps completed ratings, and drops it from hub lists", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedTournament(db, "cancel-all");
      const played = await completeSideAWin(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        sideA: 1,
        sideB: 4,
      });
      const pending = await matchBetweenSides(db, seeded.gameId, 2, 3);
      const poolsBefore = await poolIndexesBySide(db, seeded.gameId);
      const matchIdsBefore = (
        await db.query.matches.findMany({
          where: eq(matches.gameId, seeded.gameId),
        })
      )
        .map((row) => row.id)
        .sort();

      const hubBefore = await listMyGamesHubRows(db, seeded.owner.id, NOW);
      expect(hubBefore.some((row) => row.id === seeded.gameId)).toBe(true);
      const carouselBefore = await listHomeCarouselGames(
        db,
        seeded.owner.id,
        NOW,
      );
      expect(carouselBefore.some((row) => row.id === seeded.gameId)).toBe(true);

      const cancelled = await cancelGame(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      expect(cancelled).toEqual({ ok: true });

      const game = await db.query.games.findFirst({
        where: eq(games.id, seeded.gameId),
      });
      expect(game?.cancelledAt).not.toBeNull();
      expect(
        (
          await db.query.matches.findFirst({
            where: eq(matches.id, played.id),
          })
        )?.status,
      ).toBe(MatchStatusEnum.COMPLETED);
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, played.id),
        }),
      ).toHaveLength(4);
      expect(
        (
          await db.query.matches.findFirst({
            where: eq(matches.id, pending.id),
          })
        )?.status,
      ).toBe(MatchStatusEnum.CANCELLED);
      expect(await poolIndexesBySide(db, seeded.gameId)).toEqual(poolsBefore);
      expect(
        (
          await db.query.matches.findMany({
            where: eq(matches.gameId, seeded.gameId),
          })
        )
          .map((row) => row.id)
          .sort(),
      ).toEqual(matchIdsBefore);

      expect(await listMyGamesHubRows(db, seeded.owner.id, NOW)).toEqual([]);
      expect(await listHomeCarouselGames(db, seeded.owner.id, NOW)).toEqual([]);
    } finally {
      await close();
    }
  });
});

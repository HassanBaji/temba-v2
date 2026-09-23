import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  courts,
  gameTeams,
  games,
  groupMembers,
  groups,
  matches,
  user,
  venues,
} from "@repo/db/schema";

import { createTournament } from "~/server/api/routers/games/createTournament";
import { drawPools } from "~/server/api/routers/games/drawPools";
import { listPublicHubRows } from "~/server/api/routers/games/listPublicPickup";
import { postPoolDraw } from "~/server/api/routers/games/postPoolDraw";
import { registerSeat } from "~/server/api/routers/games/registerSeat";
import { groupById } from "~/server/api/routers/groups/byId";
import { listMyGamesHubRows } from "~/server/games/list-my-games";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";
import { listHomeCarouselGames } from "~/server/home/carousel-games";
import { admit } from "~/server/games/admit";
import { createFriendlyGame } from "~/server/games/create-friendly";

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
    .returning({ id: venues.id, name: venues.name });
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

async function seedFewWeeksTournament(
  database: TestDatabase,
  prefix: string,
  options?: { isPublic?: boolean; postDraw?: boolean },
) {
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
    isPublic: options?.isPublic ?? true,
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
  if (options?.postDraw !== false) {
    await postPoolDraw(database, {
      gameId: created.id,
      organizerUserId: owner.id,
    });
  }
  return {
    owner,
    venue,
    courtA,
    courtB,
    groupId: group.id,
    gameId: created.id,
    players,
  };
}

describe("drawn tournament hub lists", () => {
  it("keeps a tournament without a posted Pool draw as one row with open seats", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedFewWeeksTournament(db, "pre-draw", {
        postDraw: false,
      });
      const viewer = seeded.players[0];
      if (!viewer) {
        throw new Error("Expected a seated viewer");
      }

      const rows = await listMyGamesHubRows(db, viewer.id, NOW);
      const tournamentRows = rows.filter((row) => row.id === seeded.gameId);
      expect(tournamentRows).toHaveLength(1);
      expect(tournamentRows[0]).toMatchObject({
        name: "Autumn Friendly",
        matchId: null,
        roundNumber: null,
        roundCount: null,
        courtName: null,
        registeredUserCount: 8,
        playersAllowed: 8,
      });

      const carousel = await listHomeCarouselGames(db, viewer.id, NOW);
      expect(carousel.filter((row) => row.id === seeded.gameId)).toHaveLength(
        1,
      );
    } finally {
      await close();
    }
  });

  it("expands My Games and the Home carousel into the viewer's Pool Matches", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedFewWeeksTournament(db, "expand");
      const viewer = seeded.players[0];
      const otherPoolPlayer = seeded.players[2];
      if (!viewer || !otherPoolPlayer) {
        throw new Error("Expected seated players");
      }

      const rows = await listMyGamesHubRows(db, viewer.id, NOW);
      const mine = rows.filter((row) => row.id === seeded.gameId);
      expect(mine).toHaveLength(3);
      expect(mine.map((row) => row.roundNumber)).toEqual([1, 2, 3]);
      expect(mine.every((row) => row.roundCount === 3)).toBe(true);
      expect(mine[0]).toMatchObject({
        name: "Autumn Friendly",
        matchId: expect.any(String),
        roundNumber: 1,
        roundCount: 3,
        courtName: "Court 1",
        startTime: new Date("2026-09-20T18:00:00.000Z"),
      });
      expect(mine[1]?.startTime).toEqual(new Date("2026-09-27T18:00:00.000Z"));
      expect(mine[2]?.startTime).toEqual(new Date("2026-10-04T18:00:00.000Z"));
      expect(
        mine[0]?.sides.flatMap((side) => [
          side.left?.userId,
          side.right?.userId,
        ]),
      ).toEqual(expect.arrayContaining([viewer.id, seeded.players[1]?.id]));
      expect(
        mine[0]?.sides.some((side) =>
          [side.left?.userId, side.right?.userId].includes(otherPoolPlayer.id),
        ),
      ).toBe(false);

      const otherRows = (
        await listMyGamesHubRows(db, otherPoolPlayer.id, NOW)
      ).filter((row) => row.id === seeded.gameId);
      expect(otherRows).toHaveLength(3);
      expect(new Set(mine.map((row) => row.matchId))).not.toEqual(
        new Set(otherRows.map((row) => row.matchId)),
      );
      expect(otherRows[0]?.courtName).toBe("Court 2");

      const carousel = (await listHomeCarouselGames(db, viewer.id, NOW)).filter(
        (row) => row.id === seeded.gameId,
      );
      expect(carousel).toHaveLength(3);
      expect(carousel.map((row) => row.roundNumber)).toEqual([1, 2, 3]);
      expect(carousel.map((row) => row.matchId)).toEqual(
        mine.map((row) => row.matchId),
      );
    } finally {
      await close();
    }
  });

  it("sorts expanded Pool Matches among other Games by Match time", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedFewWeeksTournament(db, "sort");
      const viewer = seeded.players[0];
      if (!viewer) {
        throw new Error("Expected a seated viewer");
      }

      const friendly = await createFriendlyGame(db, {
        createdBy: viewer.id,
        name: "Evening Friendly",
        groupId: seeded.groupId,
        venueId: seeded.venue.id,
        windowStart: new Date("2026-09-20T19:00:00.000Z"),
        windowEnd: new Date("2026-09-20T21:00:00.000Z"),
      });
      const seated = await admit(db, {
        game: friendly.game,
        door: "register",
        party: {
          kind: "user",
          userId: viewer.id,
          seat: { sideIndex: 1, position: "left" },
        },
      });
      expect(seated).toMatchObject({ ok: true });

      const rows = await listMyGamesHubRows(db, viewer.id, NOW);
      expect(rows.map((row) => row.name)).toEqual([
        "Autumn Friendly",
        "Evening Friendly",
        "Autumn Friendly",
        "Autumn Friendly",
      ]);
      expect(rows.map((row) => row.startTime)).toEqual([
        new Date("2026-09-20T18:00:00.000Z"),
        new Date("2026-09-20T19:00:00.000Z"),
        new Date("2026-09-27T18:00:00.000Z"),
        new Date("2026-10-04T18:00:00.000Z"),
      ]);
      expect(rows[0]?.roundNumber).toBe(1);
      expect(rows[1]?.id).toBe(friendly.game.id);
      expect(rows[1]?.matchId).toBeNull();
    } finally {
      await close();
    }
  });

  it("does not expand Group home or public pickup after the Pool draw", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedFewWeeksTournament(db, "unexpanded");
      const viewer = seeded.players[0];
      const stranger = await insertUser(db, "pickup-stranger@example.com");
      if (!viewer) {
        throw new Error("Expected a seated viewer");
      }

      const groupHome = await groupById(db, {
        groupId: seeded.groupId,
        userId: viewer.id,
        now: NOW,
      });
      const upcoming = groupHome.upcomingGames.filter(
        (row) => row.id === seeded.gameId,
      );
      expect(upcoming).toHaveLength(1);
      expect(upcoming[0]?.matchId).toBeNull();
      expect(upcoming[0]?.roundNumber).toBeNull();
      expect(upcoming[0]?.name).toBe("Autumn Friendly");

      const pickup = await listPublicHubRows(db, stranger.id, NOW);
      const listed = pickup.filter((row) => row.id === seeded.gameId);
      expect(listed).toHaveLength(1);
      expect(listed[0]?.matchId).toBeNull();
      expect(listed[0]?.roundNumber).toBeNull();
    } finally {
      await close();
    }
  });

  it("does not expand a legacy Friendly tournament and shows no Round labelling", async () => {
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
      await db.insert(groupMembers).values({
        groupId: group.id,
        userId: owner.id,
      });
      const [game] = await db
        .insert(games)
        .values({
          name: "Old hand-built",
          format: GameFormatEnum.FRIENDLY_TOURNAMENT,
          registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
          venueId: venue.id,
          createdBy: owner.id,
          groupId: group.id,
          isPublic: false,
          playersAllowed: 8,
          teamsAllowed: 4,
          poolCount: null,
          windowStart: new Date("2026-09-20T18:00:00.000Z"),
          windowEnd: new Date("2026-09-20T21:00:00.000Z"),
        })
        .returning();
      if (!game) {
        throw new Error("Failed to insert legacy tournament");
      }
      const [team] = await db
        .insert(gameTeams)
        .values({ gameId: game.id, sideIndex: 1 })
        .returning({ id: gameTeams.id });
      if (!team) {
        throw new Error("Failed to insert game team");
      }
      await db.insert(matches).values({
        gameId: game.id,
        startTime: new Date("2026-09-20T18:00:00.000Z"),
        slot1GameTeamId: team.id,
        roundNumber: null,
      });
      await db.insert(matches).values({
        gameId: game.id,
        startTime: new Date("2026-09-20T19:00:00.000Z"),
        roundNumber: null,
      });

      const rows = await listMyGamesHubRows(db, owner.id, NOW);
      const listed = rows.filter((row) => row.id === game.id);
      expect(listed).toHaveLength(1);
      expect(listed[0]).toMatchObject({
        matchId: null,
        roundNumber: null,
        roundCount: null,
        courtName: null,
        name: "Old hand-built",
      });

      const carousel = await listHomeCarouselGames(db, owner.id, NOW);
      expect(carousel.filter((row) => row.id === game.id)).toHaveLength(1);
      expect(
        carousel.find((row) => row.id === game.id)?.roundNumber,
      ).toBeNull();
    } finally {
      await close();
    }
  });
});

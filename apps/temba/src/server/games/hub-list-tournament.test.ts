import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  courts,
  games,
  groupMembers,
  groups,
  user,
  venues,
} from "@repo/db/schema";

import { createTournament } from "~/server/api/routers/games/createTournament";
import { drawPools } from "~/server/api/routers/games/drawPools";
import { postPoolDraw } from "~/server/api/routers/games/postPoolDraw";
import { registerSeat } from "~/server/api/routers/games/registerSeat";
import { groupById } from "~/server/api/routers/groups/byId";
import { createFriendlyGame } from "~/server/games/create-friendly";
import { listMyGamesHubRows } from "~/server/games/list-my-games";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

// Seat doors read the wall clock, so the window sits in the real future.
const NOW = new Date();
const WINDOW_START = new Date(
  NOW.getFullYear(),
  NOW.getMonth(),
  NOW.getDate() + 2,
  18,
);
const WINDOW_END = new Date(
  NOW.getFullYear(),
  NOW.getMonth(),
  NOW.getDate() + 2,
  22,
);

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${name.replaceAll(" ", "-")}@example.com` })
    .returning({ id: user.id, name: user.name });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function seedGroup(database: TestDatabase, prefix: string) {
  const owner = await insertUser(database, `${prefix} owner`);
  const [venue] = await database
    .insert(venues)
    .values({ name: `Venue ${prefix}`, city: "Lisbon", country: "PT" })
    .returning({ id: venues.id });
  if (!venue) {
    throw new Error("Failed to insert venue");
  }
  const [court] = await database
    .insert(courts)
    .values({ venueId: venue.id, name: "Court 1" })
    .returning({ id: courts.id });
  if (!court) {
    throw new Error("Failed to insert court");
  }
  const [group] = await database
    .insert(groups)
    .values({ name: `Group ${prefix}`, createdBy: owner.id })
    .returning({ id: groups.id });
  if (!group) {
    throw new Error("Failed to insert group");
  }
  await database
    .insert(groupMembers)
    .values({ groupId: group.id, userId: owner.id });
  return { owner, venueId: venue.id, courtId: court.id, groupId: group.id };
}

async function joinGroup(
  database: TestDatabase,
  groupId: string,
  prefix: string,
  count: number,
) {
  const players = [];
  for (let index = 1; index <= count; index += 1) {
    const player = await insertUser(database, `${prefix} player ${index}`);
    await database.insert(groupMembers).values({ groupId, userId: player.id });
    players.push(player);
  }
  return players;
}

async function seedTournament(
  database: TestDatabase,
  prefix: string,
  options: { teamCount: number; poolCount: number; roundCount?: number },
) {
  const seeded = await seedGroup(database, prefix);
  const created = await createTournament(database, {
    createdBy: seeded.owner.id,
    name: `${prefix} Friendly`,
    groupId: seeded.groupId,
    isPublic: false,
    registrationMode: "individual",
    teamCount: options.teamCount,
    poolCount: options.poolCount,
    roundCount: options.roundCount,
    venueId: seeded.venueId,
    courtIds: [seeded.courtId],
    matchMinutes: 45,
    windowStart: WINDOW_START,
    windowEnd: WINDOW_END,
  });
  return { ...seeded, gameId: created.id };
}

async function seat(
  database: TestDatabase,
  gameId: string,
  userId: string,
  sideIndex: number,
  position: "left" | "right",
) {
  const result = await registerSeat(database, {
    gameId,
    userId,
    sideIndex,
    position,
  });
  expect(result).toMatchObject({ ok: true, waitlisted: false });
}

describe("hub row tournament field", { timeout: 30_000 }, () => {
  it("lists occupied Game teams before the draw with the viewer's team first", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedTournament(db, "pre-draw", {
        teamCount: 6,
        poolCount: 2,
      });
      const [alone, viewer, partner] = await joinGroup(
        db,
        seeded.groupId,
        "pre-draw",
        3,
      );
      if (!alone || !viewer || !partner) {
        throw new Error("Expected three players");
      }
      await seat(db, seeded.gameId, alone.id, 1, "left");
      await seat(db, seeded.gameId, viewer.id, 3, "left");
      await seat(db, seeded.gameId, partner.id, 3, "right");

      const rows = await listMyGamesHubRows(db, viewer.id, NOW);
      const row = rows.find((item) => item.id === seeded.gameId);

      expect(row?.poolCount).toBe(2);
      expect(row?.tournament).toMatchObject({
        roundCount: 3,
        drawPosted: false,
        allowSoloRegister: true,
      });
      expect(
        row?.tournament?.teams.map((team) => ({
          sideIndex: team.sideIndex,
          isViewerTeam: team.isViewerTeam,
          left: team.left?.userId ?? null,
          right: team.right?.userId ?? null,
        })),
      ).toEqual([
        {
          sideIndex: 3,
          isViewerTeam: true,
          left: viewer.id,
          right: partner.id,
        },
        { sideIndex: 1, isViewerTeam: false, left: alone.id, right: null },
      ]);
      expect(row?.tournament?.teams[0]?.left?.isViewer).toBe(true);
      expect(row?.tournament?.joinSides.map((side) => side.sideIndex)).toEqual([
        1, 2, 3, 4, 5, 6,
      ]);
      expect(row?.tournament?.joinSides[0]?.left?.userId).toBe(alone.id);
      expect(row?.tournament?.joinSides[0]?.right).toBeNull();
      expect(row?.tournament?.joinSides[1]).toEqual({
        sideIndex: 2,
        left: null,
        right: null,
      });
      expect(row?.sides).toEqual([]);
    } finally {
      await close();
    }
  });

  it("keeps a half team on its side, orders by side for a viewer not playing, and gives Group home the field", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedTournament(db, "organizer", {
        teamCount: 4,
        poolCount: 1,
        roundCount: 2,
      });
      const [first, second] = await joinGroup(
        db,
        seeded.groupId,
        "organizer",
        2,
      );
      if (!first || !second) {
        throw new Error("Expected two players");
      }
      await seat(db, seeded.gameId, first.id, 4, "right");
      await seat(db, seeded.gameId, second.id, 2, "left");

      const groupHome = await groupById(db, {
        groupId: seeded.groupId,
        userId: seeded.owner.id,
        now: NOW,
      });
      const row = groupHome.upcomingGames.find(
        (item) => item.id === seeded.gameId,
      );

      expect(row?.tournament?.roundCount).toBe(2);
      expect(
        row?.tournament?.teams.map((team) => [
          team.sideIndex,
          team.isViewerTeam,
          team.left?.userId ?? null,
          team.right?.userId ?? null,
        ]),
      ).toEqual([
        [2, false, second.id, null],
        [4, false, null, first.id],
      ]);
      expect(row?.tournament?.joinSides).toHaveLength(4);
      expect(row?.registeredTeamCount).toBe(2);
    } finally {
      await close();
    }
  });

  it("reports the posted Round count and Pools once the draw is posted", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedTournament(db, "drawn", {
        teamCount: 4,
        poolCount: 1,
      });
      const players = await joinGroup(db, seeded.groupId, "drawn", 8);
      for (let team = 0; team < 4; team += 1) {
        const left = players[team * 2];
        const right = players[team * 2 + 1];
        if (!left || !right) {
          throw new Error("Expected eight players");
        }
        await seat(db, seeded.gameId, left.id, team + 1, "left");
        await seat(db, seeded.gameId, right.id, team + 1, "right");
      }
      await drawPools(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        shuffle: (items) => [...items],
      });
      await postPoolDraw(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
      });

      const groupHome = await groupById(db, {
        groupId: seeded.groupId,
        userId: seeded.owner.id,
        now: NOW,
      });
      const row = groupHome.upcomingGames.find(
        (item) => item.id === seeded.gameId,
      );

      expect(row?.tournament).toMatchObject({
        roundCount: 3,
        drawPosted: true,
      });
      expect(row?.tournament?.teams).toHaveLength(4);
      expect(row?.tournament?.teams.every((team) => team.poolIndex === 1)).toBe(
        true,
      );
    } finally {
      await close();
    }
  });

  it("is null for a Friendly game and a legacy Friendly tournament", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedGroup(db, "other-formats");
      const friendly = await createFriendlyGame(db, {
        createdBy: seeded.owner.id,
        name: "Evening Friendly",
        groupId: seeded.groupId,
        venueId: seeded.venueId,
        windowStart: WINDOW_START,
        windowEnd: WINDOW_END,
      });
      const [legacy] = await db
        .insert(games)
        .values({
          name: "Old hand-built",
          format: GameFormatEnum.FRIENDLY_TOURNAMENT,
          registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
          venueId: seeded.venueId,
          createdBy: seeded.owner.id,
          groupId: seeded.groupId,
          isPublic: false,
          playersAllowed: 8,
          teamsAllowed: 4,
          poolCount: null,
          windowStart: WINDOW_START,
          windowEnd: WINDOW_END,
        })
        .returning({ id: games.id });
      if (!legacy) {
        throw new Error("Failed to insert legacy tournament");
      }

      const rows = await listMyGamesHubRows(db, seeded.owner.id, NOW);
      const friendlyRow = rows.find((item) => item.id === friendly.game.id);
      const legacyRow = rows.find((item) => item.id === legacy.id);

      expect(friendlyRow?.tournament).toBeNull();
      expect(friendlyRow?.poolCount).toBeNull();
      expect(friendlyRow?.sides).toHaveLength(2);
      expect(legacyRow?.tournament).toBeNull();
      expect(legacyRow?.poolCount).toBeNull();
    } finally {
      await close();
    }
  });
});

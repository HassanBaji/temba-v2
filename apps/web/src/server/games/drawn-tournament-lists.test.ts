import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

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

import {
  tournamentCardKnockoutLine,
  tournamentMatchRoundLabel,
  tournamentTeamsLine,
} from "~/lib/tournament-card";
import { addSet } from "~/server/api/routers/games/addSet";
import { cancelMatch } from "~/server/api/routers/games/cancelMatch";
import { completeMatch } from "~/server/api/routers/games/completeMatch";
import { createTournament } from "~/server/api/routers/games/createTournament";
import { drawPools } from "~/server/api/routers/games/drawPools";
import { listPublicHubRows } from "~/server/api/routers/games/listPublicPickup";
import { postPoolDraw } from "~/server/api/routers/games/postPoolDraw";
import { registerSeat } from "~/server/api/routers/games/registerSeat";
import { scoreSet } from "~/server/api/routers/games/scoreSet";
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

type KnockoutShape = "knockout_only" | "groups_then_knockout";

/**
 * Knockout only: six Game teams in an eight-place tree, drawn in side order,
 * so sides 1 and 2 have Byes into the Semi-finals, Q2 is side 4 v side 5 and
 * Q4 is side 3 v side 6. Groups then knockout: eight Game teams in two Pools
 * of four (sides 1-4 Pool A), two through from each, so Semi-finals then a
 * Final.
 */
async function seedKnockoutTournament(
  database: TestDatabase,
  prefix: string,
  shape: KnockoutShape,
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
  const teamCount = shape === "knockout_only" ? 6 : 8;
  const created = await createTournament(database, {
    createdBy: owner.id,
    name: "Knockout day",
    groupId: group.id,
    isPublic: true,
    registrationMode: "individual",
    tournamentShape: shape,
    teamCount: 8,
    ...(shape === "groups_then_knockout"
      ? { poolCount: 2, qualifiersPerPool: 2 }
      : {}),
    venueId: venue.id,
    courtIds: [courtA.id, courtB.id],
    matchMinutes: 45,
    windowStart: new Date("2026-09-20T09:00:00"),
    windowEnd: new Date("2026-09-20T23:00:00"),
  });
  const players = await insertNamedUsers(database, prefix, teamCount * 2);
  for (const player of players) {
    await database.insert(groupMembers).values({
      groupId: group.id,
      userId: player.id,
    });
  }
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
  const teams = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, created.id),
  });
  const team = (side: number) => {
    const found = teams.find((row) => row.sideIndex === side);
    if (!found) {
      throw new Error(`No Game team on side ${side}`);
    }
    return found.id;
  };
  const sideOf = (gameTeamId: string | null) =>
    teams.find((row) => row.id === gameTeamId)?.sideIndex ?? null;
  const player = (side: number) => {
    const found = players[(side - 1) * 2];
    if (!found) {
      throw new Error(`No player on side ${side}`);
    }
    return found;
  };
  return {
    owner,
    venue,
    groupId: group.id,
    gameId: created.id,
    team,
    sideOf,
    player,
  };
}

type SeededKnockout = Awaited<ReturnType<typeof seedKnockoutTournament>>;

async function knockoutMatchAt(
  database: TestDatabase,
  gameId: string,
  round: number,
  position: number,
) {
  const row = await database.query.matches.findFirst({
    where: and(
      eq(matches.gameId, gameId),
      eq(matches.knockoutRound, round),
      eq(matches.knockoutPosition, position),
    ),
  });
  if (!row) {
    throw new Error(`No Knockout Match at ${round}:${position}`);
  }
  return row;
}

async function settleFor(
  database: TestDatabase,
  seeded: SeededKnockout,
  match: {
    id: string;
    slot1GameTeamId: string | null;
    slot2GameTeamId: string | null;
  },
  winnerSide: number,
) {
  const winner = seeded.sideOf(match.slot1GameTeamId) === winnerSide ? 1 : 2;
  const set = await addSet(database, {
    gameId: seeded.gameId,
    matchId: match.id,
    userId: seeded.owner.id,
  });
  await scoreSet(database, {
    gameId: seeded.gameId,
    matchId: match.id,
    setId: set.id,
    userId: seeded.owner.id,
    slot1GamesWon: winner === 1 ? 6 : 2,
    slot2GamesWon: winner === 1 ? 2 : 6,
  });
  vi.setSystemTime(new Date(Date.now() + 1000));
  await completeMatch(database, {
    gameId: seeded.gameId,
    matchId: match.id,
    userId: seeded.owner.id,
  });
}

const KNOCKOUT_NOW = new Date("2026-09-20T07:00:00");

async function myRows(
  database: TestDatabase,
  seeded: SeededKnockout,
  side: number,
) {
  const rows = await listMyGamesHubRows(
    database,
    seeded.player(side).id,
    KNOCKOUT_NOW,
  );
  return rows.filter((row) => row.id === seeded.gameId);
}

describe("Knockout Matches on hub lists", () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-01T12:00:00"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("lists a Knockout Match once the viewer's Game team is in a slot, named by its Knockout round", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedKnockoutTournament(
        db,
        "ko-list",
        "knockout_only",
      );
      const q2 = await knockoutMatchAt(db, seeded.gameId, 1, 2);
      const s1 = await knockoutMatchAt(db, seeded.gameId, 2, 1);

      const quarter = await myRows(db, seeded, 4);
      expect(quarter).toHaveLength(1);
      expect(quarter[0]).toMatchObject({
        matchId: q2.id,
        startTime: q2.startTime,
        roundNumber: null,
        roundCount: null,
        poolMatch: null,
        knockoutMatch: { round: 1, roundCount: 3 },
        playersAllowed: 4,
      });
      expect(quarter[0] && tournamentMatchRoundLabel(quarter[0])).toBe(
        "Quarter-final",
      );
      expect(
        quarter[0]?.sides.some(
          (side) =>
            side.left?.userId === seeded.player(4).id ||
            side.right?.userId === seeded.player(4).id,
        ),
      ).toBe(true);

      const bye = await myRows(db, seeded, 1);
      expect(bye).toHaveLength(1);
      expect(bye[0]?.matchId).toBe(s1.id);
      expect(bye[0] && tournamentMatchRoundLabel(bye[0])).toBe("Semi-final");

      const carousel = (
        await listHomeCarouselGames(db, seeded.player(4).id, KNOCKOUT_NOW)
      ).filter((row) => row.id === seeded.gameId);
      expect(carousel).toHaveLength(1);
      expect(carousel[0]).toMatchObject({
        matchId: q2.id,
        knockoutMatch: { round: 1, roundCount: 3 },
        roundNumber: null,
        phase: "upcoming",
      });

      expect(quarter[0]?.tournament?.knockout).toEqual({
        roundCount: 3,
        currentRoundName: "Quarter-finals",
        champion: null,
      });
      expect(quarter[0]?.tournament?.roundCount).toBe(3);
    } finally {
      await close();
    }
  });

  it("does not list a Knockout Match the viewer might reach, and moves on after a result", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedKnockoutTournament(
        db,
        "ko-next",
        "knockout_only",
      );
      const q2 = await knockoutMatchAt(db, seeded.gameId, 1, 2);
      const s1 = await knockoutMatchAt(db, seeded.gameId, 2, 1);

      const before = await myRows(db, seeded, 4);
      expect(before.map((row) => row.matchId)).toEqual([q2.id]);

      await settleFor(db, seeded, q2, 4);

      const winner = await myRows(db, seeded, 4);
      expect(winner.map((row) => row.matchId)).toEqual([s1.id]);
      expect(winner[0]?.knockoutMatch).toEqual({ round: 2, roundCount: 3 });

      const loser = await myRows(db, seeded, 5);
      expect(loser).toHaveLength(1);
      expect(loser[0]).toMatchObject({ matchId: null, knockoutMatch: null });
    } finally {
      await close();
    }
  });

  it("sorts Knockout rows by their start time among other Games", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedKnockoutTournament(
        db,
        "ko-sort",
        "knockout_only",
      );
      const s1 = await knockoutMatchAt(db, seeded.gameId, 2, 1);
      const viewer = seeded.player(1);
      const startTime = s1.startTime;
      if (!startTime) {
        throw new Error("Expected a scheduled Semi-final");
      }
      const at = (minutes: number) =>
        new Date(startTime.getTime() + minutes * 60 * 1000);
      for (const [name, offset] of [
        ["Before the semi", -120],
        ["After the semi", 120],
      ] as const) {
        const friendly = await createFriendlyGame(db, {
          createdBy: viewer.id,
          name,
          groupId: seeded.groupId,
          venueId: seeded.venue.id,
          windowStart: at(offset),
          windowEnd: at(offset + 90),
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
      }

      const rows = await listMyGamesHubRows(db, viewer.id, KNOCKOUT_NOW);
      expect(rows.map((row) => row.name)).toEqual([
        "Before the semi",
        "Knockout day",
        "After the semi",
      ]);
      expect(rows[1]?.matchId).toBe(s1.id);
    } finally {
      await close();
    }
  });

  it("keeps Group home and public pickup on the tournament, not its Knockout Matches", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedKnockoutTournament(
        db,
        "ko-hub",
        "knockout_only",
      );
      const stranger = await insertUser(db, "ko-pickup-stranger@example.com");

      const groupHome = await groupById(db, {
        groupId: seeded.groupId,
        userId: seeded.player(4).id,
        now: KNOCKOUT_NOW,
      });
      const upcoming = groupHome.upcomingGames.filter(
        (row) => row.id === seeded.gameId,
      );
      expect(upcoming).toHaveLength(1);
      expect(upcoming[0]).toMatchObject({
        matchId: null,
        roundNumber: null,
        knockoutMatch: null,
      });

      const pickup = await listPublicHubRows(db, stranger.id, KNOCKOUT_NOW);
      const listed = pickup.filter((row) => row.id === seeded.gameId);
      expect(listed).toHaveLength(1);
      expect(listed[0]).toMatchObject({ matchId: null, knockoutMatch: null });
    } finally {
      await close();
    }
  });

  it("does not list a Walkover, and shows the Champion once the Final is decided", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedKnockoutTournament(
        db,
        "ko-champ",
        "knockout_only",
      );
      const q4 = await knockoutMatchAt(db, seeded.gameId, 1, 4);
      await cancelMatch(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        matchId: q4.id,
        advancingGameTeamId: seeded.team(3),
      });
      const s2 = await knockoutMatchAt(db, seeded.gameId, 2, 2);
      expect((await myRows(db, seeded, 3)).map((row) => row.matchId)).toEqual([
        s2.id,
      ]);
      expect((await myRows(db, seeded, 6))[0]?.matchId).toBeNull();

      await settleFor(
        db,
        seeded,
        await knockoutMatchAt(db, seeded.gameId, 1, 2),
        4,
      );
      const summary = (await myRows(db, seeded, 6))[0];
      expect(summary?.tournament?.knockout?.currentRoundName).toBe(
        "Semi-finals",
      );
      expect(summary && tournamentCardKnockoutLine(summary)).toBe(
        "Now at the Semi-finals",
      );

      await settleFor(
        db,
        seeded,
        await knockoutMatchAt(db, seeded.gameId, 2, 1),
        1,
      );
      await settleFor(
        db,
        seeded,
        await knockoutMatchAt(db, seeded.gameId, 2, 2),
        2,
      );
      await settleFor(
        db,
        seeded,
        await knockoutMatchAt(db, seeded.gameId, 3, 1),
        1,
      );

      const champions = await myRows(db, seeded, 1);
      expect(champions).toHaveLength(1);
      expect(champions[0]?.matchId).toBeNull();
      const champion = champions[0]?.tournament?.knockout?.champion;
      expect(champion).toContain(seeded.player(1).name);
      expect(champions[0]?.tournament?.knockout?.currentRoundName).toBeNull();
      expect(champions[0] && tournamentCardKnockoutLine(champions[0])).toBe(
        `Champion: ${champion}`,
      );
    } finally {
      await close();
    }
  });

  it("counts Pool Rounds only on Groups then knockout and lists the Knockout Match once placed", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedKnockoutTournament(
        db,
        "gk-list",
        "groups_then_knockout",
      );

      const poolRows = await myRows(db, seeded, 1);
      expect(poolRows).toHaveLength(3);
      expect(poolRows.map((row) => row.roundNumber)).toEqual([1, 2, 3]);
      expect(poolRows.every((row) => row.roundCount === 3)).toBe(true);
      expect(poolRows.every((row) => row.knockoutMatch === null)).toBe(true);
      expect(poolRows.map((row) => tournamentMatchRoundLabel(row))).toEqual([
        "R1 of 3",
        "R2 of 3",
        "R3 of 3",
      ]);
      expect(poolRows[0]?.tournament?.knockout).toEqual({
        roundCount: 2,
        currentRoundName: null,
        champion: null,
      });
      const summaryRow = (
        await groupById(db, {
          groupId: seeded.groupId,
          userId: seeded.owner.id,
          now: KNOCKOUT_NOW,
        })
      ).upcomingGames.find((row) => row.id === seeded.gameId);
      expect(summaryRow && tournamentTeamsLine(summaryRow)).toBe(
        "8 teams, 2 groups, then semis",
      );

      const pool = await db.query.matches.findMany({
        where: and(
          eq(matches.gameId, seeded.gameId),
          isNull(matches.knockoutRound),
        ),
      });
      for (const match of pool) {
        const slot1 = seeded.sideOf(match.slot1GameTeamId) ?? 0;
        const slot2 = seeded.sideOf(match.slot2GameTeamId) ?? 0;
        await settleFor(db, seeded, match, Math.min(slot1, slot2));
      }
      const semis = await db.query.matches.findMany({
        where: and(
          eq(matches.gameId, seeded.gameId),
          isNotNull(matches.knockoutRound),
          eq(matches.knockoutRound, 1),
        ),
      });
      const viewerSemi = semis.find(
        (match) =>
          match.slot1GameTeamId === seeded.team(1) ||
          match.slot2GameTeamId === seeded.team(1),
      );
      expect(viewerSemi).toBeDefined();

      const placed = await myRows(db, seeded, 1);
      expect(placed).toHaveLength(1);
      expect(placed[0]).toMatchObject({
        matchId: viewerSemi?.id,
        roundNumber: null,
        roundCount: null,
        poolMatch: null,
        knockoutMatch: { round: 1, roundCount: 2 },
      });
      expect(placed[0] && tournamentMatchRoundLabel(placed[0])).toBe(
        "Semi-final",
      );
      expect(placed[0]?.tournament?.knockout?.currentRoundName).toBe(
        "Semi-finals",
      );

      const out = await myRows(db, seeded, 4);
      expect(out).toHaveLength(1);
      expect(out[0]?.matchId).toBeNull();
    } finally {
      await close();
    }
  });
});

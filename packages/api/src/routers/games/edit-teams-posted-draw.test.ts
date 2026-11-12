import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  courts,
  gameTeams,
  games,
  groups,
  matchSets,
  matches,
  user,
  venues,
} from "@repo/db/schema";

import { enterTournamentScore } from "#src/routers/games/enterTournamentScore";
import { gameById } from "#src/routers/games/byId";
import { createTournament } from "#src/routers/games/createTournament";
import { drawPools } from "#src/routers/games/drawPools";
import { editTeams } from "#src/routers/games/editTeams";
import { kick } from "#src/routers/games/kick";
import { postPoolDraw } from "#src/routers/games/postPoolDraw";
import { registerSeat } from "#src/routers/games/registerSeat";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { messagesFor } from "@repo/i18n/messages";

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

async function insertGroup(database: TestDatabase, createdBy: string) {
  const [row] = await database
    .insert(groups)
    .values({
      verifiedAt: new Date(),
      name: `Group ${crypto.randomUUID()}`,
      createdBy,
    })
    .returning({ id: groups.id });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row;
}

// Fixture windows sit on fixed dates, so registration must still read as open.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-01T12:00:00"));
});

afterAll(() => {
  vi.useRealTimers();
});

function identityShuffle<T>(items: readonly T[]): T[] {
  return [...items];
}

async function insertTournament(
  database: TestDatabase,
  args: {
    createdBy: string;
    venueId: string;
    teamCount: number;
    poolCount: number;
    courtIds: string[];
    windowStart: Date;
    windowEnd: Date;
    roundCount?: number | null;
  },
) {
  const group = await insertGroup(database, args.createdBy);
  const oneDayMs = 24 * 60 * 60 * 1000;
  const span = args.windowEnd.getTime() - args.windowStart.getTime();
  const created = await createTournament(database, {
    createdBy: args.createdBy,
    name: "Autumn Friendly",
    groupId: group.id,
    isPublic: true,
    registrationMode: "individual",
    teamCount: args.teamCount,
    poolCount: args.poolCount,
    roundCount: args.roundCount,
    venueId: args.venueId,
    courtIds: args.courtIds,
    matchMinutes: 45,
    windowStart: args.windowStart,
    windowEnd:
      span > oneDayMs
        ? new Date(args.windowStart.getTime() + oneDayMs)
        : args.windowEnd,
  });
  if (span > oneDayMs) {
    // Legacy multi-week rows still schedule. Create refuses this window.
    await database
      .update(games)
      .set({ windowEnd: args.windowEnd })
      .where(eq(games.id, created.id));
  }
  return created.id;
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

async function teamIdBySide(database: TestDatabase, gameId: string) {
  const rows = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, gameId),
    columns: { id: true, sideIndex: true, poolIndex: true },
  });
  const bySide = new Map<number, string>();
  for (const row of rows) {
    if (row.sideIndex == null) {
      continue;
    }
    bySide.set(row.sideIndex, row.id);
  }
  return bySide;
}

function sideOf(bySide: Map<number, string>, teamId: string | null) {
  for (const [side, id] of bySide) {
    if (id === teamId) {
      return side;
    }
  }
  return null;
}

async function postedSchedule(database: TestDatabase, gameId: string) {
  const bySide = await teamIdBySide(database, gameId);
  const rows = await database.query.matches.findMany({
    where: eq(matches.gameId, gameId),
  });
  return rows
    .map((row) => ({
      roundNumber: row.roundNumber,
      startTime: row.startTime,
      courtId: row.courtId,
      slot1: sideOf(bySide, row.slot1GameTeamId),
      slot2: sideOf(bySide, row.slot2GameTeamId),
    }))
    .sort((left, right) => {
      const round = (left.roundNumber ?? 0) - (right.roundNumber ?? 0);
      if (round !== 0) {
        return round;
      }
      const slot1 = (left.slot1 ?? 0) - (right.slot1 ?? 0);
      if (slot1 !== 0) {
        return slot1;
      }
      return (left.slot2 ?? 0) - (right.slot2 ?? 0);
    });
}

async function expectRefused(
  run: () => Promise<unknown>,
  code: TRPCError["code"],
  message: string | RegExp,
) {
  try {
    await run();
    throw new Error("expected the action to be refused");
  } catch (error) {
    expect(error).toBeInstanceOf(TRPCError);
    if (!(error instanceof TRPCError)) {
      return;
    }
    expect(error.code).toBe(code);
    if (typeof message === "string") {
      expect(error.message).toBe(message);
    } else {
      expect(error.message).toMatch(message);
    }
  }
}

async function seedDrawnEvenOneDay(database: TestDatabase, prefix: string) {
  const owner = await insertUser(database, `${prefix}-owner@example.com`);
  const venue = await insertVenue(database);
  const courtA = await insertCourt(database, venue.id, "Court 1");
  const courtB = await insertCourt(database, venue.id, "Court 2");
  const gameId = await insertTournament(database, {
    createdBy: owner.id,
    venueId: venue.id,
    teamCount: 4,
    poolCount: 1,
    courtIds: [courtA.id, courtB.id],
    windowStart: new Date("2026-09-20T10:00:00"),
    windowEnd: new Date("2026-09-20T16:00:00"),
  });
  const players = await insertNamedUsers(database, prefix, 8);
  await fillCompleteTeams(database, gameId, players, 4);
  await drawPools(database, {
    gameId,
    organizerUserId: owner.id,
    shuffle: identityShuffle,
  });
  return {
    owner,
    venue,
    courtA,
    courtB,
    gameId,
    players,
  };
}

async function seedPostedEvenOneDay(database: TestDatabase, prefix: string) {
  const drawn = await seedDrawnEvenOneDay(database, prefix);
  await postPoolDraw(database, {
    gameId: drawn.gameId,
    organizerUserId: drawn.owner.id,
  });
  return drawn;
}

async function lineup(database: TestDatabase, gameId: string, viewer: string) {
  const game = await gameById(database, { gameId, userId: viewer });
  return game.sides.flatMap((side) =>
    (["left", "right"] as const).flatMap((position) => {
      const occupant = side[position];
      return occupant
        ? [{ userId: occupant.userId, sideIndex: side.sideIndex, position }]
        : [];
    }),
  );
}

type Line = Awaited<ReturnType<typeof lineup>>;

function swapped(line: Line, firstUserId: string, secondUserId: string) {
  const first = line.find((seat) => seat.userId === firstUserId)!;
  const second = line.find((seat) => seat.userId === secondUserId)!;
  return line.map((seat) =>
    seat.userId === firstUserId
      ? { ...second, userId: firstUserId }
      : seat.userId === secondUserId
        ? { ...first, userId: secondUserId }
        : seat,
  );
}

async function matchSlots(database: TestDatabase, gameId: string) {
  const rows = await database.query.matches.findMany({
    where: eq(matches.gameId, gameId),
    columns: { id: true, slot1GameTeamId: true, slot2GameTeamId: true },
  });
  return rows.sort((a, b) => a.id.localeCompare(b.id));
}

describe("editTeams after a posted Pool draw", () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-01T12:00:00"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("swaps players between Game teams and leaves every Match on its slot", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedEvenOneDay(db, "swap");
      const slots = await matchSlots(db, seeded.gameId);
      const first = seeded.players[0]!.id;
      const third = seeded.players[2]!.id;
      const line = await lineup(db, seeded.gameId, seeded.owner.id);

      await editTeams(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        seats: swapped(line, first, third),
        notifyPlayers: true,
      });

      const after = await lineup(db, seeded.gameId, seeded.owner.id);
      expect(after.find((seat) => seat.userId === first)?.sideIndex).toBe(2);
      expect(after.find((seat) => seat.userId === third)?.sideIndex).toBe(1);
      expect(slots.length).toBeGreaterThan(0);
      expect(await matchSlots(db, seeded.gameId)).toEqual(slots);
    } finally {
      await close();
    }
  });

  it("keeps a Game team that was left empty after the draw, with its Matches", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedEvenOneDay(db, "emptied");
      for (const player of seeded.players.slice(6)) {
        await kick(db, {
          gameId: seeded.gameId,
          organizerUserId: seeded.owner.id,
          userId: player.id,
        });
      }
      const teams = await db.query.gameTeams.findMany({
        where: eq(gameTeams.gameId, seeded.gameId),
        columns: { id: true },
      });
      const slots = await matchSlots(db, seeded.gameId);
      const line = await lineup(db, seeded.gameId, seeded.owner.id);

      await editTeams(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        seats: swapped(line, seeded.players[0]!.id, seeded.players[1]!.id),
        notifyPlayers: false,
      });

      const after = await db.query.gameTeams.findMany({
        where: eq(gameTeams.gameId, seeded.gameId),
        columns: { id: true },
      });
      expect(after).toHaveLength(teams.length);
      expect(await matchSlots(db, seeded.gameId)).toEqual(slots);
    } finally {
      await close();
    }
  });

  it("refuses a move to an open spot, which would change a team's size", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedEvenOneDay(db, "open-spot");
      await kick(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        userId: seeded.players[7]!.id,
      });
      const line = await lineup(db, seeded.gameId, seeded.owner.id);
      const mover = seeded.players[0]!.id;

      await expectRefused(
        () =>
          editTeams(db, {
            gameId: seeded.gameId,
            organizerUserId: seeded.owner.id,
            seats: line.map((seat) =>
              seat.userId === mover
                ? { ...seat, sideIndex: 4, position: "right" as const }
                : seat,
            ),
            notifyPlayers: false,
          }),
        "FORBIDDEN",
        messagesFor("en").editTeams.refused.fixedSides,
      );
    } finally {
      await close();
    }
  });

  it("keeps a pair together while its score waits to be confirmed", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedEvenOneDay(db, "pending");
      const [match] = await db.query.matches.findMany({
        where: eq(matches.gameId, seeded.gameId),
      });
      const teams = await db.query.gameTeams.findMany({
        where: eq(gameTeams.gameId, seeded.gameId),
        columns: { id: true, sideIndex: true },
      });
      const sideOf = (gameTeamId: string | null) =>
        teams.find((team) => team.id === gameTeamId)?.sideIndex;
      const playing = [
        sideOf(match!.slot1GameTeamId),
        sideOf(match!.slot2GameTeamId),
      ];
      const line = await lineup(db, seeded.gameId, seeded.owner.id);
      const scorer = line.find((seat) => seat.sideIndex === playing[0])!;
      const partner = line.find(
        (seat) =>
          seat.sideIndex === playing[0] && seat.userId !== scorer.userId,
      )!;
      const outsider = line.find((seat) => !playing.includes(seat.sideIndex))!;

      vi.setSystemTime(new Date("2026-09-20T15:00:00"));
      await enterTournamentScore(db, {
        gameId: seeded.gameId,
        matchId: match!.id,
        userId: scorer.userId,
        slot1GamesWon: 6,
        slot2GamesWon: 3,
      });
      const pending = await db.query.matches.findFirst({
        where: eq(matches.id, match!.id),
        columns: { status: true },
      });
      expect(pending?.status).toBe("pending");

      await expectRefused(
        () =>
          editTeams(db, {
            gameId: seeded.gameId,
            organizerUserId: seeded.owner.id,
            seats: swapped(line, scorer.userId, outsider.userId),
            notifyPlayers: false,
          }),
        "FORBIDDEN",
        messagesFor("en").editTeams.refused.locked,
      );

      await editTeams(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        seats: swapped(line, scorer.userId, partner.userId),
        notifyPlayers: false,
      });
      const after = await lineup(db, seeded.gameId, seeded.owner.id);
      expect(after.find((seat) => seat.userId === scorer.userId)).toMatchObject(
        { sideIndex: playing[0], position: partner.position },
      );
    } finally {
      vi.setSystemTime(new Date("2026-09-01T12:00:00"));
      await close();
    }
  });
});

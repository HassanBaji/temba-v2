import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from "vitest";

import {
  gameInviteLinks,
  gamePlayers,
  games,
  GameFormatEnum,
  matches,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import {
  asDb,
  insertAmericano,
  insertAmericanoUser,
} from "#src/games/americano.test-support";
import { acceptInviteLink } from "#src/routers/games/acceptInviteLink";
import { createInviteLink } from "#src/routers/games/createInviteLink";

const ORIGIN = "https://temba.test";
const START = new Date("2026-09-25T09:00:00");
const END = new Date("2026-09-25T12:30:00");

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-01T12:00:00"));
});

afterAll(() => {
  vi.useRealTimers();
});

async function testDatabase() {
  const { db, close } = await createPgliteDb();
  onTestFinished(close);
  return db;
}

async function tokenFor(
  database: TestDatabase,
  gameId: string,
  organizerId: string,
) {
  const created = await createInviteLink(asDb(database), {
    gameId,
    userId: organizerId,
    origin: ORIGIN,
  });
  const row = await database.query.gameInviteLinks.findFirst({
    where: eq(gameInviteLinks.id, created.id),
  });
  if (!row) {
    throw new Error("Invite link row missing");
  }
  return row.token;
}

async function preferredSideOf(
  database: TestDatabase,
  gameId: string,
  userId: string,
) {
  const row = await database.query.gamePlayers.findFirst({
    where: and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.userId, userId)),
    columns: { preferredSide: true },
  });
  return row?.preferredSide;
}

describe("acceptInviteLink, preferred side", () => {
  it("keeps the side an Americano sign-up asks for", async () => {
    const database = await testDatabase();
    const organizer = await insertAmericanoUser(database, "Hassan Haji");
    const invitee = await insertAmericanoUser(database, "Ali Haji");
    const gameId = await insertAmericano(database, {
      createdBy: organizer.id,
      players: 8,
      rounds: 3,
      windowStart: START,
      windowEnd: END,
    });
    const token = await tokenFor(database, gameId, organizer.id);

    expect(
      await acceptInviteLink(asDb(database), {
        token,
        userId: invitee.id,
        preferredSide: "right",
        joinGroup: true,
      }),
    ).toMatchObject({ gameId, outcome: "registered" });
    expect(await preferredSideOf(database, gameId, invitee.id)).toBe("right");
  });

  it("takes the seat with no side when none is asked for", async () => {
    const database = await testDatabase();
    const organizer = await insertAmericanoUser(database, "Hassan Haji");
    const invitee = await insertAmericanoUser(database, "Ali Haji");
    const gameId = await insertAmericano(database, {
      createdBy: organizer.id,
      players: 8,
      rounds: 3,
      windowStart: START,
      windowEnd: END,
    });
    const token = await tokenFor(database, gameId, organizer.id);

    await acceptInviteLink(asDb(database), {
      token,
      userId: invitee.id,
      joinGroup: true,
    });
    expect(await preferredSideOf(database, gameId, invitee.id)).toBeNull();
  });

  it("refuses a side on a Game whose players pick a Game team seat", async () => {
    const database = await testDatabase();
    const organizer = await insertAmericanoUser(database, "Hassan Haji");
    const invitee = await insertAmericanoUser(database, "Ali Haji");
    const [venue] = await database
      .insert(venues)
      .values({ name: "World Padel Academy", city: "Manama", country: "BH" })
      .returning({ id: venues.id });
    if (!venue) {
      throw new Error("Failed to insert venue");
    }
    const [game] = await database
      .insert(games)
      .values({
        format: GameFormatEnum.FRIENDLY_GAME,
        venueId: venue.id,
        createdBy: organizer.id,
        isPublic: true,
        playersAllowed: 4,
        windowStart: START,
        windowEnd: END,
      })
      .returning({ id: games.id });
    if (!game) {
      throw new Error("Failed to insert game");
    }
    await database.insert(matches).values({ gameId: game.id });
    const token = await tokenFor(database, game.id, organizer.id);

    const error = await acceptInviteLink(asDb(database), {
      token,
      userId: invitee.id,
      sideIndex: 1,
      position: "left",
      preferredSide: "left",
    }).then(
      () => null,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(TRPCError);
    expect((error as TRPCError).message).toMatch(/signs up alone/);
  });
});

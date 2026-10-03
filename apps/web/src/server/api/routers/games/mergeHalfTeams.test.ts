import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  gameTeamPlayers,
  gameTeams,
  games,
  groups,
  user,
  venues,
} from "@repo/db/schema";

import { gameById } from "~/server/api/routers/games/byId";
import { createTournament } from "~/server/api/routers/games/createTournament";
import { leaveGame } from "~/server/api/routers/games/leave";
import { mergeHalfTeams } from "~/server/api/routers/games/mergeHalfTeams";
import { registerSeat } from "~/server/api/routers/games/registerSeat";
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

async function insertGroup(database: TestDatabase, createdBy: string) {
  const [row] = await database
    .insert(groups)
    .values({ name: `Group ${crypto.randomUUID()}`, createdBy })
    .returning({ id: groups.id });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row;
}

async function insertFourTeamTournament(
  database: TestDatabase,
  createdBy: string,
  venueId: string,
) {
  const group = await insertGroup(database, createdBy);
  const windowStart = new Date("2026-09-20T18:00:00");
  const windowEnd = new Date("2026-10-11T19:00:00");
  const created = await createTournament(database, {
    createdBy,
    name: "Autumn Friendly",
    groupId: group.id,
    isPublic: true,
    registrationMode: "individual",
    teamCount: 4,
    poolCount: 1,
    venueId,
    matchMinutes: 45,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 24 * 60 * 60 * 1000),
  });
  // Legacy multi-week rows still schedule. Create refuses this window.
  await database
    .update(games)
    .set({ windowEnd })
    .where(eq(games.id, created.id));
  return created.id;
}

function occupantUserId(
  side: { left: { userId: string } | null; right: { userId: string } | null },
  position: "left" | "right",
) {
  return side[position]?.userId ?? null;
}

async function expectRefused(
  run: () => Promise<unknown>,
  code: TRPCError["code"],
  message: string,
) {
  try {
    await run();
    throw new Error("expected the merge to be refused");
  } catch (error) {
    expect(error).toBeInstanceOf(TRPCError);
    if (!(error instanceof TRPCError)) {
      return;
    }
    expect(error.code).toBe(code);
    expect(error.message).toBe(message);
  }
}

describe("mergeHalfTeams", () => {
  it("merges two opposite-Position Half teams into one ad-hoc Game team", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-clean@example.com");
      const ada = await insertUser(db, "ada-clean@example.com", "Ada");
      const jonas = await insertUser(db, "jonas-clean@example.com", "Jonas");
      const venue = await insertVenue(db);
      const gameId = await insertFourTeamTournament(db, owner.id, venue.id);

      await registerSeat(db, {
        gameId,
        userId: ada.id,
        sideIndex: 1,
        position: "left",
      });
      await registerSeat(db, {
        gameId,
        userId: jonas.id,
        sideIndex: 2,
        position: "right",
      });

      const before = await gameById(db, { gameId, userId: owner.id });
      const first = before.sides.find((side) => side.sideIndex === 1);
      const second = before.sides.find((side) => side.sideIndex === 2);
      expect(first?.gameTeamId).toBeTruthy();
      expect(second?.gameTeamId).toBeTruthy();
      expect(occupantUserId(first!, "left")).toBe(ada.id);
      expect(occupantUserId(first!, "right")).toBeNull();
      expect(occupantUserId(second!, "left")).toBeNull();
      expect(occupantUserId(second!, "right")).toBe(jonas.id);

      const merged = await mergeHalfTeams(db, {
        gameId,
        organizerUserId: owner.id,
        firstGameTeamId: first!.gameTeamId!,
        secondGameTeamId: second!.gameTeamId!,
        firstPosition: "left",
        secondPosition: "right",
      });
      expect(merged).toEqual({ ok: true, gameTeamId: first!.gameTeamId });

      const after = await gameById(db, { gameId, userId: owner.id });
      const kept = after.sides.find((side) => side.sideIndex === 1);
      const vacated = after.sides.find((side) => side.sideIndex === 2);
      expect(occupantUserId(kept!, "left")).toBe(ada.id);
      expect(occupantUserId(kept!, "right")).toBe(jonas.id);
      expect(kept?.gameTeamId).toBe(first!.gameTeamId);
      expect(vacated?.gameTeamId).toBeNull();
      expect(occupantUserId(vacated!, "left")).toBeNull();
      expect(occupantUserId(vacated!, "right")).toBeNull();

      const team = await db.query.gameTeams.findFirst({
        where: eq(gameTeams.id, first!.gameTeamId!),
      });
      expect(team?.teamId).toBeNull();

      const leftover = await db.query.gameTeams.findFirst({
        where: eq(gameTeams.id, second!.gameTeamId!),
      });
      expect(leftover).toBeUndefined();
    } finally {
      await close();
    }
  });

  it("assigns swapped Positions when the Organizer swaps who plays left", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-swap@example.com");
      const ada = await insertUser(db, "ada-swap@example.com", "Ada");
      const jonas = await insertUser(db, "jonas-swap@example.com", "Jonas");
      const venue = await insertVenue(db);
      const gameId = await insertFourTeamTournament(db, owner.id, venue.id);

      await registerSeat(db, {
        gameId,
        userId: ada.id,
        sideIndex: 1,
        position: "left",
      });
      await registerSeat(db, {
        gameId,
        userId: jonas.id,
        sideIndex: 2,
        position: "left",
      });

      const before = await gameById(db, { gameId, userId: owner.id });
      const first = before.sides.find((side) => side.sideIndex === 1);
      const second = before.sides.find((side) => side.sideIndex === 2);

      await mergeHalfTeams(db, {
        gameId,
        organizerUserId: owner.id,
        firstGameTeamId: first!.gameTeamId!,
        secondGameTeamId: second!.gameTeamId!,
        firstPosition: "right",
        secondPosition: "left",
      });

      const after = await gameById(db, { gameId, userId: owner.id });
      const kept = after.sides.find((side) => side.sideIndex === 1);
      expect(occupantUserId(kept!, "left")).toBe(jonas.id);
      expect(occupantUserId(kept!, "right")).toBe(ada.id);
    } finally {
      await close();
    }
  });

  it("refuses a same-Position assignment before writing", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-same@example.com");
      const ada = await insertUser(db, "ada-same@example.com", "Ada");
      const jonas = await insertUser(db, "jonas-same@example.com", "Jonas");
      const venue = await insertVenue(db);
      const gameId = await insertFourTeamTournament(db, owner.id, venue.id);

      await registerSeat(db, {
        gameId,
        userId: ada.id,
        sideIndex: 1,
        position: "left",
      });
      await registerSeat(db, {
        gameId,
        userId: jonas.id,
        sideIndex: 2,
        position: "left",
      });

      const before = await gameById(db, { gameId, userId: owner.id });
      const first = before.sides.find((side) => side.sideIndex === 1);
      const second = before.sides.find((side) => side.sideIndex === 2);

      await expectRefused(
        () =>
          mergeHalfTeams(db, {
            gameId,
            organizerUserId: owner.id,
            firstGameTeamId: first!.gameTeamId!,
            secondGameTeamId: second!.gameTeamId!,
            firstPosition: "left",
            secondPosition: "left",
          }),
        "BAD_REQUEST",
        "Both Users would play the same Position",
      );

      const after = await gameById(db, { gameId, userId: owner.id });
      expect(
        occupantUserId(
          after.sides.find((side) => side.sideIndex === 1)!,
          "left",
        ),
      ).toBe(ada.id);
      expect(
        occupantUserId(
          after.sides.find((side) => side.sideIndex === 2)!,
          "left",
        ),
      ).toBe(jonas.id);
      const stillTwo = await db.query.gameTeams.findMany({
        where: eq(gameTeams.gameId, gameId),
      });
      expect(stillTwo).toHaveLength(2);
    } finally {
      await close();
    }
  });

  it("refuses a non-organizer", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-auth@example.com");
      const ada = await insertUser(db, "ada-auth@example.com", "Ada");
      const jonas = await insertUser(db, "jonas-auth@example.com", "Jonas");
      const venue = await insertVenue(db);
      const gameId = await insertFourTeamTournament(db, owner.id, venue.id);

      await registerSeat(db, {
        gameId,
        userId: ada.id,
        sideIndex: 1,
        position: "left",
      });
      await registerSeat(db, {
        gameId,
        userId: jonas.id,
        sideIndex: 2,
        position: "right",
      });

      const before = await gameById(db, { gameId, userId: owner.id });
      const first = before.sides.find((side) => side.sideIndex === 1);
      const second = before.sides.find((side) => side.sideIndex === 2);

      await expectRefused(
        () =>
          mergeHalfTeams(db, {
            gameId,
            organizerUserId: ada.id,
            firstGameTeamId: first!.gameTeamId!,
            secondGameTeamId: second!.gameTeamId!,
            firstPosition: "left",
            secondPosition: "right",
          }),
        "FORBIDDEN",
        "Only an organizer can do that",
      );
    } finally {
      await close();
    }
  });

  it("lets either User leave the merged Game team, freeing only their Position", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-leave@example.com");
      const ada = await insertUser(db, "ada-leave@example.com", "Ada");
      const jonas = await insertUser(db, "jonas-leave@example.com", "Jonas");
      const venue = await insertVenue(db);
      const gameId = await insertFourTeamTournament(db, owner.id, venue.id);

      await registerSeat(db, {
        gameId,
        userId: ada.id,
        sideIndex: 1,
        position: "left",
      });
      await registerSeat(db, {
        gameId,
        userId: jonas.id,
        sideIndex: 2,
        position: "right",
      });

      const before = await gameById(db, { gameId, userId: owner.id });
      const first = before.sides.find((side) => side.sideIndex === 1);
      const second = before.sides.find((side) => side.sideIndex === 2);

      await mergeHalfTeams(db, {
        gameId,
        organizerUserId: owner.id,
        firstGameTeamId: first!.gameTeamId!,
        secondGameTeamId: second!.gameTeamId!,
        firstPosition: "left",
        secondPosition: "right",
      });

      await leaveGame(db, { gameId, userId: ada.id });

      const remainingLinks = await db.query.gameTeamPlayers.findMany({
        where: eq(gameTeamPlayers.gameTeamId, first!.gameTeamId!),
      });
      expect(remainingLinks).toHaveLength(1);
      expect(remainingLinks[0]?.position).toBe("right");

      const jonasView = await gameById(db, { gameId, userId: jonas.id });
      expect(jonasView.isSeated).toBe(true);
      const leftover = jonasView.sides.find((side) => side.sideIndex === 1);
      expect(occupantUserId(leftover!, "left")).toBeNull();
      expect(occupantUserId(leftover!, "right")).toBe(jonas.id);

      const adaView = await gameById(db, { gameId, userId: ada.id });
      expect(adaView.isSeated).toBe(false);
    } finally {
      await close();
    }
  });

  it("refuses merge once the Pool draw is posted", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-drawn@example.com");
      const ada = await insertUser(db, "ada-drawn@example.com", "Ada");
      const jonas = await insertUser(db, "jonas-drawn@example.com", "Jonas");
      const venue = await insertVenue(db);
      const gameId = await insertFourTeamTournament(db, owner.id, venue.id);

      await registerSeat(db, {
        gameId,
        userId: ada.id,
        sideIndex: 1,
        position: "left",
      });
      await registerSeat(db, {
        gameId,
        userId: jonas.id,
        sideIndex: 2,
        position: "right",
      });

      await db
        .update(games)
        .set({ drawPostedAt: new Date() })
        .where(eq(games.id, gameId));

      const before = await gameById(db, { gameId, userId: owner.id });
      const first = before.sides.find((side) => side.sideIndex === 1);
      const second = before.sides.find((side) => side.sideIndex === 2);

      await expectRefused(
        () =>
          mergeHalfTeams(db, {
            gameId,
            organizerUserId: owner.id,
            firstGameTeamId: first!.gameTeamId!,
            secondGameTeamId: second!.gameTeamId!,
            firstPosition: "left",
            secondPosition: "right",
          }),
        "FORBIDDEN",
        "The groups are drawn",
      );
    } finally {
      await close();
    }
  });
});

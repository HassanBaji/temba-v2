import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { games, groups, user, venues } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { createFriendlyGame } from "#src/games/create-friendly";
import { resolveTeamSeat } from "#src/games/seats";
import { gameById } from "#src/routers/games/byId";
import { leaveGame } from "#src/routers/games/leave";
import { moveSeat } from "#src/routers/games/moveSeat";
import { registerSeat } from "#src/routers/games/registerSeat";

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${name.toLowerCase()}@example.com` })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertPublicFriendly(database: TestDatabase, createdBy: string) {
  const [venue] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Lisbon",
      country: "PT",
    })
    .returning({ id: venues.id });
  const [group] = await database
    .insert(groups)
    .values({ name: `Group ${crypto.randomUUID()}`, createdBy })
    .returning({ id: groups.id });
  if (!venue || !group) {
    throw new Error("Failed to insert Venue or Group");
  }
  const windowStart = new Date(Date.now() + 60 * 60 * 1000);
  const created = await createFriendlyGame(database, {
    createdBy,
    groupId: group.id,
    venueId: venue.id,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 90 * 60 * 1000),
  });
  await database
    .update(games)
    .set({ isPublic: true })
    .where(eq(games.id, created.game.id));
  return created.game;
}

async function sideOne(database: TestDatabase, gameId: string, userId: string) {
  const game = await gameById(database, { gameId, userId });
  const side = game.sides.find((row) => row.sideIndex === 1);
  if (!side) {
    throw new Error("expected side 1");
  }
  return side;
}

describe("resolveTeamSeat", () => {
  it("holds left for an Either-side User on an empty Game team", () => {
    expect(resolveTeamSeat(null, "either")).toEqual({
      ok: true,
      position: "left",
      eitherSide: true,
      partner: null,
    });
  });

  it("moves an Either-side partner off the Position the joiner picks", () => {
    expect(
      resolveTeamSeat({ position: "left", eitherSide: true }, "left"),
    ).toEqual({
      ok: true,
      position: "left",
      eitherSide: false,
      partner: { position: "right", eitherSide: false },
    });
  });

  it("settles an Either-side partner where they are when the joiner takes the other Position", () => {
    expect(
      resolveTeamSeat({ position: "left", eitherSide: true }, "right"),
    ).toEqual({
      ok: true,
      position: "right",
      eitherSide: false,
      partner: { position: "left", eitherSide: false },
    });
  });

  it("keeps two Either-side Users Either side", () => {
    expect(
      resolveTeamSeat({ position: "left", eitherSide: true }, "either"),
    ).toEqual({
      ok: true,
      position: "right",
      eitherSide: true,
      partner: null,
    });
  });

  it("takes the open Position beside a partner who picked one, settled", () => {
    expect(
      resolveTeamSeat({ position: "right", eitherSide: false }, "either"),
    ).toEqual({
      ok: true,
      position: "left",
      eitherSide: false,
      partner: null,
    });
  });

  it("refuses the Position a partner picked", () => {
    expect(
      resolveTeamSeat({ position: "left", eitherSide: false }, "left"),
    ).toEqual({ ok: false });
  });
});

describe("registerSeat Either side", () => {
  it("joins a Game team without a Position and the next User takes either one", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const ada = await insertUser(db, "Ada");
      const sofia = await insertUser(db, "Sofia");
      const game = await insertPublicFriendly(db, ada.id);

      await registerSeat(db, {
        gameId: game.id,
        userId: ada.id,
        sideIndex: 1,
        position: "either",
      });
      const held = await sideOne(db, game.id, ada.id);
      expect(held.left).toMatchObject({ userId: ada.id, eitherSide: true });
      expect(held.right).toBeNull();

      await registerSeat(db, {
        gameId: game.id,
        userId: sofia.id,
        sideIndex: 1,
        position: "left",
      });
      const settled = await sideOne(db, game.id, ada.id);
      expect(settled.left).toMatchObject({
        userId: sofia.id,
        eitherSide: false,
      });
      expect(settled.right).toMatchObject({
        userId: ada.id,
        eitherSide: false,
      });
    } finally {
      await close();
    }
  });

  it("refuses a Position a User picked, even to an Either-side joiner's partner", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const ada = await insertUser(db, "Ada");
      const sofia = await insertUser(db, "Sofia");
      const omar = await insertUser(db, "Omar");
      const game = await insertPublicFriendly(db, ada.id);

      await registerSeat(db, {
        gameId: game.id,
        userId: ada.id,
        sideIndex: 1,
        position: "either",
      });
      await registerSeat(db, {
        gameId: game.id,
        userId: sofia.id,
        sideIndex: 1,
        position: "right",
      });

      await expect(
        registerSeat(db, {
          gameId: game.id,
          userId: omar.id,
          sideIndex: 1,
          position: "either",
        }),
      ).rejects.toThrow("That side already has two Users");
    } finally {
      await close();
    }
  });

  it("frees the held Position when an Either-side User leaves", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const ada = await insertUser(db, "Ada");
      const game = await insertPublicFriendly(db, ada.id);

      await registerSeat(db, {
        gameId: game.id,
        userId: ada.id,
        sideIndex: 1,
        position: "either",
      });
      await leaveGame(db, { gameId: game.id, userId: ada.id });

      const side = await sideOne(db, game.id, ada.id);
      expect(side.left).toBeNull();
      expect(side.right).toBeNull();
    } finally {
      await close();
    }
  });

  it("lets a seated User move onto an Either-side partner's Position", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const ada = await insertUser(db, "Ada");
      const sofia = await insertUser(db, "Sofia");
      const game = await insertPublicFriendly(db, ada.id);

      await registerSeat(db, {
        gameId: game.id,
        userId: ada.id,
        sideIndex: 1,
        position: "either",
      });
      await registerSeat(db, {
        gameId: game.id,
        userId: sofia.id,
        sideIndex: 2,
        position: "left",
      });
      await moveSeat(db, {
        gameId: game.id,
        userId: sofia.id,
        sideIndex: 1,
        position: "left",
      });

      const side = await sideOne(db, game.id, ada.id);
      expect(side.left).toMatchObject({ userId: sofia.id });
      expect(side.right).toMatchObject({ userId: ada.id, eitherSide: false });
    } finally {
      await close();
    }
  });
});

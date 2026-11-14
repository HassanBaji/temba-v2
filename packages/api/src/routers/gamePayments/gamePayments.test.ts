import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  courts,
  gamePayments as gamePaymentsTable,
  groupMembers,
  groups,
  notifications,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { type db } from "#src/db";
import { insertUser } from "#src/marks/marks.test-support";
import { createGame } from "#src/routers/games/create";
import { register } from "#src/routers/games/register";
import { claimPayment } from "#src/routers/gamePayments/claim";
import { confirmAllPayments } from "#src/routers/gamePayments/confirmAll";
import { gamePaymentsForGame } from "#src/routers/gamePayments/forGame";
import { markPaymentNotReceived } from "#src/routers/gamePayments/markNotReceived";
import { markPaymentPaid } from "#src/routers/gamePayments/markPaid";
import { remindPayments } from "#src/routers/gamePayments/remind";
import { undoPayment } from "#src/routers/gamePayments/undo";
import { unclaimPayment } from "#src/routers/gamePayments/unclaim";

const HOUR = 60 * 60 * 1000;

function asDb(database: TestDatabase): typeof db {
  return database as unknown as typeof db;
}

async function withDb(run: (db: TestDatabase) => Promise<void>) {
  const { db: database, close } = await createPgliteDb();
  try {
    await run(database);
  } finally {
    await close();
  }
}

async function footballGame(
  database: TestDatabase,
  options: {
    trackPayments?: boolean;
    keepersPlayFree?: boolean;
    price?: number;
  } = {},
) {
  const organizer = await insertUser(database, "Organizer");
  const [venue] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Manama",
      country: "BH",
    })
    .returning({ id: venues.id });
  const [pitch] = await database
    .insert(courts)
    .values({ venueId: venue!.id, name: "Pitch 2", sport: "football" })
    .returning({ id: courts.id });
  const [group] = await database
    .insert(groups)
    .values({
      name: "Friday Football",
      createdBy: organizer.id,
      sport: "football",
    })
    .returning({ id: groups.id });
  await database
    .insert(groupMembers)
    .values({ groupId: group!.id, userId: organizer.id });
  const windowStart = new Date(Date.now() + 3 * HOUR);
  const created = await createGame(asDb(database), {
    createdBy: organizer.id,
    groupId: group!.id,
    isPublic: false,
    format: "friendly_game",
    registrationMode: "individual",
    venueId: venue!.id,
    courtId: pitch!.id,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + HOUR),
    pricePerPlayerFils: options.price ?? 1500,
    trackPayments: options.trackPayments ?? true,
    keepersPlayFree: options.keepersPlayFree ?? true,
  });
  async function addPlayer(name: string, keeper = false) {
    const player = await insertUser(database, name);
    await database
      .insert(groupMembers)
      .values({ groupId: group!.id, userId: player.id });
    await register(asDb(database), {
      gameId: created.id,
      userId: player.id,
      football: keeper
        ? { role: "keeper", position: "def" }
        : { role: "outfield", position: "mid" },
    });
    return player;
  }
  const yousif = await addPlayer("Yousif");
  const ali = await addPlayer("Ali");
  const salman = await addPlayer("Salman");
  const hamad = await addPlayer("Hamad", true);
  const outsider = await insertUser(database, "Outsider");
  return {
    gameId: created.id,
    organizer,
    yousif,
    ali,
    salman,
    hamad,
    outsider,
  };
}

async function statusOf(
  database: TestDatabase,
  gameId: string,
  userId: string,
) {
  const row = await database.query.gamePayments.findFirst({
    where: and(
      eq(gamePaymentsTable.gameId, gameId),
      eq(gamePaymentsTable.userId, userId),
    ),
  });
  return row?.status ?? null;
}

describe("gamePayments", () => {
  it("stores tracking at create", async () => {
    await withDb(async (database) => {
      const game = await footballGame(database);
      const row = await database.query.games.findFirst({
        where: (table, { eq: equals }) => equals(table.id, game.gameId),
        columns: { trackPayments: true, keepersPlayFree: true },
      });
      expect(row).toEqual({ trackPayments: true, keepersPlayFree: true });
    });
  });

  it("runs claim, confirm, send back and undo, with only a confirmation making it paid", async () => {
    await withDb(async (database) => {
      const game = await footballGame(database);
      const d = asDb(database);

      await claimPayment(d, { gameId: game.gameId, userId: game.yousif.id });
      expect(await statusOf(database, game.gameId, game.yousif.id)).toBe(
        "claimed",
      );

      const asYousif = await gamePaymentsForGame(d, {
        gameId: game.gameId,
        userId: game.yousif.id,
      });
      expect(asYousif.tracked && asYousif.viewer?.status).toBe("claimed");
      expect(asYousif.tracked && asYousif.manage).toBeNull();
      expect(asYousif.tracked && asYousif.tally).toMatchObject({
        paid: 0,
        claimed: 1,
        due: 2,
        free: 1,
        expectedFils: 4500,
      });

      await unclaimPayment(d, { gameId: game.gameId, userId: game.yousif.id });
      expect(await statusOf(database, game.gameId, game.yousif.id)).toBeNull();

      await claimPayment(d, { gameId: game.gameId, userId: game.yousif.id });
      await markPaymentNotReceived(d, {
        gameId: game.gameId,
        actorUserId: game.organizer.id,
        playerUserId: game.yousif.id,
        reason: "nothing_arrived",
        note: "  Can you check?  ",
      });
      const returned = await database.query.gamePayments.findFirst({
        where: eq(gamePaymentsTable.userId, game.yousif.id),
      });
      expect(returned).toMatchObject({
        status: "not_received",
        returnReason: "nothing_arrived",
        returnNote: "Can you check?",
        returnedByUserId: game.organizer.id,
      });
      const notice = await database.query.notifications.findFirst({
        where: eq(notifications.recipientUserId, game.yousif.id),
      });
      expect(notice?.type).toBe("game_payment_not_received");

      await claimPayment(d, { gameId: game.gameId, userId: game.yousif.id });
      await markPaymentPaid(d, {
        gameId: game.gameId,
        actorUserId: game.organizer.id,
        playerUserId: game.yousif.id,
      });
      expect(await statusOf(database, game.gameId, game.yousif.id)).toBe(
        "paid",
      );
      await expect(
        unclaimPayment(d, { gameId: game.gameId, userId: game.yousif.id }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });

      await undoPayment(d, {
        gameId: game.gameId,
        actorUserId: game.organizer.id,
        playerUserId: game.yousif.id,
      });
      expect(await statusOf(database, game.gameId, game.yousif.id)).toBeNull();
    });
  });

  it("keeps players' own claims to themselves and Organizer actions to Organizers", async () => {
    await withDb(async (database) => {
      const game = await footballGame(database);
      const d = asDb(database);
      await claimPayment(d, { gameId: game.gameId, userId: game.ali.id });
      await expect(
        markPaymentPaid(d, {
          gameId: game.gameId,
          actorUserId: game.yousif.id,
          playerUserId: game.ali.id,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        claimPayment(d, { gameId: game.gameId, userId: game.outsider.id }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(
        claimPayment(d, { gameId: game.gameId, userId: game.hamad.id }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });

      const asOrganizer = await gamePaymentsForGame(d, {
        gameId: game.gameId,
        userId: game.organizer.id,
      });
      expect(asOrganizer.tracked && asOrganizer.canManage).toBe(true);
      expect(
        asOrganizer.tracked &&
          asOrganizer.manage?.find((row) => row.userId === game.hamad.id)?.mark,
      ).toBe("free");
    });
  });

  it("confirms every claim at once and reminds only who has not paid", async () => {
    await withDb(async (database) => {
      const game = await footballGame(database);
      const d = asDb(database);
      await claimPayment(d, { gameId: game.gameId, userId: game.yousif.id });
      await claimPayment(d, { gameId: game.gameId, userId: game.ali.id });

      await expect(
        confirmAllPayments(d, {
          gameId: game.gameId,
          actorUserId: game.organizer.id,
        }),
      ).resolves.toEqual({ confirmed: 2 });
      expect(await statusOf(database, game.gameId, game.ali.id)).toBe("paid");

      await expect(
        remindPayments(d, {
          gameId: game.gameId,
          actorUserId: game.organizer.id,
        }),
      ).resolves.toEqual({ reminded: 1 });
      await remindPayments(d, {
        gameId: game.gameId,
        actorUserId: game.organizer.id,
      });
      const reminders = await database.query.notifications.findMany({
        where: eq(notifications.type, "game_payment_reminder"),
      });
      expect(reminders.map((row) => row.recipientUserId)).toEqual([
        game.salman.id,
      ]);
    });
  });

  it("reads untracked on a Game without tracking and refuses changes", async () => {
    await withDb(async (database) => {
      const game = await footballGame(database, { trackPayments: false });
      const d = asDb(database);
      await expect(
        gamePaymentsForGame(d, { gameId: game.gameId, userId: game.yousif.id }),
      ).resolves.toEqual({ tracked: false });
      await expect(
        claimPayment(d, { gameId: game.gameId, userId: game.yousif.id }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });
});

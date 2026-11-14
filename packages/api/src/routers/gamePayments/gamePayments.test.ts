import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  courts,
  gamePaymentEvents,
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
import { setFootballRole } from "#src/routers/games/setFootballRole";
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
  options: { trackPayments?: boolean; keepersPlayFree?: boolean } = {},
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
    pricePerPlayerFils: 1500,
    trackPayments: options.trackPayments ?? true,
    keepersPlayFree: options.keepersPlayFree ?? true,
  });
  async function join(userId: string, keeper = false) {
    await register(asDb(database), {
      gameId: created.id,
      userId,
      football: keeper
        ? { role: "keeper", position: "def" }
        : { role: "outfield", position: "mid" },
    });
  }
  async function addPlayer(name: string, keeper = false) {
    const player = await insertUser(database, name);
    await database
      .insert(groupMembers)
      .values({ groupId: group!.id, userId: player.id });
    await join(player.id, keeper);
    return player;
  }
  const yousif = await addPlayer("Yousif");
  const ali = await addPlayer("Ali");
  const salman = await addPlayer("Salman");
  const hamad = await addPlayer("Hamad", true);
  const outsider = await insertUser(database, "Outsider");
  return {
    gameId: created.id,
    kickOff: windowStart,
    organizer,
    organizerJoins: () => join(organizer.id),
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

async function tracked(
  database: TestDatabase,
  args: { gameId: string; userId: string; now?: Date },
) {
  const result = await gamePaymentsForGame(asDb(database), args);
  if (!result.tracked) {
    throw new Error("Expected a Game that tracks payments");
  }
  return result;
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

  it("runs claim, confirm, send back and undo, and records who made each change", async () => {
    await withDb(async (database) => {
      const game = await footballGame(database);
      const d = asDb(database);
      const { gameId } = game;

      await claimPayment(d, { gameId, userId: game.yousif.id });
      expect(await statusOf(database, gameId, game.yousif.id)).toBe("claimed");

      const asYousif = await tracked(database, {
        gameId,
        userId: game.yousif.id,
      });
      expect(asYousif.viewer?.status).toBe("claimed");
      expect(asYousif.manage).toBeNull();
      expect(asYousif.tally).toEqual({
        paid: 0,
        claimed: 1,
        due: 2,
        free: 1,
        payers: 3,
      });

      await unclaimPayment(d, { gameId, userId: game.yousif.id });
      expect(await statusOf(database, gameId, game.yousif.id)).toBeNull();

      await claimPayment(d, { gameId, userId: game.yousif.id });
      await markPaymentNotReceived(d, {
        gameId,
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

      await claimPayment(d, { gameId, userId: game.yousif.id });
      await markPaymentPaid(d, {
        gameId,
        actorUserId: game.organizer.id,
        playerUserId: game.yousif.id,
      });
      expect(await statusOf(database, gameId, game.yousif.id)).toBe("paid");
      const asOrganizer = await tracked(database, {
        gameId,
        userId: game.organizer.id,
      });
      expect(
        asOrganizer.manage?.rows.find((row) => row.userId === game.yousif.id)
          ?.paidBy,
      ).toEqual({ isViewer: true, name: "Organizer" });
      await expect(
        unclaimPayment(d, { gameId, userId: game.yousif.id }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });

      await undoPayment(d, {
        gameId,
        actorUserId: game.organizer.id,
        playerUserId: game.yousif.id,
      });
      expect(await statusOf(database, gameId, game.yousif.id)).toBeNull();

      const events = await database.query.gamePaymentEvents.findMany({
        where: eq(gamePaymentEvents.gameId, gameId),
        orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
      });
      expect(
        events
          .map((event) => [
            event.action,
            event.actorUserId === game.organizer.id ? "organizer" : "player",
          ])
          .sort(),
      ).toEqual(
        [
          ["claimed", "player"],
          ["unclaimed", "player"],
          ["claimed", "player"],
          ["not_received", "organizer"],
          ["claimed", "player"],
          ["paid", "organizer"],
          ["undone", "organizer"],
        ].sort(),
      );
    });
  });

  it("tells the Game admins of a claim once, and again after it is sent back", async () => {
    await withDb(async (database) => {
      const game = await footballGame(database);
      const d = asDb(database);
      const { gameId } = game;
      const claims = () =>
        database.query.notifications.findMany({
          where: eq(notifications.type, "game_payment_claimed"),
        });

      await claimPayment(d, { gameId, userId: game.yousif.id });
      await unclaimPayment(d, { gameId, userId: game.yousif.id });
      await claimPayment(d, { gameId, userId: game.yousif.id });
      await claimPayment(d, { gameId, userId: game.yousif.id });
      expect(
        (await claims()).map((row) => [row.recipientUserId, row.audience]),
      ).toEqual([[game.organizer.id, "admin"]]);

      await markPaymentNotReceived(d, {
        gameId,
        actorUserId: game.organizer.id,
        playerUserId: game.yousif.id,
      });
      await claimPayment(d, { gameId, userId: game.yousif.id });
      expect(await claims()).toHaveLength(2);
    });
  });

  it("keeps players' own claims to themselves and Organizer actions to Organizers", async () => {
    await withDb(async (database) => {
      const game = await footballGame(database);
      const d = asDb(database);
      const { gameId } = game;
      await claimPayment(d, { gameId, userId: game.ali.id });
      await expect(
        markPaymentPaid(d, {
          gameId,
          actorUserId: game.yousif.id,
          playerUserId: game.ali.id,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        claimPayment(d, { gameId, userId: game.outsider.id }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(
        claimPayment(d, { gameId, userId: game.hamad.id }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });

      const asOrganizer = await tracked(database, {
        gameId,
        userId: game.organizer.id,
      });
      expect(asOrganizer.canManage).toBe(true);
      expect(
        asOrganizer.manage?.rows.find((row) => row.userId === game.hamad.id)
          ?.mark,
      ).toBe("free");
      expect(asOrganizer.manage).toMatchObject({
        collectedFils: 0,
        expectedFils: 4500,
      });
    });
  });

  it("confirms every claim at once", async () => {
    await withDb(async (database) => {
      const game = await footballGame(database);
      const d = asDb(database);
      const { gameId } = game;
      await claimPayment(d, { gameId, userId: game.yousif.id });
      await claimPayment(d, { gameId, userId: game.ali.id });
      await expect(
        confirmAllPayments(d, { gameId, actorUserId: game.organizer.id }),
      ).resolves.toEqual({ confirmed: 2 });
      expect(await statusOf(database, gameId, game.ali.id)).toBe("paid");
    });
  });

  it("reminds who has not paid, never the sender, and once a day", async () => {
    await withDb(async (database) => {
      const game = await footballGame(database);
      const d = asDb(database);
      const { gameId } = game;
      await game.organizerJoins();
      await markPaymentPaid(d, {
        gameId,
        actorUserId: game.organizer.id,
        playerUserId: game.yousif.id,
      });

      const before = await tracked(database, {
        gameId,
        userId: game.organizer.id,
      });
      expect(before.tally.due).toBe(3);
      expect(before.manage?.reminders).toEqual({
        toRemind: 2,
        remindedToday: 0,
      });

      await expect(
        remindPayments(d, { gameId, actorUserId: game.organizer.id }),
      ).resolves.toEqual({ reminded: 2 });
      await expect(
        remindPayments(d, { gameId, actorUserId: game.organizer.id }),
      ).resolves.toEqual({ reminded: 0 });
      const reminders = await database.query.notifications.findMany({
        where: eq(notifications.type, "game_payment_reminder"),
      });
      expect(reminders.map((row) => row.recipientUserId).sort()).toEqual(
        [game.ali.id, game.salman.id].sort(),
      );
      const after = await tracked(database, {
        gameId,
        userId: game.organizer.id,
      });
      expect(after.manage?.reminders).toEqual({
        toRemind: 0,
        remindedToday: 2,
      });
    });
  });

  it("follows the keeper spot until kick-off and fixes it from then on", async () => {
    await withDb(async (database) => {
      const game = await footballGame(database);
      const d = asDb(database);
      const { gameId } = game;
      const markOf = async (userId: string, now?: Date) =>
        (
          await tracked(database, { gameId, userId: game.organizer.id, now })
        ).players.find((row) => row.userId === userId)?.mark;

      await setFootballRole(d, {
        gameId,
        userId: game.yousif.id,
        role: "keeper",
        position: "def",
      });
      expect(await markOf(game.yousif.id)).toBe("free");
      await setFootballRole(d, {
        gameId,
        userId: game.yousif.id,
        role: "outfield",
        position: "mid",
      });
      expect(await markOf(game.yousif.id)).toBe("due");

      const afterKickOff = new Date(game.kickOff.getTime() + 10 * 60 * 1000);
      await setFootballRole(d, {
        gameId,
        userId: game.hamad.id,
        role: "outfield",
        position: "mid",
        now: afterKickOff,
      });
      await setFootballRole(d, {
        gameId,
        userId: game.ali.id,
        role: "keeper",
        position: "def",
        now: afterKickOff,
      });
      expect(await markOf(game.hamad.id, afterKickOff)).toBe("free");
      expect(await markOf(game.ali.id, afterKickOff)).toBe("due");
    });
  });

  it("keeps a paid player's payment within the Organizer's reach once they play free", async () => {
    await withDb(async (database) => {
      const game = await footballGame(database);
      const d = asDb(database);
      const { gameId } = game;
      await markPaymentPaid(d, {
        gameId,
        actorUserId: game.organizer.id,
        playerUserId: game.yousif.id,
      });
      await setFootballRole(d, {
        gameId,
        userId: game.yousif.id,
        role: "keeper",
        position: "def",
      });

      const asOrganizer = await tracked(database, {
        gameId,
        userId: game.organizer.id,
      });
      expect(
        asOrganizer.manage?.rows.find((row) => row.userId === game.yousif.id),
      ).toMatchObject({ mark: "free", status: "paid" });
      expect(asOrganizer.manage).toMatchObject({
        collectedFils: 1500,
        expectedFils: 3000,
      });

      await undoPayment(d, {
        gameId,
        actorUserId: game.organizer.id,
        playerUserId: game.yousif.id,
      });
      expect(await statusOf(database, gameId, game.yousif.id)).toBeNull();
    });
  });

  it("reads untracked on a Game without tracking and refuses changes", async () => {
    await withDb(async (database) => {
      const game = await footballGame(database, { trackPayments: false });
      const d = asDb(database);
      await expect(
        gamePaymentsForGame(d, {
          gameId: game.gameId,
          userId: game.yousif.id,
        }),
      ).resolves.toEqual({ tracked: false });
      await expect(
        claimPayment(d, { gameId: game.gameId, userId: game.yousif.id }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });
});

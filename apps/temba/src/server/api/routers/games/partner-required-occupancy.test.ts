import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  gamePlayers,
  gameWaitlist,
  games,
  groups,
  user,
  venues,
} from "@repo/db/schema";

import {
  PARTNER_REQUIRED_FULL_MESSAGE,
  PARTNER_REQUIRED_REFUSAL_MESSAGE,
} from "~/lib/tournament-rounds";
import { createTournament } from "~/server/api/routers/games/createTournament";
import { drawPools } from "~/server/api/routers/games/drawPools";
import { gameById } from "~/server/api/routers/games/byId";
import { kick } from "~/server/api/routers/games/kick";
import { leaveGame } from "~/server/api/routers/games/leave";
import { mergeHalfTeams } from "~/server/api/routers/games/mergeHalfTeams";
import { moveSeat } from "~/server/api/routers/games/moveSeat";
import { registerSeat } from "~/server/api/routers/games/registerSeat";
import { registerWithPartner } from "~/server/api/routers/games/registerWithPartner";
import { sendLookupInvite } from "~/server/api/routers/games/sendLookupInvite";
import { requireGame } from "~/server/games/access";
import { occupySeat } from "~/server/games/seats";
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

async function insertTournament(
  database: TestDatabase,
  args: { createdBy: string; venueId: string; allowSoloRegister?: boolean },
) {
  const group = await insertGroup(database, args.createdBy);
  const windowStart = new Date("2026-09-20T18:00:00");
  const windowEnd = new Date("2026-10-11T19:00:00");
  const created = await createTournament(database, {
    createdBy: args.createdBy,
    name: "Autumn Friendly",
    groupId: group.id,
    isPublic: true,
    allowSoloRegister: args.allowSoloRegister,
    teamCount: 4,
    poolCount: 1,
    venueId: args.venueId,
    matchMinutes: 45,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 24 * 60 * 60 * 1000),
  });
  // Legacy multi-week rows still schedule. Create refuses this window.
  await database
    .update(games)
    .set({ windowEnd })
    .where(eq(games.id, created.id));
  return { gameId: created.id, groupId: group.id };
}

async function bookPair(
  database: TestDatabase,
  args: {
    gameId: string;
    caller: { id: string };
    partner: { id: string };
    sideIndex: number;
  },
) {
  return registerWithPartner(database, {
    gameId: args.gameId,
    userId: args.caller.id,
    partnerUserId: args.partner.id,
    sideIndex: args.sideIndex,
    position: "left",
  });
}

describe("partner-required occupancy", () => {
  it("refuses seat-register with a seat, without a seat, and leftover occupy", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-solo@example.com");
      const player = await insertUser(db, "solo@example.com");
      const leftover = await insertUser(db, "leftover@example.com");
      const venue = await insertVenue(db);
      const created = await insertTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
        allowSoloRegister: false,
      });

      await expect(
        registerSeat(db, {
          gameId: created.gameId,
          userId: player.id,
          sideIndex: 1,
          position: "left",
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: PARTNER_REQUIRED_REFUSAL_MESSAGE,
      });
      await expect(
        registerSeat(db, {
          gameId: created.gameId,
          userId: player.id,
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: PARTNER_REQUIRED_REFUSAL_MESSAGE,
      });

      await db.insert(gamePlayers).values({
        gameId: created.gameId,
        userId: leftover.id,
      });
      await expect(
        registerSeat(db, {
          gameId: created.gameId,
          userId: leftover.id,
          sideIndex: 1,
          position: "left",
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: PARTNER_REQUIRED_REFUSAL_MESSAGE,
      });
    } finally {
      await close();
    }
  });

  it("books a pair onto a vacant side and refuses when the field is full", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-pair@example.com");
      const venue = await insertVenue(db);
      const created = await insertTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
        allowSoloRegister: false,
      });

      for (let sideIndex = 1; sideIndex <= 4; sideIndex += 1) {
        const caller = await insertUser(db, `caller-${sideIndex}@example.com`);
        const partner = await insertUser(
          db,
          `partner-${sideIndex}@example.com`,
        );
        const result = await bookPair(db, {
          gameId: created.gameId,
          caller,
          partner,
          sideIndex,
        });
        expect(result).toEqual({ ok: true, waitlisted: false });
      }

      const extraCaller = await insertUser(db, "extra-caller@example.com");
      const extraPartner = await insertUser(db, "extra-partner@example.com");
      await expect(
        bookPair(db, {
          gameId: created.gameId,
          caller: extraCaller,
          partner: extraPartner,
          sideIndex: 1,
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: PARTNER_REQUIRED_FULL_MESSAGE,
      });

      const waitRows = await db.query.gameWaitlist.findMany({
        where: eq(gameWaitlist.gameId, created.gameId),
      });
      expect(waitRows).toHaveLength(0);

      const detail = await gameById(db, {
        gameId: created.gameId,
        userId: extraCaller.id,
      });
      expect(detail.isSeated).toBe(false);
      expect(detail.isWaitlisted).toBe(false);
    } finally {
      await close();
    }
  });

  it("refuses Lookup, move, and merge", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-doors@example.com");
      const invitee = await insertUser(db, "invitee@example.com");
      const venue = await insertVenue(db);
      const created = await insertTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
        allowSoloRegister: false,
      });
      const caller = await insertUser(db, "caller-doors@example.com");
      const partner = await insertUser(db, "partner-doors@example.com");
      await bookPair(db, {
        gameId: created.gameId,
        caller,
        partner,
        sideIndex: 1,
      });

      await expect(
        sendLookupInvite(db, {
          gameId: created.gameId,
          userId: owner.id,
          userIds: [invitee.id],
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: PARTNER_REQUIRED_REFUSAL_MESSAGE,
      });
      await expect(
        moveSeat(db, {
          gameId: created.gameId,
          userId: caller.id,
          sideIndex: 2,
          position: "left",
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: PARTNER_REQUIRED_REFUSAL_MESSAGE,
      });
      await expect(
        mergeHalfTeams(db, {
          gameId: created.gameId,
          organizerUserId: owner.id,
          firstGameTeamId: crypto.randomUUID(),
          secondGameTeamId: crypto.randomUUID(),
          firstPosition: "left",
          secondPosition: "right",
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: PARTNER_REQUIRED_REFUSAL_MESSAGE,
      });
    } finally {
      await close();
    }
  });

  it("does not solo-seat a leftover Waitlist row when a side frees", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-wait@example.com");
      const waiter = await insertUser(db, "waiter@example.com");
      const venue = await insertVenue(db);
      const created = await insertTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
        allowSoloRegister: false,
      });
      const caller = await insertUser(db, "caller-wait@example.com");
      const partner = await insertUser(db, "partner-wait@example.com");
      await bookPair(db, {
        gameId: created.gameId,
        caller,
        partner,
        sideIndex: 1,
      });
      await db.insert(gameWaitlist).values({
        gameId: created.gameId,
        userId: waiter.id,
      });

      await leaveGame(db, { gameId: created.gameId, userId: caller.id });

      const waitRows = await db.query.gameWaitlist.findMany({
        where: eq(gameWaitlist.gameId, created.gameId),
      });
      expect(waitRows).toHaveLength(1);
      expect(waitRows[0]?.userId).toBe(waiter.id);
      const detail = await gameById(db, {
        gameId: created.gameId,
        userId: waiter.id,
      });
      expect(detail.isSeated).toBe(false);
    } finally {
      await close();
    }
  });

  it("removes both Users on pre-draw leave or kick, and still frees only the leaver when allow-alone", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-leave@example.com");
      const venue = await insertVenue(db);
      const required = await insertTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
        allowSoloRegister: false,
      });
      const caller = await insertUser(db, "caller-leave@example.com");
      const partner = await insertUser(db, "partner-leave@example.com");
      await bookPair(db, {
        gameId: required.gameId,
        caller,
        partner,
        sideIndex: 1,
      });
      await leaveGame(db, { gameId: required.gameId, userId: caller.id });
      const afterLeave = await gameById(db, {
        gameId: required.gameId,
        userId: partner.id,
      });
      expect(afterLeave.isSeated).toBe(false);
      expect(
        afterLeave.sides.every(
          (side) => side.left == null && side.right == null,
        ),
      ).toBe(true);

      const kickCaller = await insertUser(db, "caller-kick@example.com");
      const kickPartner = await insertUser(db, "partner-kick@example.com");
      await bookPair(db, {
        gameId: required.gameId,
        caller: kickCaller,
        partner: kickPartner,
        sideIndex: 2,
      });
      await kick(db, {
        gameId: required.gameId,
        organizerUserId: owner.id,
        userId: kickCaller.id,
      });
      const afterKick = await gameById(db, {
        gameId: required.gameId,
        userId: kickPartner.id,
      });
      expect(afterKick.isSeated).toBe(false);

      const allowAlone = await insertTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
        allowSoloRegister: true,
      });
      const aloneCaller = await insertUser(db, "alone-caller@example.com");
      const alonePartner = await insertUser(db, "alone-partner@example.com");
      await bookPair(db, {
        gameId: allowAlone.gameId,
        caller: aloneCaller,
        partner: alonePartner,
        sideIndex: 1,
      });
      await leaveGame(db, {
        gameId: allowAlone.gameId,
        userId: aloneCaller.id,
      });
      const afterAlone = await gameById(db, {
        gameId: allowAlone.gameId,
        userId: alonePartner.id,
      });
      expect(afterAlone.isSeated).toBe(true);
      const remaining = afterAlone.sides.find(
        (side) => side.right?.userId === alonePartner.id,
      );
      expect(remaining?.left).toBeNull();
    } finally {
      await close();
    }
  });

  it("still needs four complete Game teams to draw and refuses while a Half team exists", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-draw@example.com");
      const venue = await insertVenue(db);
      const created = await insertTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
        allowSoloRegister: false,
      });

      for (let sideIndex = 1; sideIndex <= 3; sideIndex += 1) {
        const caller = await insertUser(
          db,
          `draw-caller-${sideIndex}@example.com`,
        );
        const partner = await insertUser(
          db,
          `draw-partner-${sideIndex}@example.com`,
        );
        await bookPair(db, {
          gameId: created.gameId,
          caller,
          partner,
          sideIndex,
        });
      }

      await expect(
        drawPools(db, { gameId: created.gameId, organizerUserId: owner.id }),
      ).rejects.toBeInstanceOf(TRPCError);

      const fourthCaller = await insertUser(db, "draw-caller-4@example.com");
      const fourthPartner = await insertUser(db, "draw-partner-4@example.com");
      await bookPair(db, {
        gameId: created.gameId,
        caller: fourthCaller,
        partner: fourthPartner,
        sideIndex: 4,
      });
      const drawn = await drawPools(db, {
        gameId: created.gameId,
        organizerUserId: owner.id,
      });
      expect(drawn.ok).toBe(true);
    } finally {
      await close();
    }
  });

  it("still refuses the Pool draw while a Half team exists", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-half@example.com");
      const half = await insertUser(db, "half@example.com");
      const venue = await insertVenue(db);
      const created = await insertTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
        allowSoloRegister: false,
      });
      const [player] = await db
        .insert(gamePlayers)
        .values({
          gameId: created.gameId,
          userId: half.id,
        })
        .returning({ id: gamePlayers.id, userId: gamePlayers.userId });
      if (!player?.userId) {
        throw new Error("expected leftover player");
      }
      const leftoverUserId = player.userId;
      const game = await requireGame(db, created.gameId);
      await db.transaction(async (tx) => {
        await occupySeat(tx, game, leftoverUserId, 1, "left", player.id);
      });

      await expect(
        drawPools(db, { gameId: created.gameId, organizerUserId: owner.id }),
      ).rejects.toMatchObject({
        message: expect.stringMatching(/Half teams remain/u),
      });
    } finally {
      await close();
    }
  });
});

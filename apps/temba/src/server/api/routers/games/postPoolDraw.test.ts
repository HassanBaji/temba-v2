import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  courts,
  gameTeams,
  gameWaitlist,
  games,
  groups,
  matchSets,
  matches,
  user,
  venues,
} from "@repo/db/schema";

import { acceptInviteLink } from "~/server/api/routers/games/acceptInviteLink";
import { acceptLookupInvite } from "~/server/api/routers/games/acceptLookupInvite";
import { addSet } from "~/server/api/routers/games/addSet";
import { gameById } from "~/server/api/routers/games/byId";
import { createTournament } from "~/server/api/routers/games/createTournament";
import { drawPools } from "~/server/api/routers/games/drawPools";
import { kick } from "~/server/api/routers/games/kick";
import { leaveGame } from "~/server/api/routers/games/leave";
import { mergeHalfTeams } from "~/server/api/routers/games/mergeHalfTeams";
import { moveSeat } from "~/server/api/routers/games/moveSeat";
import { postPoolDraw } from "~/server/api/routers/games/postPoolDraw";
import { registerSeat } from "~/server/api/routers/games/registerSeat";
import { registerWithPartner } from "~/server/api/routers/games/registerWithPartner";
import { reopenRegistration } from "~/server/api/routers/games/reopenRegistration";
import { sendLookupInvite } from "~/server/api/routers/games/sendLookupInvite";
import { undoPoolDraw } from "~/server/api/routers/games/undoPoolDraw";
import { POOL_DRAW_POSTED_MESSAGE } from "~/server/games/assert-pool-draw-not-posted";
import { mintLink } from "~/server/invites/doors";
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
    .values({ name: `Group ${crypto.randomUUID()}`, createdBy })
    .returning({ id: groups.id });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row;
}

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

describe("postPoolDraw", () => {
  it("posts an even Pool one-day schedule with exact Round, Court, time and Game teams", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-even-day@example.com");
      const venue = await insertVenue(db);
      const courtA = await insertCourt(db, venue.id, "Court 1");
      const courtB = await insertCourt(db, venue.id, "Court 2");
      const gameId = await insertTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
        teamCount: 4,
        poolCount: 1,
        courtIds: [courtA.id, courtB.id],
        windowStart: new Date("2026-09-20T10:00:00"),
        windowEnd: new Date("2026-09-20T16:00:00"),
      });
      const players = await insertNamedUsers(db, "even-day", 8);
      await fillCompleteTeams(db, gameId, players, 4);
      await drawPools(db, {
        gameId,
        organizerUserId: owner.id,
        shuffle: identityShuffle,
      });

      const posted = await postPoolDraw(db, {
        gameId,
        organizerUserId: owner.id,
      });
      expect(posted.matchCount).toBe(6);

      const game = await db.query.games.findFirst({
        where: eq(games.id, gameId),
      });
      expect(game?.drawPostedAt).toBeInstanceOf(Date);
      expect(game?.registrationClosedAt).toBeInstanceOf(Date);

      expect(await postedSchedule(db, gameId)).toEqual([
        {
          roundNumber: 1,
          startTime: new Date("2026-09-20T10:00:00"),
          courtId: courtA.id,
          slot1: 1,
          slot2: 4,
        },
        {
          roundNumber: 1,
          startTime: new Date("2026-09-20T10:00:00"),
          courtId: courtB.id,
          slot1: 2,
          slot2: 3,
        },
        {
          roundNumber: 2,
          startTime: new Date("2026-09-20T10:45:00"),
          courtId: courtA.id,
          slot1: 1,
          slot2: 3,
        },
        {
          roundNumber: 2,
          startTime: new Date("2026-09-20T10:45:00"),
          courtId: courtB.id,
          slot1: 4,
          slot2: 2,
        },
        {
          roundNumber: 3,
          startTime: new Date("2026-09-20T11:30:00"),
          courtId: courtA.id,
          slot1: 1,
          slot2: 2,
        },
        {
          roundNumber: 3,
          startTime: new Date("2026-09-20T11:30:00"),
          courtId: courtB.id,
          slot1: 3,
          slot2: 4,
        },
      ]);

      const detail = await gameById(db, { gameId, userId: owner.id });
      expect(detail.drawPostedAt).toBeInstanceOf(Date);
      expect(detail.matches).toHaveLength(6);
      expect(detail.matches.map((match) => match.roundNumber).sort()).toEqual([
        1, 1, 2, 2, 3, 3,
      ]);
    } finally {
      await close();
    }
  });

  it("posts a few-weeks even Pool with each Round on its own date", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-weeks@example.com");
      const venue = await insertVenue(db);
      const courtA = await insertCourt(db, venue.id, "Court 1");
      const courtB = await insertCourt(db, venue.id, "Court 2");
      const gameId = await insertTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
        teamCount: 4,
        poolCount: 1,
        courtIds: [courtA.id, courtB.id],
        windowStart: new Date("2026-09-20T18:00:00"),
        windowEnd: new Date("2026-10-04T18:45:00"),
      });
      const players = await insertNamedUsers(db, "weeks", 8);
      await fillCompleteTeams(db, gameId, players, 4);
      await drawPools(db, {
        gameId,
        organizerUserId: owner.id,
        shuffle: identityShuffle,
      });
      await postPoolDraw(db, { gameId, organizerUserId: owner.id });

      expect(await postedSchedule(db, gameId)).toEqual([
        {
          roundNumber: 1,
          startTime: new Date("2026-09-20T18:00:00"),
          courtId: courtA.id,
          slot1: 1,
          slot2: 4,
        },
        {
          roundNumber: 1,
          startTime: new Date("2026-09-20T18:00:00"),
          courtId: courtB.id,
          slot1: 2,
          slot2: 3,
        },
        {
          roundNumber: 2,
          startTime: new Date("2026-09-27T18:00:00"),
          courtId: courtA.id,
          slot1: 1,
          slot2: 3,
        },
        {
          roundNumber: 2,
          startTime: new Date("2026-09-27T18:00:00"),
          courtId: courtB.id,
          slot1: 4,
          slot2: 2,
        },
        {
          roundNumber: 3,
          startTime: new Date("2026-10-04T18:00:00"),
          courtId: courtA.id,
          slot1: 1,
          slot2: 2,
        },
        {
          roundNumber: 3,
          startTime: new Date("2026-10-04T18:00:00"),
          courtId: courtB.id,
          slot1: 3,
          slot2: 4,
        },
      ]);
    } finally {
      await close();
    }
  });

  it("posts odd Pools with bye Rounds and no Game team playing twice in a Round", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-odd@example.com");
      const venue = await insertVenue(db);
      const courtA = await insertCourt(db, venue.id, "Court 1");
      const courtB = await insertCourt(db, venue.id, "Court 2");
      const gameId = await insertTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
        teamCount: 6,
        poolCount: 2,
        courtIds: [courtA.id, courtB.id],
        windowStart: new Date("2026-09-20T10:00:00"),
        windowEnd: new Date("2026-09-20T16:00:00"),
      });
      const players = await insertNamedUsers(db, "odd", 12);
      await fillCompleteTeams(db, gameId, players, 6);
      await drawPools(db, {
        gameId,
        organizerUserId: owner.id,
        shuffle: identityShuffle,
      });
      await postPoolDraw(db, { gameId, organizerUserId: owner.id });

      expect(await postedSchedule(db, gameId)).toEqual([
        {
          roundNumber: 1,
          startTime: new Date("2026-09-20T10:00:00"),
          courtId: courtA.id,
          slot1: 2,
          slot2: 3,
        },
        {
          roundNumber: 1,
          startTime: new Date("2026-09-20T10:00:00"),
          courtId: courtB.id,
          slot1: 5,
          slot2: 6,
        },
        {
          roundNumber: 2,
          startTime: new Date("2026-09-20T10:45:00"),
          courtId: courtA.id,
          slot1: 1,
          slot2: 3,
        },
        {
          roundNumber: 2,
          startTime: new Date("2026-09-20T10:45:00"),
          courtId: courtB.id,
          slot1: 4,
          slot2: 6,
        },
        {
          roundNumber: 3,
          startTime: new Date("2026-09-20T11:30:00"),
          courtId: courtA.id,
          slot1: 1,
          slot2: 2,
        },
        {
          roundNumber: 3,
          startTime: new Date("2026-09-20T11:30:00"),
          courtId: courtB.id,
          slot1: 4,
          slot2: 5,
        },
      ]);

      const byRound = new Map<number, number[]>();
      for (const row of await postedSchedule(db, gameId)) {
        const sides = byRound.get(row.roundNumber ?? 0) ?? [];
        if (row.slot1 != null) {
          sides.push(row.slot1);
        }
        if (row.slot2 != null) {
          sides.push(row.slot2);
        }
        byRound.set(row.roundNumber ?? 0, sides);
      }
      for (const sides of byRound.values()) {
        expect(new Set(sides).size).toBe(sides.length);
      }
    } finally {
      await close();
    }
  });

  it("closes outstanding Waitlist entries and keeps an existing registration close", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-wait@example.com");
      const venue = await insertVenue(db);
      const courtA = await insertCourt(db, venue.id, "Court 1");
      const gameId = await insertTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
        teamCount: 4,
        poolCount: 1,
        courtIds: [courtA.id],
        windowStart: new Date("2026-09-20T10:00:00"),
        windowEnd: new Date("2026-09-20T16:00:00"),
      });
      const players = await insertNamedUsers(db, "wait-full", 8);
      await fillCompleteTeams(db, gameId, players, 4);
      const waiter = await insertUser(db, "waiter@example.com", "Waiter");
      const waitlisted = await registerSeat(db, {
        gameId,
        userId: waiter.id,
        sideIndex: 1,
        position: "left",
      });
      expect(waitlisted.waitlisted).toBe(true);
      const closedAt = new Date("2026-09-19T12:00:00");
      await db
        .update(games)
        .set({ registrationClosedAt: closedAt })
        .where(eq(games.id, gameId));
      await drawPools(db, {
        gameId,
        organizerUserId: owner.id,
        shuffle: identityShuffle,
      });
      await postPoolDraw(db, { gameId, organizerUserId: owner.id });

      const remaining = await db.query.gameWaitlist.findMany({
        where: eq(gameWaitlist.gameId, gameId),
      });
      expect(remaining).toHaveLength(0);
      const game = await db.query.games.findFirst({
        where: eq(games.id, gameId),
      });
      expect(game?.registrationClosedAt).toEqual(closedAt);
    } finally {
      await close();
    }
  });

  it("refuses a non-organizer", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-auth@example.com");
      const ada = await insertUser(db, "ada-auth@example.com", "Ada");
      const venue = await insertVenue(db);
      const courtA = await insertCourt(db, venue.id, "Court 1");
      const gameId = await insertTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
        teamCount: 4,
        poolCount: 1,
        courtIds: [courtA.id],
        windowStart: new Date("2026-09-20T10:00:00"),
        windowEnd: new Date("2026-09-20T16:00:00"),
      });
      const players = await insertNamedUsers(db, "auth", 8);
      await fillCompleteTeams(db, gameId, players, 4);
      await drawPools(db, {
        gameId,
        organizerUserId: owner.id,
        shuffle: identityShuffle,
      });
      await expectRefused(
        () => postPoolDraw(db, { gameId, organizerUserId: ada.id }),
        "FORBIDDEN",
        "Only an organizer can do that",
      );
    } finally {
      await close();
    }
  });
});

describe("Pool draw freeze", () => {
  it("refuses seat changes, invites, merge and reopen with a Pool draw reason", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedDrawnEvenOneDay(db, "freeze");
      const outsider = await insertUser(db, "outsider-freeze@example.com");
      const partner = await insertUser(db, "partner-freeze@example.com");
      const lookupInvitee = await insertUser(db, "lookup-freeze@example.com");
      const linkInvitee = await insertUser(db, "link-freeze@example.com");
      const sent = await sendLookupInvite(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        userIds: [lookupInvitee.id],
      });
      const inviteId = sent.sent[0]?.id;
      if (!inviteId) {
        throw new Error("Expected Lookup invite");
      }
      const minted = await mintLink(
        db,
        { kind: "game", id: seeded.gameId },
        { createdBy: seeded.owner.id },
      );
      expect(minted.ok).toBe(true);
      if (!minted.ok) {
        return;
      }
      await postPoolDraw(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
      });

      await expectRefused(
        () =>
          leaveGame(db, {
            gameId: seeded.gameId,
            userId: seeded.players[0]!.id,
          }),
        "FORBIDDEN",
        POOL_DRAW_POSTED_MESSAGE,
      );
      await expectRefused(
        () =>
          moveSeat(db, {
            gameId: seeded.gameId,
            userId: seeded.players[0]!.id,
            sideIndex: 2,
            position: "left",
          }),
        "FORBIDDEN",
        POOL_DRAW_POSTED_MESSAGE,
      );
      await expectRefused(
        () =>
          registerSeat(db, {
            gameId: seeded.gameId,
            userId: outsider.id,
            sideIndex: 1,
            position: "left",
          }),
        "FORBIDDEN",
        POOL_DRAW_POSTED_MESSAGE,
      );
      await expectRefused(
        () =>
          registerWithPartner(db, {
            gameId: seeded.gameId,
            userId: outsider.id,
            partnerUserId: partner.id,
            sideIndex: 1,
            position: "left",
          }),
        "FORBIDDEN",
        POOL_DRAW_POSTED_MESSAGE,
      );
      await expectRefused(
        () =>
          reopenRegistration(db, {
            gameId: seeded.gameId,
            userId: seeded.owner.id,
          }),
        "FORBIDDEN",
        POOL_DRAW_POSTED_MESSAGE,
      );
      await expectRefused(
        () =>
          drawPools(db, {
            gameId: seeded.gameId,
            organizerUserId: seeded.owner.id,
            shuffle: identityShuffle,
          }),
        "FORBIDDEN",
        POOL_DRAW_POSTED_MESSAGE,
      );

      await expectRefused(
        () =>
          acceptLookupInvite(db, {
            inviteId,
            userId: lookupInvitee.id,
            sideIndex: 1,
            position: "left",
          }),
        "FORBIDDEN",
        POOL_DRAW_POSTED_MESSAGE,
      );

      await expectRefused(
        () =>
          acceptInviteLink(db, {
            token: minted.link.token,
            userId: linkInvitee.id,
            sideIndex: 1,
            position: "left",
          }),
        "FORBIDDEN",
        POOL_DRAW_POSTED_MESSAGE,
      );

      await kick(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        userId: seeded.players[0]!.id,
      });
      await kick(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        userId: seeded.players[2]!.id,
      });
      const detail = await gameById(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      const first = detail.sides.find((side) => side.sideIndex === 1);
      const second = detail.sides.find((side) => side.sideIndex === 2);
      await expectRefused(
        () =>
          mergeHalfTeams(db, {
            gameId: seeded.gameId,
            organizerUserId: seeded.owner.id,
            firstGameTeamId: first!.gameTeamId!,
            secondGameTeamId: second!.gameTeamId!,
            firstPosition: "left",
            secondPosition: "right",
          }),
        "FORBIDDEN",
        POOL_DRAW_POSTED_MESSAGE,
      );
    } finally {
      await close();
    }
  });

  it("keeps Organizer kick available after posting", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedEvenOneDay(db, "kick");
      const kicked = await kick(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        userId: seeded.players[0]!.id,
      });
      expect(kicked).toEqual({ ok: true });
      const detail = await gameById(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      const side1 = detail.sides.find((side) => side.sideIndex === 1);
      expect(side1?.left).toBeNull();
    } finally {
      await close();
    }
  });
});

describe("undoPoolDraw", () => {
  it("deletes every Pool Match and clears every Pool assignment", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedEvenOneDay(db, "undo");
      const undone = await undoPoolDraw(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
      });
      expect(undone).toEqual({ ok: true });

      const matchRows = await db.query.matches.findMany({
        where: eq(matches.gameId, seeded.gameId),
      });
      expect(matchRows).toHaveLength(0);
      const teams = await db.query.gameTeams.findMany({
        where: eq(gameTeams.gameId, seeded.gameId),
      });
      expect(teams.every((team) => team.poolIndex == null)).toBe(true);
      const game = await db.query.games.findFirst({
        where: eq(games.id, seeded.gameId),
      });
      expect(game?.drawPostedAt).toBeNull();

      await leaveGame(db, {
        gameId: seeded.gameId,
        userId: seeded.players[0]!.id,
      });
    } finally {
      await close();
    }
  });

  it("refuses undo once a Pool Match has a Set", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedEvenOneDay(db, "undo-set");
      const [match] = await db.query.matches.findMany({
        where: eq(matches.gameId, seeded.gameId),
      });
      if (!match) {
        throw new Error("Expected a Pool Match");
      }
      await addSet(db, {
        gameId: seeded.gameId,
        matchId: match.id,
        userId: seeded.owner.id,
      });
      await expectRefused(
        () =>
          undoPoolDraw(db, {
            gameId: seeded.gameId,
            organizerUserId: seeded.owner.id,
          }),
        "FORBIDDEN",
        "Cannot undo the group draw after a Set has been played",
      );
      const remaining = await db.query.matches.findMany({
        where: eq(matches.gameId, seeded.gameId),
      });
      expect(remaining).toHaveLength(6);
      const sets = await db.query.matchSets.findMany({
        where: eq(matchSets.matchId, match.id),
      });
      expect(sets).toHaveLength(1);
    } finally {
      await close();
    }
  });

  it("refuses undo once a Pool Match is completed", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedEvenOneDay(db, "undo-done");
      const [match] = await db.query.matches.findMany({
        where: eq(matches.gameId, seeded.gameId),
      });
      if (!match) {
        throw new Error("Expected a Pool Match");
      }
      await db
        .update(matches)
        .set({ status: "completed" })
        .where(eq(matches.id, match.id));
      await expectRefused(
        () =>
          undoPoolDraw(db, {
            gameId: seeded.gameId,
            organizerUserId: seeded.owner.id,
          }),
        "FORBIDDEN",
        "Cannot undo the group draw after a Set has been played",
      );
    } finally {
      await close();
    }
  });

  it("refuses a non-organizer", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedEvenOneDay(db, "undo-auth");
      const ada = await insertUser(db, "ada-undo@example.com", "Ada");
      await expectRefused(
        () =>
          undoPoolDraw(db, {
            gameId: seeded.gameId,
            organizerUserId: ada.id,
          }),
        "FORBIDDEN",
        "Only an organizer can do that",
      );
    } finally {
      await close();
    }
  });
});

import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  courts,
  gameTeams,
  gameWaitlist,
  games,
  groups,
  matches,
  user,
  venues,
} from "@repo/db/schema";

import {
  addMatch,
  KNOCKOUT_MATCH_BY_HAND_MESSAGE,
} from "~/server/api/routers/games/addMatch";
import { addSet } from "~/server/api/routers/games/addSet";
import { gameById } from "~/server/api/routers/games/byId";
import { createTournament } from "~/server/api/routers/games/createTournament";
import { drawPools } from "~/server/api/routers/games/drawPools";
import { postPoolDraw } from "~/server/api/routers/games/postPoolDraw";
import { registerSeat } from "~/server/api/routers/games/registerSeat";
import {
  UNDO_KNOCKOUT_AFTER_SET_MESSAGE,
  undoPoolDraw,
} from "~/server/api/routers/games/undoPoolDraw";
import { updateMatch } from "~/server/api/routers/games/updateMatch";
import { KNOCKOUT_MATCH_SIDES_MESSAGE } from "~/server/games/update-tournament-match";
import { fewWeeksRoundStarts } from "@repo/domain/tournament-schedule";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

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

function reverseShuffle<T>(items: readonly T[]): T[] {
  return [...items].reverse();
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

async function seedKnockout(
  database: TestDatabase,
  prefix: string,
  args: { teamCount: number; completeTeams: number; courtCount?: number },
) {
  const owner = await insertUser(database, `${prefix}-owner@example.com`);
  const venue = await insertVenue(database);
  const courtRows = [];
  for (let index = 0; index < (args.courtCount ?? 2); index += 1) {
    courtRows.push(await insertCourt(database, venue.id, `Court ${index + 1}`));
  }
  const group = await insertGroup(database, owner.id);
  const created = await createTournament(database, {
    createdBy: owner.id,
    name: "Knockout day",
    groupId: group.id,
    isPublic: true,
    registrationMode: "individual",
    tournamentShape: "knockout_only",
    teamCount: args.teamCount,
    venueId: venue.id,
    courtIds: courtRows.map((court) => court.id),
    matchMinutes: 45,
    windowStart: new Date("2026-09-20T10:00:00"),
    windowEnd: new Date("2026-09-20T18:00:00"),
  });
  const players = [];
  for (let index = 0; index < args.completeTeams * 2; index += 1) {
    players.push(
      await insertUser(
        database,
        `${prefix}-${index}@example.com`,
        `${prefix}-${index + 1}`,
      ),
    );
  }
  for (let index = 0; index < args.completeTeams; index += 1) {
    await registerSeat(database, {
      gameId: created.id,
      userId: players[index * 2]!.id,
      sideIndex: index + 1,
      position: "left",
    });
    await registerSeat(database, {
      gameId: created.id,
      userId: players[index * 2 + 1]!.id,
      sideIndex: index + 1,
      position: "right",
    });
  }
  return { owner, gameId: created.id, courts: courtRows, players };
}

async function teamIdsBySide(database: TestDatabase, gameId: string) {
  const rows = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, gameId),
  });
  const bySide = new Map<number, (typeof rows)[number]>();
  for (const row of rows) {
    if (row.sideIndex != null) {
      bySide.set(row.sideIndex, row);
    }
  }
  return bySide;
}

describe("createTournament with a Tournament shape", () => {
  it("stores Knockout only with no Pool count and no Round count", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedKnockout(db, "create-ko", {
        teamCount: 12,
        completeTeams: 0,
      });
      const game = await db.query.games.findFirst({
        where: eq(games.id, seeded.gameId),
      });
      expect(game).toMatchObject({
        format: "friendly_tournament",
        tournamentShape: "knockout_only",
        poolCount: null,
        roundCount: null,
        qualifiersPerPool: null,
        teamsAllowed: 12,
        playersAllowed: 24,
      });
    } finally {
      await close();
    }
  });

  it("stores Groups only by default with its Pool count", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "create-groups@example.com");
      const venue = await insertVenue(db);
      const group = await insertGroup(db, owner.id);
      const created = await createTournament(db, {
        createdBy: owner.id,
        name: "Groups day",
        groupId: group.id,
        isPublic: true,
        teamCount: 12,
        poolCount: 3,
        venueId: venue.id,
        matchMinutes: 45,
        windowStart: new Date("2026-09-20T10:00:00"),
        windowEnd: new Date("2026-09-20T18:00:00"),
      });
      const game = await db.query.games.findFirst({
        where: eq(games.id, created.id),
      });
      expect(game).toMatchObject({
        tournamentShape: "groups_only",
        poolCount: 3,
        teamsAllowed: 12,
      });
    } finally {
      await close();
    }
  });

  it("keeps the team count limits for Knockout only and ignores Pool and Round counts", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "create-limits@example.com");
      const venue = await insertVenue(db);
      const group = await insertGroup(db, owner.id);
      const base = {
        createdBy: owner.id,
        name: "Knockout day",
        groupId: group.id,
        isPublic: true,
        tournamentShape: "knockout_only" as const,
        venueId: venue.id,
        matchMinutes: 45,
        windowStart: new Date("2026-09-20T10:00:00"),
        windowEnd: new Date("2026-09-20T18:00:00"),
      };
      await expectRefused(
        () => createTournament(db, { ...base, teamCount: 2 }),
        "BAD_REQUEST",
        "Game team count must be between 4 and 32",
      );
      await expectRefused(
        () => createTournament(db, { ...base, teamCount: 34 }),
        "BAD_REQUEST",
        "Game team count must be between 4 and 32",
      );
      await expectRefused(
        () => createTournament(db, { ...base, teamCount: 7 }),
        "BAD_REQUEST",
        "Game team count must be even",
      );
      const created = await createTournament(db, {
        ...base,
        teamCount: 32,
        poolCount: 99,
        roundCount: 99,
      });
      const game = await db.query.games.findFirst({
        where: eq(games.id, created.id),
      });
      expect(game?.poolCount).toBeNull();
      expect(game?.roundCount).toBeNull();
    } finally {
      await close();
    }
  });
});

describe("drawPools on Knockout only", () => {
  it("writes a re-rollable draft order on the complete Game teams", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedKnockout(db, "draw-ko", {
        teamCount: 6,
        completeTeams: 6,
      });
      const drawn = await drawPools(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        shuffle: identityShuffle,
      });
      const bySide = await teamIdsBySide(db, seeded.gameId);
      expect(drawn.knockoutOrder).toEqual(
        [1, 2, 3, 4, 5, 6].map((side) => bySide.get(side)?.id),
      );
      expect(
        [1, 2, 3, 4, 5, 6].map((side) => bySide.get(side)?.knockoutSeed),
      ).toEqual([1, 2, 3, 4, 5, 6]);
      expect([...bySide.values()].every((team) => team.poolIndex == null)).toBe(
        true,
      );

      await drawPools(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        shuffle: reverseShuffle,
      });
      const rerolled = await teamIdsBySide(db, seeded.gameId);
      expect(
        [1, 2, 3, 4, 5, 6].map((side) => rerolled.get(side)?.knockoutSeed),
      ).toEqual([6, 5, 4, 3, 2, 1]);
      const game = await db.query.games.findFirst({
        where: eq(games.id, seeded.gameId),
      });
      expect(game?.drawPostedAt).toBeNull();
    } finally {
      await close();
    }
  });

  it("is blocked by Half teams with today's message", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedKnockout(db, "draw-half", {
        teamCount: 6,
        completeTeams: 4,
      });
      const half = await insertUser(db, "draw-half-solo@example.com", "Solo");
      await registerSeat(db, {
        gameId: seeded.gameId,
        userId: half.id,
        sideIndex: 5,
        position: "left",
      });
      await expectRefused(
        () =>
          drawPools(db, {
            gameId: seeded.gameId,
            organizerUserId: seeded.owner.id,
          }),
        "BAD_REQUEST",
        "Cannot draw the groups while Half teams remain: Solo",
      );
    } finally {
      await close();
    }
  });

  it("is blocked below 4 complete Game teams with today's message", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedKnockout(db, "draw-few", {
        teamCount: 6,
        completeTeams: 3,
      });
      await expectRefused(
        () =>
          drawPools(db, {
            gameId: seeded.gameId,
            organizerUserId: seeded.owner.id,
          }),
        "BAD_REQUEST",
        "Need at least 4 complete Game teams to draw the groups",
      );
    } finally {
      await close();
    }
  });
});

describe("postPoolDraw on Knockout only", () => {
  it("refuses to post before the knockout is drawn", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedKnockout(db, "post-undrawn", {
        teamCount: 4,
        completeTeams: 4,
      });
      await expectRefused(
        () =>
          postPoolDraw(db, {
            gameId: seeded.gameId,
            organizerUserId: seeded.owner.id,
          }),
        "BAD_REQUEST",
        "Draw the knockout before posting",
      );
    } finally {
      await close();
    }
  });

  it("sizes the tree to the drawn field, writes Bye teams into the second round and schedules every Match", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedKnockout(db, "post-short", {
        teamCount: 8,
        completeTeams: 6,
      });
      await drawPools(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        shuffle: identityShuffle,
      });
      const posted = await postPoolDraw(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
      });
      expect(posted).toEqual({ ok: true, matchCount: 5 });

      const bySide = await teamIdsBySide(db, seeded.gameId);
      const sideOf = (gameTeamId: string | null) => {
        for (const [side, team] of bySide) {
          if (team.id === gameTeamId) {
            return side;
          }
        }
        return null;
      };
      const [court1, court2] = seeded.courts;
      const rows = await db.query.matches.findMany({
        where: eq(matches.gameId, seeded.gameId),
      });
      const tree = rows
        .map((row) => ({
          knockoutRound: row.knockoutRound,
          knockoutPosition: row.knockoutPosition,
          roundNumber: row.roundNumber,
          startTime: row.startTime,
          courtId: row.courtId,
          slot1: sideOf(row.slot1GameTeamId),
          slot2: sideOf(row.slot2GameTeamId),
        }))
        .sort(
          (left, right) =>
            (left.knockoutRound ?? 0) - (right.knockoutRound ?? 0) ||
            (left.knockoutPosition ?? 0) - (right.knockoutPosition ?? 0),
        );
      expect(tree).toEqual([
        {
          knockoutRound: 1,
          knockoutPosition: 2,
          roundNumber: 1,
          startTime: new Date("2026-09-20T10:00:00"),
          courtId: court1?.id,
          slot1: 4,
          slot2: 5,
        },
        {
          knockoutRound: 1,
          knockoutPosition: 4,
          roundNumber: 1,
          startTime: new Date("2026-09-20T10:00:00"),
          courtId: court2?.id,
          slot1: 3,
          slot2: 6,
        },
        {
          knockoutRound: 2,
          knockoutPosition: 1,
          roundNumber: 2,
          startTime: new Date("2026-09-20T10:45:00"),
          courtId: court1?.id,
          slot1: 1,
          slot2: null,
        },
        {
          knockoutRound: 2,
          knockoutPosition: 2,
          roundNumber: 2,
          startTime: new Date("2026-09-20T10:45:00"),
          courtId: court2?.id,
          slot1: 2,
          slot2: null,
        },
        {
          knockoutRound: 3,
          knockoutPosition: 1,
          roundNumber: 3,
          startTime: new Date("2026-09-20T11:30:00"),
          courtId: court1?.id,
          slot1: null,
          slot2: null,
        },
      ]);

      const game = await db.query.games.findFirst({
        where: eq(games.id, seeded.gameId),
      });
      expect(game?.drawPostedAt).not.toBeNull();
      expect(game?.registrationClosedAt).not.toBeNull();
    } finally {
      await close();
    }
  });

  it("creates entrants minus one Matches with a Court and a time for a full field", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedKnockout(db, "post-full", {
        teamCount: 12,
        completeTeams: 12,
        courtCount: 3,
      });
      await drawPools(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
      });
      const posted = await postPoolDraw(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
      });
      expect(posted.matchCount).toBe(11);
      const rows = await db.query.matches.findMany({
        where: eq(matches.gameId, seeded.gameId),
      });
      expect(rows).toHaveLength(11);
      expect(
        rows.every((row) => row.courtId != null && row.startTime != null),
      ).toBe(true);
      expect(rows.every((row) => row.roundNumber === row.knockoutRound)).toBe(
        true,
      );
      const firstEntries = rows.flatMap((row) =>
        row.knockoutRound === 1 || row.knockoutRound === 2
          ? [row.slot1GameTeamId, row.slot2GameTeamId].filter(Boolean)
          : [],
      );
      expect(new Set(firstEntries).size).toBe(12);
      expect(firstEntries).toHaveLength(12);
      expect(rows.filter((row) => row.knockoutRound === 1)).toHaveLength(4);
    } finally {
      await close();
    }
  });

  it("gives each Knockout round its own date across a few-weeks window", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedKnockout(db, "post-weeks", {
        teamCount: 6,
        completeTeams: 6,
      });
      const windowStart = new Date("2026-09-20T10:00:00");
      const windowEnd = new Date("2026-10-11T10:45:00");
      await db
        .update(games)
        .set({ windowEnd })
        .where(eq(games.id, seeded.gameId));
      await drawPools(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
      });
      await postPoolDraw(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
      });
      const rows = await db.query.matches.findMany({
        where: eq(matches.gameId, seeded.gameId),
      });
      const starts = fewWeeksRoundStarts(windowStart, windowEnd, 3, 45);
      for (const row of rows) {
        expect(row.startTime).toEqual(starts[(row.knockoutRound ?? 0) - 1]);
      }
      expect(new Set(rows.map((row) => row.startTime?.getTime())).size).toBe(3);
    } finally {
      await close();
    }
  });

  it("closes the Waitlist exactly as posting a Pool draw does", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedKnockout(db, "post-wait", {
        teamCount: 4,
        completeTeams: 4,
      });
      const waiter = await insertUser(db, "post-wait-waiter@example.com");
      const waitlisted = await registerSeat(db, {
        gameId: seeded.gameId,
        userId: waiter.id,
        sideIndex: 1,
        position: "left",
      });
      expect(waitlisted.waitlisted).toBe(true);
      await drawPools(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
      });
      await postPoolDraw(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
      });
      const remaining = await db.query.gameWaitlist.findMany({
        where: eq(gameWaitlist.gameId, seeded.gameId),
      });
      expect(remaining).toHaveLength(0);
    } finally {
      await close();
    }
  });
});

async function seedPosted(database: TestDatabase, prefix: string) {
  const seeded = await seedKnockout(database, prefix, {
    teamCount: 8,
    completeTeams: 6,
  });
  await drawPools(database, {
    gameId: seeded.gameId,
    organizerUserId: seeded.owner.id,
    shuffle: identityShuffle,
  });
  await postPoolDraw(database, {
    gameId: seeded.gameId,
    organizerUserId: seeded.owner.id,
  });
  const rows = await database.query.matches.findMany({
    where: eq(matches.gameId, seeded.gameId),
  });
  const at = (round: number, position: number) => {
    const match = rows.find(
      (row) => row.knockoutRound === round && row.knockoutPosition === position,
    );
    if (!match) {
      throw new Error(`No Knockout Match at ${round}:${position}`);
    }
    return match;
  };
  return { ...seeded, at };
}

describe("undoPoolDraw on Knockout only", () => {
  it("deletes the Knockout Matches and clears the draft order", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPosted(db, "undo-ko");
      await expect(
        undoPoolDraw(db, {
          gameId: seeded.gameId,
          organizerUserId: seeded.owner.id,
        }),
      ).resolves.toEqual({ ok: true });
      const rows = await db.query.matches.findMany({
        where: eq(matches.gameId, seeded.gameId),
      });
      expect(rows).toHaveLength(0);
      const teams = await db.query.gameTeams.findMany({
        where: eq(gameTeams.gameId, seeded.gameId),
      });
      expect(teams.every((team) => team.knockoutSeed == null)).toBe(true);
      const game = await db.query.games.findFirst({
        where: eq(games.id, seeded.gameId),
      });
      expect(game?.drawPostedAt).toBeNull();
    } finally {
      await close();
    }
  });

  it("is refused once a Set is played", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPosted(db, "undo-ko-set");
      await addSet(db, {
        gameId: seeded.gameId,
        matchId: seeded.at(1, 2).id,
        userId: seeded.owner.id,
      });
      await expectRefused(
        () =>
          undoPoolDraw(db, {
            gameId: seeded.gameId,
            organizerUserId: seeded.owner.id,
          }),
        "FORBIDDEN",
        UNDO_KNOCKOUT_AFTER_SET_MESSAGE,
      );
      const detail = await gameById(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      expect(detail.canUndoDraw).toBe(false);
    } finally {
      await close();
    }
  });
});

describe("editing a Knockout Match", () => {
  it("changes Court and time but keeps the sides", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPosted(db, "edit-ko");
      const match = seeded.at(1, 2);
      const court2 = seeded.courts[1];
      await updateMatch(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        matchId: match.id,
        courtId: court2?.id,
        startTime: new Date("2026-09-20T12:00:00"),
        endTime: new Date("2026-09-20T12:45:00"),
      });
      const updated = await db.query.matches.findFirst({
        where: eq(matches.id, match.id),
      });
      expect(updated).toMatchObject({
        courtId: court2?.id,
        startTime: new Date("2026-09-20T12:00:00"),
        slot1GameTeamId: match.slot1GameTeamId,
        slot2GameTeamId: match.slot2GameTeamId,
        knockoutRound: 1,
        knockoutPosition: 2,
      });
    } finally {
      await close();
    }
  });

  it("refuses to change the sides", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPosted(db, "edit-ko-sides");
      const match = seeded.at(1, 2);
      const other = seeded.at(1, 4);
      await expectRefused(
        () =>
          updateMatch(db, {
            gameId: seeded.gameId,
            userId: seeded.owner.id,
            matchId: match.id,
            slot1GameTeamId: other.slot1GameTeamId,
          }),
        "BAD_REQUEST",
        KNOCKOUT_MATCH_SIDES_MESSAGE,
      );
      await expectRefused(
        () =>
          updateMatch(db, {
            gameId: seeded.gameId,
            userId: seeded.owner.id,
            matchId: seeded.at(3, 1).id,
            slot1GameTeamId: null,
            slot2GameTeamId: match.slot1GameTeamId,
          }),
        "BAD_REQUEST",
        KNOCKOUT_MATCH_SIDES_MESSAGE,
      );
    } finally {
      await close();
    }
  });

  it("keeps adding a Match by hand refused", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPosted(db, "add-ko");
      await expectRefused(
        () =>
          addMatch(db, {
            gameId: seeded.gameId,
            userId: seeded.owner.id,
            startTime: null,
            endTime: null,
            durationInMinutes: null,
            courtId: null,
            slot1GameTeamId: null,
            slot2GameTeamId: null,
          }),
        "BAD_REQUEST",
        KNOCKOUT_MATCH_BY_HAND_MESSAGE,
      );
    } finally {
      await close();
    }
  });
});

describe("gameById on Knockout only", () => {
  it("reads the drafted order before posting and the tree after", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedKnockout(db, "read-ko", {
        teamCount: 8,
        completeTeams: 6,
      });
      await drawPools(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        shuffle: identityShuffle,
      });
      const drafted = await gameById(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      expect(drafted.tournamentShape).toBe("knockout_only");
      expect(drafted.knockout).toBeNull();
      expect(drafted.poolTables).toBeNull();
      expect(
        drafted.gameTeams
          .map((team) => team.knockoutSeed)
          .sort((left, right) => (left ?? 0) - (right ?? 0)),
      ).toEqual([1, 2, 3, 4, 5, 6]);

      await postPoolDraw(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
      });
      const viewer = seeded.players[0]!;
      const posted = await gameById(db, {
        gameId: seeded.gameId,
        userId: viewer.id,
      });
      expect(posted.poolTables).toBeNull();
      expect(posted.canUndoDraw).toBe(true);
      const rounds = posted.knockout;
      expect(rounds?.map((round) => round.name)).toEqual([
        "Quarter-finals",
        "Semi-finals",
        "Final",
      ]);
      const name = (side: number) =>
        `${seeded.players[(side - 1) * 2]!.name} / ${seeded.players[(side - 1) * 2 + 1]!.name}`;
      const summary = rounds?.map((round) =>
        round.places.map((place) =>
          place.kind === "bye"
            ? {
                code: place.code,
                bye: place.side.kind === "team" ? place.side.team.name : null,
              }
            : {
                code: place.code,
                court: place.courtName,
                sides: [place.slot1, place.slot2].map((side) =>
                  side.kind === "team"
                    ? side.team.name
                    : side.kind === "winner_of"
                      ? side.label
                      : null,
                ),
              },
        ),
      );
      expect(summary).toEqual([
        [
          { code: "Q1", bye: name(1) },
          { code: "Q2", court: "Court 1", sides: [name(4), name(5)] },
          { code: "Q3", bye: name(2) },
          { code: "Q4", court: "Court 2", sides: [name(3), name(6)] },
        ],
        [
          { code: "S1", court: "Court 1", sides: [name(1), "Winner of Q2"] },
          { code: "S2", court: "Court 2", sides: [name(2), "Winner of Q4"] },
        ],
        [
          {
            code: "Final",
            court: "Court 1",
            sides: ["Winner of S1", "Winner of S2"],
          },
        ],
      ]);
      const viewerBye = rounds?.[0]?.places[0];
      expect(
        viewerBye?.kind === "bye" &&
          viewerBye.side.kind === "team" &&
          viewerBye.side.team.isViewer,
      ).toBe(true);
    } finally {
      await close();
    }
  });
});

import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  courts,
  games,
  groupMembers,
  groupRatingEvents,
  groups,
  matches,
  matchSets,
  ratingEvents,
  tournamentDraftMatches,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { recordJobs } from "#src/jobs/job-sink.test-support";
import { addRound } from "#src/routers/games/addRound";
import { cancelRound } from "#src/routers/games/cancelRound";
import {
  createTournament,
  createTournamentInputSchema,
} from "#src/routers/games/createTournament";
import { drawPools } from "#src/routers/games/drawPools";
import { enterTournamentScore } from "#src/routers/games/enterTournamentScore";
import { generateRounds } from "#src/routers/games/generateRounds";
import { listPoolTables } from "#src/routers/games/poolTables";
import { postPoolDraw } from "#src/routers/games/postPoolDraw";
import { postRounds } from "#src/routers/games/postRounds";
import { registerSeat } from "#src/routers/games/registerSeat";
import { tournamentRounds } from "#src/routers/games/tournamentRounds";
import { updateGameRoundCount } from "#src/routers/games/updateRoundCount";

const NOW = new Date("2026-11-08T07:00:00.000Z");
const WINDOW_START = new Date("2026-11-08T07:00:00.000Z");
const WINDOW_END = new Date("2026-11-08T19:00:00.000Z");

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

// Rating events are ordered by time, so each completion gets its own instant.
function tick() {
  vi.setSystemTime(new Date(Date.now() + 1000));
}

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${name}-${crypto.randomUUID()}@example.com` })
    .returning({ id: user.id, name: user.name });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

type SeedOptions = {
  tournamentShape?: "groups_only" | "groups_then_knockout" | "rounds";
  teamCount?: number;
  poolCount?: number;
  roundCount?: number;
  rounds?: "all" | "later";
};

async function seedTournament(database: TestDatabase, options: SeedOptions) {
  const owner = await insertUser(database, "Owner");
  const [venue] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Manama",
      country: "BH",
    })
    .returning({ id: venues.id });
  if (!venue) {
    throw new Error("Failed to insert venue");
  }
  const courtRows = await database
    .insert(courts)
    .values([
      { venueId: venue.id, name: "Court 1" },
      { venueId: venue.id, name: "Court 2" },
    ])
    .returning({ id: courts.id });
  const [group] = await database
    .insert(groups)
    .values({
      verifiedAt: new Date(),
      name: "Sunday Social",
      createdBy: owner.id,
    })
    .returning({ id: groups.id });
  if (!group) {
    throw new Error("Failed to insert group");
  }
  await database
    .insert(groupMembers)
    .values({ groupId: group.id, userId: owner.id });
  const teamCount = options.teamCount ?? 4;
  const tournamentShape = options.tournamentShape ?? "rounds";
  const created = await createTournament(database, {
    createdBy: owner.id,
    name: "Sunday Social",
    groupId: group.id,
    isPublic: false,
    registrationMode: "individual",
    tournamentShape,
    teamCount,
    ...(tournamentShape === "rounds"
      ? {}
      : { poolCount: options.poolCount ?? 1 }),
    ...(options.roundCount == null ? {} : { roundCount: options.roundCount }),
    venueId: venue.id,
    courtIds: courtRows.map((court) => court.id),
    matchMinutes: 30,
    windowStart: WINDOW_START,
    windowEnd: WINDOW_END,
  });
  return { owner, groupId: group.id, gameId: created.id, teamCount };
}

async function seedPostedDraw(
  database: TestDatabase,
  options: SeedOptions = {},
) {
  const seeded = await seedTournament(database, options);
  for (let team = 0; team < seeded.teamCount; team += 1) {
    for (const position of ["left", "right"] as const) {
      const player = await insertUser(database, `P${team + 1}${position}`);
      await database
        .insert(groupMembers)
        .values({ groupId: seeded.groupId, userId: player.id });
      await registerSeat(database, {
        gameId: seeded.gameId,
        userId: player.id,
        sideIndex: team + 1,
        position,
      });
    }
  }
  await drawPools(database, {
    gameId: seeded.gameId,
    organizerUserId: seeded.owner.id,
    shuffle: (items) => [...items],
  });
  await postPoolDraw(database, {
    gameId: seeded.gameId,
    organizerUserId: seeded.owner.id,
    rounds: options.rounds ?? "all",
  });
  return seeded;
}

async function withDb(run: (database: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

async function storedGame(database: TestDatabase, gameId: string) {
  const row = await database.query.games.findFirst({
    where: eq(games.id, gameId),
  });
  if (!row) {
    throw new Error("Missing game");
  }
  return row;
}

async function roundMatches(
  database: TestDatabase,
  gameId: string,
  roundNumber: number,
) {
  return database.query.matches.findMany({
    where: and(
      eq(matches.gameId, gameId),
      eq(matches.roundNumber, roundNumber),
      isNull(matches.knockoutRound),
    ),
    orderBy: [asc(matches.startTime), asc(matches.id)],
  });
}

async function knockoutMatches(database: TestDatabase, gameId: string) {
  return database.query.matches.findMany({
    where: and(eq(matches.gameId, gameId), isNotNull(matches.knockoutRound)),
    orderBy: [asc(matches.knockoutRound), asc(matches.knockoutPosition)],
  });
}

async function scoreRound(
  database: TestDatabase,
  seeded: { gameId: string; owner: { id: string } },
  roundNumber: number,
) {
  for (const match of await roundMatches(
    database,
    seeded.gameId,
    roundNumber,
  )) {
    tick();
    await enterTournamentScore(database, {
      gameId: seeded.gameId,
      matchId: match.id,
      userId: seeded.owner.id,
      slot1GamesWon: 6,
      slot2GamesWon: 3,
    });
  }
}

async function roundStates(
  database: TestDatabase,
  seeded: { gameId: string; owner: { id: string } },
) {
  const view = await tournamentRounds(database, {
    gameId: seeded.gameId,
    userId: seeded.owner.id,
  });
  return view.rounds.map((round) => round.state);
}

describe("the Rounds shape", () => {
  it("is one Pool with the Organizer's Round count stored as a number", async () => {
    await withDb(async (database) => {
      const picked = await seedTournament(database, {
        teamCount: 8,
        roundCount: 7,
      });
      expect(await storedGame(database, picked.gameId)).toMatchObject({
        tournamentShape: "rounds",
        poolCount: 1,
        roundCount: 7,
        qualifiersPerPool: null,
      });

      const untouched = await seedTournament(database, { teamCount: 8 });
      expect((await storedGame(database, untouched.gameId)).roundCount).toBe(4);

      const small = await seedTournament(database, { teamCount: 4 });
      expect((await storedGame(database, small.gameId)).roundCount).toBe(3);
    });
  });

  it("refuses more than one group, a knockout cut and a Round count out of range", () => {
    const base = {
      name: "Rounds",
      groupId: crypto.randomUUID(),
      isPublic: false,
      tournamentShape: "rounds" as const,
      teamCount: 8,
      matchMinutes: 30,
      windowStart: WINDOW_START,
      windowEnd: WINDOW_END,
      venueId: crypto.randomUUID(),
    };
    expect(createTournamentInputSchema.safeParse(base).success).toBe(true);
    expect(
      createTournamentInputSchema.safeParse({ ...base, poolCount: 1 }).success,
    ).toBe(true);
    expect(
      createTournamentInputSchema.safeParse({ ...base, poolCount: 2 }).success,
    ).toBe(false);
    expect(
      createTournamentInputSchema.safeParse({ ...base, qualifiersPerPool: 2 })
        .success,
    ).toBe(false);
    expect(
      createTournamentInputSchema.safeParse({ ...base, roundCount: 15 })
        .success,
    ).toBe(false);
    expect(
      createTournamentInputSchema.safeParse({ ...base, roundCount: 0 }).success,
    ).toBe(false);
  });

  it("keeps a picked count equal to one Pass as a number when edited before the draw", async () => {
    await withDb(async (database) => {
      const seeded = await seedTournament(database, { teamCount: 8 });
      const updated = await updateGameRoundCount(database, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        roundCount: 7,
      });
      expect(updated.roundCount).toBe(7);
      expect((await storedGame(database, seeded.gameId)).roundCount).toBe(7);
    });
  });

  it("posts exactly the picked Rounds", async () => {
    await withDb(async (database) => {
      const seeded = await seedPostedDraw(database, {
        teamCount: 8,
        roundCount: 3,
      });
      const view = await tournamentRounds(database, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      expect(view.roundCount).toBe(3);
      expect(view.poolCount).toBe(1);
      expect(view.rounds.map((round) => round.matches.length)).toEqual([
        4, 4, 4,
      ]);
    });
  });
});

describe("adding a Round", () => {
  recordJobs();

  it("adds a Round that is not made yet", async () => {
    await withDb(async (database) => {
      const seeded = await seedPostedDraw(database, {
        teamCount: 8,
        roundCount: 3,
      });
      const added = await addRound(database, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
      });
      expect(added).toMatchObject({ roundCount: 4, posted: false });
      expect((await storedGame(database, seeded.gameId)).roundCount).toBe(4);
      expect(await roundStates(database, seeded)).toEqual([
        "on_court",
        "scheduled",
        "scheduled",
        "not_made",
      ]);
    });
  });

  it("pairs and posts the new Round at once when asked, on the next slots", async () => {
    await withDb(async (database) => {
      const seeded = await seedPostedDraw(database, {
        teamCount: 8,
        roundCount: 3,
      });
      const added = await addRound(database, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        post: true,
      });
      expect(added).toMatchObject({ roundCount: 4, posted: true });
      const fourth = await roundMatches(database, seeded.gameId, 4);
      expect(fourth).toHaveLength(4);
      // Three Rounds of four Matches on two Courts fill six 30-minute slots.
      expect(fourth[0]?.startTime?.toISOString()).toBe(
        "2026-11-08T10:00:00.000Z",
      );
      const earlier = new Set<string>();
      for (const roundNumber of [1, 2, 3]) {
        for (const match of await roundMatches(
          database,
          seeded.gameId,
          roundNumber,
        )) {
          earlier.add(
            [match.slot1GameTeamId, match.slot2GameTeamId].sort().join("|"),
          );
        }
      }
      for (const match of fourth) {
        expect(
          earlier.has(
            [match.slot1GameTeamId, match.slot2GameTeamId].sort().join("|"),
          ),
        ).toBe(false);
      }
    });
  });

  it("changes nothing when the new Round cannot be posted yet", async () => {
    await withDb(async (database) => {
      const seeded = await seedPostedDraw(database, {
        teamCount: 8,
        roundCount: 3,
        rounds: "later",
      });
      await expect(
        addRound(database, {
          gameId: seeded.gameId,
          organizerUserId: seeded.owner.id,
          post: true,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect((await storedGame(database, seeded.gameId)).roundCount).toBe(3);
      expect(
        await database.query.tournamentDraftMatches.findMany({
          where: eq(tournamentDraftMatches.gameId, seeded.gameId),
        }),
      ).toHaveLength(0);
    });
  });

  it("stops at two Passes and is the Organizer's alone", async () => {
    await withDb(async (database) => {
      const seeded = await seedPostedDraw(database, {
        teamCount: 4,
        roundCount: 6,
      });
      await expect(
        addRound(database, {
          gameId: seeded.gameId,
          organizerUserId: seeded.owner.id,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });

      const stranger = await insertUser(database, "Stranger");
      await expect(
        addRound(database, {
          gameId: seeded.gameId,
          organizerUserId: stranger.id,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  it("reopens a finished Groups only tournament", async () => {
    await withDb(async (database) => {
      const seeded = await seedPostedDraw(database, {
        tournamentShape: "groups_only",
        teamCount: 4,
      });
      for (const roundNumber of [1, 2, 3]) {
        await scoreRound(database, seeded, roundNumber);
      }
      const before = await listPoolTables(database, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      expect(before?.finished).toBe(true);

      await addRound(database, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        post: true,
      });
      const after = await listPoolTables(database, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      expect(after?.finished).toBe(false);
      expect(await roundMatches(database, seeded.gameId, 4)).toHaveLength(2);
    });
  });
});

describe("cancelling a Round", () => {
  recordJobs();

  it("takes an unplayed last Round off the schedule", async () => {
    await withDb(async (database) => {
      const seeded = await seedPostedDraw(database, {
        teamCount: 8,
        roundCount: 4,
      });
      const cancelled = await cancelRound(database, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        roundNumber: 4,
      });
      expect(cancelled).toMatchObject({ removed: true, roundCount: 3 });
      expect(await roundMatches(database, seeded.gameId, 4)).toHaveLength(0);
      expect((await storedGame(database, seeded.gameId)).roundCount).toBe(3);
      expect(await roundStates(database, seeded)).toHaveLength(3);
    });
  });

  it("removes a draft Round and moves the drafts after it up", async () => {
    await withDb(async (database) => {
      const seeded = await seedPostedDraw(database, {
        teamCount: 8,
        roundCount: 4,
        rounds: "later",
      });
      await generateRounds(database, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        scope: "all",
      });
      await postRounds(database, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        roundNumbers: [1],
      });
      const draftsOf = async (roundNumber: number) =>
        (
          await database.query.tournamentDraftMatches.findMany({
            where: and(
              eq(tournamentDraftMatches.gameId, seeded.gameId),
              eq(tournamentDraftMatches.roundNumber, roundNumber),
            ),
            orderBy: asc(tournamentDraftMatches.position),
          })
        ).map((row) => `${row.slot1GameTeamId}|${row.slot2GameTeamId}`);
      const third = await draftsOf(3);
      const fourth = await draftsOf(4);

      const cancelled = await cancelRound(database, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        roundNumber: 2,
      });
      expect(cancelled).toMatchObject({ removed: true, roundCount: 3 });
      expect(await draftsOf(2)).toEqual(third);
      expect(await draftsOf(3)).toEqual(fourth);
      expect(await draftsOf(4)).toEqual([]);
      expect(await roundStates(database, seeded)).toEqual([
        "on_court",
        "draft",
        "draft",
      ]);
    });
  });

  it("keeps a played Round in the list as cancelled and drops its scores and ratings", async () => {
    await withDb(async (database) => {
      const seeded = await seedPostedDraw(database, {
        teamCount: 4,
        roundCount: 3,
      });
      await scoreRound(database, seeded, 1);
      const played = await roundMatches(database, seeded.gameId, 1);
      const matchIds = played.map((match) => match.id);
      const eventsOf = async () => {
        const [temba, group] = await Promise.all([
          database.query.ratingEvents.findMany({
            where: (table, { inArray }) => inArray(table.matchId, matchIds),
          }),
          database.query.groupRatingEvents.findMany({
            where: (table, { inArray }) => inArray(table.matchId, matchIds),
          }),
        ]);
        return temba.length + group.length;
      };
      expect(await eventsOf()).toBeGreaterThan(0);

      const cancelled = await cancelRound(database, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        roundNumber: 1,
      });
      expect(cancelled).toMatchObject({ removed: false, roundCount: 3 });
      expect(await eventsOf()).toBe(0);
      const after = await roundMatches(database, seeded.gameId, 1);
      expect(after.map((match) => match.status)).toEqual([
        "cancelled",
        "cancelled",
      ]);
      expect(
        await database.query.matchSets.findMany({
          where: (table, { inArray }) => inArray(table.matchId, matchIds),
        }),
      ).toHaveLength(0);
      expect(await roundStates(database, seeded)).toEqual([
        "cancelled",
        "scheduled",
        "scheduled",
      ]);
      const tables = await listPoolTables(database, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      expect(
        tables?.pools[0]?.rows.every(
          (row) => row.played == null && row.won == null,
        ),
      ).toBe(true);

      await expect(
        cancelRound(database, {
          gameId: seeded.gameId,
          organizerUserId: seeded.owner.id,
          roundNumber: 1,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });

  it("keeps an unplayed Round in place when a posted Round follows it", async () => {
    await withDb(async (database) => {
      const seeded = await seedPostedDraw(database, {
        teamCount: 4,
        roundCount: 3,
      });
      const cancelled = await cancelRound(database, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        roundNumber: 2,
      });
      expect(cancelled).toMatchObject({ removed: false, roundCount: 3 });
      expect(await roundMatches(database, seeded.gameId, 3)).toHaveLength(2);
      expect(await roundStates(database, seeded)).toEqual([
        "on_court",
        "cancelled",
        "scheduled",
      ]);
    });
  });

  it("refuses a played Round on a rated tournament once a later Round is played", async () => {
    await withDb(async (database) => {
      const seeded = await seedPostedDraw(database, {
        teamCount: 4,
        roundCount: 3,
      });
      await scoreRound(database, seeded, 1);
      await scoreRound(database, seeded, 2);
      await expect(
        cancelRound(database, {
          gameId: seeded.gameId,
          organizerUserId: seeded.owner.id,
          roundNumber: 1,
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      expect(
        (await roundMatches(database, seeded.gameId, 1)).map(
          (match) => match.status,
        ),
      ).toEqual(["completed", "completed"]);

      const last = await cancelRound(database, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        roundNumber: 2,
      });
      expect(last.removed).toBe(false);
    });
  });

  it("finishes the tournament when the only Round still open is cancelled", async () => {
    await withDb(async (database) => {
      const seeded = await seedPostedDraw(database, {
        teamCount: 4,
        roundCount: 3,
      });
      await scoreRound(database, seeded, 1);
      await scoreRound(database, seeded, 2);
      await cancelRound(database, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        roundNumber: 3,
      });
      expect((await storedGame(database, seeded.gameId)).roundCount).toBe(2);
      const tables = await listPoolTables(database, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      expect(tables?.finished).toBe(true);
    });
  });

  it("keeps at least one Round and refuses a Round out of range", async () => {
    await withDb(async (database) => {
      const seeded = await seedPostedDraw(database, {
        teamCount: 4,
        roundCount: 1,
        rounds: "later",
      });
      await expect(
        cancelRound(database, {
          gameId: seeded.gameId,
          organizerUserId: seeded.owner.id,
          roundNumber: 1,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(
        cancelRound(database, {
          gameId: seeded.gameId,
          organizerUserId: seeded.owner.id,
          roundNumber: 2,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });

  it("tells the Organizer what Cancel does to each Round", async () => {
    await withDb(async (database) => {
      const seeded = await seedPostedDraw(database, {
        teamCount: 4,
        roundCount: 3,
      });
      await scoreRound(database, seeded, 1);
      const organizer = await tournamentRounds(database, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      expect(organizer.canAddRound).toBe(true);
      expect(organizer.maxRoundCount).toBe(6);
      expect(organizer.rounds.map((round) => round.cancelEffect)).toEqual([
        "void",
        "void",
        "remove",
      ]);

      const player = await database.query.gamePlayers.findFirst({
        where: (table, { eq: equals }) => equals(table.gameId, seeded.gameId),
      });
      const viewer = await tournamentRounds(database, {
        gameId: seeded.gameId,
        userId: player?.userId ?? "",
      });
      expect(viewer.canAddRound).toBe(false);
      expect(viewer.rounds.every((round) => round.cancelEffect === null)).toBe(
        true,
      );
    });
  });
});

describe("Rounds on a Groups then knockout tournament", () => {
  recordJobs();

  it("moves the Knockout after an added Round and back when it is removed", async () => {
    await withDb(async (database) => {
      const seeded = await seedPostedDraw(database, {
        tournamentShape: "groups_then_knockout",
        teamCount: 4,
      });
      const before = await knockoutMatches(database, seeded.gameId);
      expect(before.map((match) => match.roundNumber)).toEqual([4]);
      // Three Rounds of two Matches on two Courts take three 30-minute slots.
      expect(before[0]?.startTime?.toISOString()).toBe(
        "2026-11-08T08:30:00.000Z",
      );

      await addRound(database, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
      });
      const moved = await knockoutMatches(database, seeded.gameId);
      expect(moved.map((match) => match.roundNumber)).toEqual([5]);
      expect(moved[0]?.startTime?.toISOString()).toBe(
        "2026-11-08T09:00:00.000Z",
      );

      await cancelRound(database, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        roundNumber: 4,
      });
      const back = await knockoutMatches(database, seeded.gameId);
      expect(back.map((match) => match.roundNumber)).toEqual([4]);
      expect(back[0]?.startTime?.toISOString()).toBe(
        "2026-11-08T08:30:00.000Z",
      );
    });
  });

  it("takes the placed qualifiers back when a Round is added, and stops once the Knockout has started", async () => {
    await withDb(async (database) => {
      const seeded = await seedPostedDraw(database, {
        tournamentShape: "groups_then_knockout",
        teamCount: 4,
      });
      for (const roundNumber of [1, 2, 3]) {
        await scoreRound(database, seeded, roundNumber);
      }
      const [final] = await knockoutMatches(database, seeded.gameId);
      expect(final?.slot1GameTeamId).not.toBeNull();
      expect(final?.slot2GameTeamId).not.toBeNull();

      await addRound(database, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        post: true,
      });
      const [emptied] = await knockoutMatches(database, seeded.gameId);
      expect(emptied?.slot1GameTeamId).toBeNull();
      expect(emptied?.slot2GameTeamId).toBeNull();

      await scoreRound(database, seeded, 4);
      const [refilled] = await knockoutMatches(database, seeded.gameId);
      expect(refilled?.slot1GameTeamId).not.toBeNull();
      tick();
      await enterTournamentScore(database, {
        gameId: seeded.gameId,
        matchId: refilled?.id ?? "",
        userId: seeded.owner.id,
        slot1GamesWon: 6,
        slot2GamesWon: 2,
      });

      await expect(
        addRound(database, {
          gameId: seeded.gameId,
          organizerUserId: seeded.owner.id,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      const view = await tournamentRounds(database, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      expect(view.canAddRound).toBe(false);
    });
  });
});

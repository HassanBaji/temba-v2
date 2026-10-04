import { TRPCError } from "@trpc/server";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  MatchStatusEnum,
  courts,
  gameTeams,
  games,
  groups,
  matches,
  matchSets,
  user,
  venues,
} from "@repo/db/schema";

import { tournamentRoundCount } from "@repo/domain/tournament-home";
import { knockoutQualifierLabel } from "@repo/domain/tournament-knockout";
import {
  knockoutSideLabel,
  viewerMissedKnockout,
} from "@repo/domain/tournament-knockout-view";
import { roundsPlayedLabel } from "@repo/domain/tournament-rounds";
import { addSet } from "~/server/api/routers/games/addSet";
import { gameById } from "~/server/api/routers/games/byId";
import { cancelMatch } from "~/server/api/routers/games/cancelMatch";
import { completeMatch } from "~/server/api/routers/games/completeMatch";
import {
  createTournament,
  createTournamentInputSchema,
} from "~/server/api/routers/games/createTournament";
import { drawPools } from "~/server/api/routers/games/drawPools";
import { listPoolTables } from "~/server/api/routers/games/poolTables";
import { postPoolDraw } from "~/server/api/routers/games/postPoolDraw";
import { registerSeat } from "~/server/api/routers/games/registerSeat";
import { reportWrongScore } from "~/server/api/routers/games/reportWrongScore";
import { scoreSet } from "~/server/api/routers/games/scoreSet";
import { POOL_CORRECTION_REFUSED_MESSAGE } from "~/server/games/knockout-advance";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-01T12:00:00"));
});

afterAll(() => {
  vi.useRealTimers();
});

// Rating events are ordered by time, so each completion gets its own instant.
function tick() {
  vi.setSystemTime(new Date(Date.now() + 1000));
}

function identityShuffle<T>(items: readonly T[]): T[] {
  return [...items];
}

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: email.split("@")[0] ?? "User", email })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertPlace(database: TestDatabase, prefix: string) {
  const owner = await insertUser(database, `${prefix}-owner@example.com`);
  const [venue] = await database
    .insert(venues)
    .values({ name: `Venue ${prefix}`, city: "Lisbon", country: "PT" })
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
    .values({ name: `Group ${prefix}`, createdBy: owner.id })
    .returning({ id: groups.id });
  if (!group) {
    throw new Error("Failed to insert group");
  }
  return {
    owner,
    venueId: venue.id,
    groupId: group.id,
    courtIds: courtRows.map((court) => court.id),
  };
}

/**
 * Twelve places in three Pools of four. With the identity shuffle, sides 1-4
 * are Pool A, 5-8 Pool B and 9-12 Pool C.
 */
async function seedPostedGroupsThenKnockout(
  database: TestDatabase,
  prefix: string,
  options: {
    tournamentShape?: "groups_only" | "groups_then_knockout";
    qualifiersPerPool?: number;
    completeTeams?: number;
  } = {},
) {
  const place = await insertPlace(database, prefix);
  const tournamentShape = options.tournamentShape ?? "groups_then_knockout";
  const created = await createTournament(database, {
    createdBy: place.owner.id,
    name: "Groups then knockout",
    groupId: place.groupId,
    isPublic: true,
    registrationMode: "individual",
    tournamentShape,
    teamCount: 12,
    poolCount: 3,
    ...(tournamentShape === "groups_then_knockout"
      ? { qualifiersPerPool: options.qualifiersPerPool ?? 2 }
      : {}),
    venueId: place.venueId,
    courtIds: place.courtIds,
    matchMinutes: 45,
    windowStart: new Date("2026-09-20T09:00:00"),
    windowEnd: new Date("2026-09-20T23:00:00"),
  });
  const playersBySide = new Map<number, string[]>();
  for (let side = 1; side <= (options.completeTeams ?? 12); side += 1) {
    const left = await insertUser(database, `${prefix}-${side}l@example.com`);
    const right = await insertUser(database, `${prefix}-${side}r@example.com`);
    for (const [userId, position] of [
      [left.id, "left"],
      [right.id, "right"],
    ] as const) {
      await registerSeat(database, {
        gameId: created.id,
        userId,
        sideIndex: side,
        position,
      });
    }
    playersBySide.set(side, [left.id, right.id]);
  }
  await drawPools(database, {
    gameId: created.id,
    organizerUserId: place.owner.id,
    shuffle: identityShuffle,
  });
  await postPoolDraw(database, {
    gameId: created.id,
    organizerUserId: place.owner.id,
  });
  const teams = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, created.id),
  });
  const sideByTeamId = new Map(
    teams.map((team) => [team.id, team.sideIndex ?? 0]),
  );
  const poolByTeamId = new Map(
    teams.map((team) => [team.id, team.poolIndex ?? 0]),
  );
  const team = (side: number) => {
    const found = teams.find((row) => row.sideIndex === side);
    if (!found) {
      throw new Error(`No Game team on side ${side}`);
    }
    return found.id;
  };
  return {
    owner: place.owner,
    gameId: created.id,
    team,
    sideOf: (gameTeamId: string | null) =>
      gameTeamId ? (sideByTeamId.get(gameTeamId) ?? null) : null,
    poolOf: (gameTeamId: string | null) =>
      gameTeamId ? (poolByTeamId.get(gameTeamId) ?? null) : null,
    players: (side: number) => playersBySide.get(side) ?? [],
  };
}

type Seeded = Awaited<ReturnType<typeof seedPostedGroupsThenKnockout>>;

async function poolMatches(database: TestDatabase, gameId: string) {
  return database.query.matches.findMany({
    where: and(eq(matches.gameId, gameId), isNull(matches.knockoutRound)),
    orderBy: (table, { asc }) => [asc(table.roundNumber), asc(table.startTime)],
  });
}

async function knockoutMatches(database: TestDatabase, gameId: string) {
  return database.query.matches.findMany({
    where: and(eq(matches.gameId, gameId), isNotNull(matches.knockoutRound)),
    orderBy: (table, { asc }) => [
      asc(table.knockoutRound),
      asc(table.knockoutPosition),
    ],
  });
}

function sourceLabels(match: {
  slot1SourcePoolIndex: number | null;
  slot1SourcePoolPosition: number | null;
  slot2SourcePoolIndex: number | null;
  slot2SourcePoolPosition: number | null;
}) {
  const labels: string[] = [];
  if (match.slot1SourcePoolIndex != null && match.slot1SourcePoolPosition) {
    labels.push(
      knockoutQualifierLabel(
        match.slot1SourcePoolIndex,
        match.slot1SourcePoolPosition,
      ),
    );
  }
  if (match.slot2SourcePoolIndex != null && match.slot2SourcePoolPosition) {
    labels.push(
      knockoutQualifierLabel(
        match.slot2SourcePoolIndex,
        match.slot2SourcePoolPosition,
      ),
    );
  }
  return labels;
}

async function settleWithWinner(
  database: TestDatabase,
  seeded: Seeded,
  match: {
    id: string;
    slot1GameTeamId: string | null;
    slot2GameTeamId: string | null;
  },
  winner: 1 | 2,
) {
  const set = await addSet(database, {
    gameId: seeded.gameId,
    matchId: match.id,
    userId: seeded.owner.id,
  });
  await scoreSet(database, {
    gameId: seeded.gameId,
    matchId: match.id,
    setId: set.id,
    userId: seeded.owner.id,
    slot1GamesWon: winner === 1 ? 6 : 2,
    slot2GamesWon: winner === 1 ? 2 : 6,
  });
  tick();
  await completeMatch(database, {
    gameId: seeded.gameId,
    matchId: match.id,
    userId: seeded.owner.id,
  });
  return set;
}

/** The lower side wins every Pool Match, so side order is table order. */
function lowerSideWins(
  seeded: Seeded,
  match: { slot1GameTeamId: string | null; slot2GameTeamId: string | null },
): 1 | 2 {
  const slot1 = seeded.sideOf(match.slot1GameTeamId) ?? 0;
  const slot2 = seeded.sideOf(match.slot2GameTeamId) ?? 0;
  return slot1 < slot2 ? 1 : 2;
}

async function expectPlacedFromTables(database: TestDatabase, seeded: Seeded) {
  const tables = await listPoolTables(database, {
    gameId: seeded.gameId,
    userId: seeded.owner.id,
  });
  const placeOf = (poolIndex: number | null, position: number | null) =>
    poolIndex == null || position == null
      ? null
      : (tables?.pools.find((pool) => pool.poolIndex === poolIndex)?.rows[
          position - 1
        ]?.gameTeamId ?? null);
  let placed = 0;
  for (const match of await knockoutMatches(database, seeded.gameId)) {
    if (match.slot1SourcePoolIndex != null) {
      expect(match.slot1GameTeamId).toBe(
        placeOf(match.slot1SourcePoolIndex, match.slot1SourcePoolPosition),
      );
      placed += 1;
    }
    if (match.slot2SourcePoolIndex != null) {
      expect(match.slot2GameTeamId).toBe(
        placeOf(match.slot2SourcePoolIndex, match.slot2SourcePoolPosition),
      );
      placed += 1;
    }
  }
  return placed;
}

async function expectRefused(
  run: () => Promise<unknown>,
  code: TRPCError["code"],
  message: string,
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
    expect(error.message).toBe(message);
  }
}

function baseInput() {
  return {
    name: "Autumn Friendly",
    groupId: crypto.randomUUID(),
    isPublic: false,
    teamCount: 12,
    poolCount: 3,
    venueId: crypto.randomUUID(),
    matchMinutes: 45,
    windowStart: new Date("2026-09-20T10:00:00"),
    windowEnd: new Date("2026-09-20T22:00:00"),
  };
}

function qualifiersIssue(input: Record<string, unknown>) {
  const parsed = createTournamentInputSchema.safeParse(input);
  if (parsed.success) {
    return null;
  }
  return parsed.error.flatten().fieldErrors.qualifiersPerPool?.[0] ?? null;
}

describe("createTournament with Groups then knockout", () => {
  it("validates Through from each group against the planned Pools", () => {
    const groupsThenKnockout = {
      ...baseInput(),
      tournamentShape: "groups_then_knockout",
    };
    expect(
      createTournamentInputSchema.safeParse({
        ...groupsThenKnockout,
        qualifiersPerPool: 3,
      }).success,
    ).toBe(true);
    expect(
      qualifiersIssue({ ...groupsThenKnockout, qualifiersPerPool: 0 }),
    ).toBe("Through from each group must be between 1 and 3");
    expect(
      qualifiersIssue({ ...groupsThenKnockout, qualifiersPerPool: 4 }),
    ).toBe("Through from each group must be between 1 and 3");
    expect(
      qualifiersIssue({
        ...groupsThenKnockout,
        poolCount: 1,
        qualifiersPerPool: 1,
      }),
    ).toBe("Through from each group must be between 2 and 11");
  });

  it("refuses Through from each group on the other shapes", () => {
    for (const tournamentShape of ["groups_only", "knockout_only"]) {
      expect(
        qualifiersIssue({
          ...baseInput(),
          tournamentShape,
          qualifiersPerPool: 2,
        }),
      ).toBe("Through from each group applies to Groups, then knockout only");
    }
  });

  it("stores the shape and Through from each group, defaulting to 2", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const place = await insertPlace(db, "create");
      const shared = {
        createdBy: place.owner.id,
        name: "Groups then knockout",
        groupId: place.groupId,
        isPublic: true,
        tournamentShape: "groups_then_knockout" as const,
        teamCount: 12,
        poolCount: 3,
        venueId: place.venueId,
        matchMinutes: 45,
        windowStart: new Date("2026-09-20T10:00:00"),
        windowEnd: new Date("2026-09-20T22:00:00"),
      };
      const picked = await createTournament(db, {
        ...shared,
        qualifiersPerPool: 3,
      });
      const defaulted = await createTournament(db, shared);
      const rows = await db.query.games.findMany({
        columns: {
          id: true,
          tournamentShape: true,
          qualifiersPerPool: true,
          poolCount: true,
        },
      });
      const byId = new Map(rows.map((row) => [row.id, row]));
      expect(byId.get(picked.id)).toMatchObject({
        tournamentShape: "groups_then_knockout",
        qualifiersPerPool: 3,
        poolCount: 3,
      });
      expect(byId.get(defaulted.id)?.qualifiersPerPool).toBe(2);
      await expectRefused(
        () => createTournament(db, { ...shared, qualifiersPerPool: 4 }),
        "BAD_REQUEST",
        "Through from each group must be between 1 and 3",
      );
    } finally {
      await close();
    }
  });
});

describe("postPoolDraw on Groups then knockout", () => {
  it("creates the Pool Matches and the whole empty tree with stored sources, Courts and times", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedGroupsThenKnockout(db, "post");
      const pool = await poolMatches(db, seeded.gameId);
      const knockout = await knockoutMatches(db, seeded.gameId);
      expect(pool).toHaveLength(18);
      expect(knockout).toHaveLength(5);

      const poolRounds = Math.max(
        ...pool.map((match) => match.roundNumber ?? 0),
      );
      expect(poolRounds).toBe(3);
      const lastPoolEnd = Math.max(
        ...pool.map((match) => match.endTime?.getTime() ?? 0),
      );
      for (const match of knockout) {
        expect(match.slot1GameTeamId).toBeNull();
        expect(match.slot2GameTeamId).toBeNull();
        expect(match.courtId).not.toBeNull();
        expect(match.startTime).not.toBeNull();
        expect(match.startTime!.getTime()).toBeGreaterThanOrEqual(lastPoolEnd);
        expect(match.roundNumber).toBe(poolRounds + (match.knockoutRound ?? 0));
      }

      expect(knockout.flatMap((match) => sourceLabels(match)).sort()).toEqual([
        "A1",
        "A2",
        "B1",
        "B2",
        "C1",
        "C2",
      ]);

      const firstRound = knockout.filter((match) => match.knockoutRound === 1);
      expect(firstRound).toHaveLength(2);
      for (const match of firstRound) {
        expect(match.slot1SourcePoolIndex).not.toBe(match.slot2SourcePoolIndex);
      }
      const byeSources = knockout
        .filter((match) => match.knockoutRound === 2)
        .flatMap((match) => sourceLabels(match))
        .sort();
      expect(byeSources).toEqual(["A1", "B1"]);

      const game = await db.query.games.findFirst({
        where: eq(games.id, seeded.gameId),
      });
      expect(game?.roundCount).toBeNull();
      expect(game?.qualifiersPerPool).toBe(2);
    } finally {
      await close();
    }
  });

  it("shows A1-style and Winner of placeholders, and counts Pool Rounds only", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedGroupsThenKnockout(db, "placeholders");
      const detail = await gameById(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      const rounds = detail.knockout ?? [];
      expect(rounds.map((round) => round.name)).toEqual([
        "Quarter-finals",
        "Semi-finals",
        "Final",
      ]);
      const labels = rounds.map((round) =>
        round.places.map((place) =>
          place.kind === "bye"
            ? `${place.code} ${knockoutSideLabel(place.side)} bye`
            : `${place.code} ${knockoutSideLabel(place.slot1)} v ${knockoutSideLabel(place.slot2)}`,
        ),
      );
      expect(labels).toEqual([
        ["Q1 A1 bye", "Q2 A2 v C2", "Q3 B1 bye", "Q4 C1 v B2"],
        ["S1 A1 v Winner of Q2", "S2 B1 v Winner of Q4"],
        ["Final Winner of S1 v Winner of S2"],
      ]);

      const roundCount = tournamentRoundCount(detail);
      expect(roundCount).toBe(3);
      expect(roundsPlayedLabel(detail.poolTables, roundCount)).toBe(
        "Round 0 of 3 played",
      );
    } finally {
      await close();
    }
  });

  it("clamps Through from each group on a short drawn field without rewriting it", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedGroupsThenKnockout(db, "clamp", {
        qualifiersPerPool: 3,
        completeTeams: 9,
      });
      const knockout = await knockoutMatches(db, seeded.gameId);
      expect(knockout).toHaveLength(5);
      expect(knockout.flatMap((match) => sourceLabels(match)).sort()).toEqual([
        "A1",
        "A2",
        "B1",
        "B2",
        "C1",
        "C2",
      ]);
      const game = await db.query.games.findFirst({
        where: eq(games.id, seeded.gameId),
      });
      expect(game?.qualifiersPerPool).toBe(3);
    } finally {
      await close();
    }
  });

  it("leaves Groups only unchanged: no Knockout Matches and nothing placed", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedGroupsThenKnockout(db, "groups-only", {
        tournamentShape: "groups_only",
      });
      await db
        .update(games)
        .set({ tournamentShape: null })
        .where(eq(games.id, seeded.gameId));
      for (const match of await poolMatches(db, seeded.gameId)) {
        await settleWithWinner(db, seeded, match, lowerSideWins(seeded, match));
      }
      expect(await knockoutMatches(db, seeded.gameId)).toHaveLength(0);
      const detail = await gameById(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      expect(detail.knockout).toBeNull();
      expect(detail.poolTables?.finished).toBe(true);
      expect(
        roundsPlayedLabel(detail.poolTables, tournamentRoundCount(detail)),
      ).toBe("Round 3 of 3 played");
    } finally {
      await close();
    }
  });
});

describe("Knockout qualifier placement", () => {
  it("places every qualifier into its slot when the last Pool Match completes", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedGroupsThenKnockout(db, "place");
      const pool = await poolMatches(db, seeded.gameId);
      const last = pool[pool.length - 1]!;
      for (const match of pool.slice(0, -1)) {
        await settleWithWinner(db, seeded, match, lowerSideWins(seeded, match));
      }
      for (const match of await knockoutMatches(db, seeded.gameId)) {
        expect(match.slot1GameTeamId).toBeNull();
        expect(match.slot2GameTeamId).toBeNull();
      }

      await settleWithWinner(db, seeded, last, lowerSideWins(seeded, last));

      expect(await expectPlacedFromTables(db, seeded)).toBe(6);
      const knockout = await knockoutMatches(db, seeded.gameId);
      const q2 = knockout.find(
        (match) => match.knockoutRound === 1 && match.knockoutPosition === 2,
      );
      expect(q2?.slot1GameTeamId).toBe(seeded.team(2));
      expect(q2?.slot2GameTeamId).toBe(seeded.team(10));
      const s1 = knockout.find(
        (match) => match.knockoutRound === 2 && match.knockoutPosition === 1,
      );
      expect(s1?.slot1GameTeamId).toBe(seeded.team(1));
      expect(s1?.slot2GameTeamId).toBeNull();
      const s2 = knockout.find(
        (match) => match.knockoutRound === 2 && match.knockoutPosition === 2,
      );
      expect(s2?.slot1GameTeamId).toBe(seeded.team(5));

      const outside = await gameById(db, {
        gameId: seeded.gameId,
        userId: seeded.players(3)[0]!,
      });
      expect(
        viewerMissedKnockout({
          rounds: outside.knockout,
          poolStageFinished: Boolean(outside.poolTables?.finished),
          viewerHasTeam: outside.poolTables?.viewerPoolIndex != null,
        }),
      ).toBe(true);
      const through = await gameById(db, {
        gameId: seeded.gameId,
        userId: seeded.players(2)[0]!,
      });
      expect(
        viewerMissedKnockout({
          rounds: through.knockout,
          poolStageFinished: Boolean(through.poolTables?.finished),
          viewerHasTeam: through.poolTables?.viewerPoolIndex != null,
        }),
      ).toBe(false);
    } finally {
      await close();
    }
  });

  it("places the qualifiers when the last Pool Match is cancelled", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedGroupsThenKnockout(db, "cancel-last");
      const pool = await poolMatches(db, seeded.gameId);
      const last = pool[pool.length - 1]!;
      for (const match of pool.slice(0, -1)) {
        await settleWithWinner(db, seeded, match, lowerSideWins(seeded, match));
      }
      await cancelMatch(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        matchId: last.id,
      });
      expect(await expectPlacedFromTables(db, seeded)).toBe(6);
      const knockout = await knockoutMatches(db, seeded.gameId);
      expect(
        knockout.every(
          (match) =>
            (match.slot1SourcePoolIndex == null) ===
              (match.slot1GameTeamId == null) &&
            (match.slot2SourcePoolIndex == null) ===
              (match.slot2GameTeamId == null),
        ),
      ).toBe(true);
    } finally {
      await close();
    }
  });

  it("keeps a Knockout Match between two teams of one Pool out of that Pool's table and Round count", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedGroupsThenKnockout(db, "same-pool");
      for (const match of await poolMatches(db, seeded.gameId)) {
        await settleWithWinner(db, seeded, match, lowerSideWins(seeded, match));
      }
      const before = await listPoolTables(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });

      const q2 = (await knockoutMatches(db, seeded.gameId)).find(
        (match) => match.knockoutRound === 1 && match.knockoutPosition === 2,
      )!;
      await settleWithWinner(db, seeded, q2, 1);
      const s1 = (await knockoutMatches(db, seeded.gameId)).find(
        (match) => match.knockoutRound === 2 && match.knockoutPosition === 1,
      )!;
      expect(seeded.poolOf(s1.slot1GameTeamId)).toBe(1);
      expect(seeded.poolOf(s1.slot2GameTeamId)).toBe(1);
      await settleWithWinner(db, seeded, s1, 2);

      const after = await listPoolTables(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      expect(after?.pools[0]?.rows).toEqual(before?.pools[0]?.rows);
      expect(after?.pools[0]?.matches).toHaveLength(6);

      const detail = await gameById(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      expect(
        roundsPlayedLabel(detail.poolTables, tournamentRoundCount(detail)),
      ).toBe("Round 3 of 3 played");
    } finally {
      await close();
    }
  });
});

describe("Pool score correction after placement", () => {
  it("re-places the qualifiers while no Knockout Match has a Set", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedGroupsThenKnockout(db, "re-place");
      const pool = await poolMatches(db, seeded.gameId);
      const sets = new Map<string, string>();
      for (const match of pool) {
        const set = await settleWithWinner(
          db,
          seeded,
          match,
          lowerSideWins(seeded, match),
        );
        sets.set(match.id, set.id);
      }
      const decider = pool.find(
        (match) =>
          [match.slot1GameTeamId, match.slot2GameTeamId].includes(
            seeded.team(1),
          ) &&
          [match.slot1GameTeamId, match.slot2GameTeamId].includes(
            seeded.team(2),
          ),
      )!;
      expect(decider.roundNumber).toBe(3);

      await reportWrongScore(db, {
        gameId: seeded.gameId,
        matchId: decider.id,
        userId: seeded.owner.id,
      });
      for (const match of await knockoutMatches(db, seeded.gameId)) {
        expect(match.slot1GameTeamId).toBeNull();
        expect(match.slot2GameTeamId).toBeNull();
      }

      const team2Slot = decider.slot1GameTeamId === seeded.team(2) ? 1 : 2;
      await scoreSet(db, {
        gameId: seeded.gameId,
        matchId: decider.id,
        setId: sets.get(decider.id)!,
        userId: seeded.owner.id,
        slot1GamesWon: team2Slot === 1 ? 6 : 1,
        slot2GamesWon: team2Slot === 1 ? 1 : 6,
      });
      await completeMatch(db, {
        gameId: seeded.gameId,
        matchId: decider.id,
        userId: seeded.owner.id,
      });

      expect(await expectPlacedFromTables(db, seeded)).toBe(6);
      const knockout = await knockoutMatches(db, seeded.gameId);
      const q2 = knockout.find(
        (match) => match.knockoutRound === 1 && match.knockoutPosition === 2,
      );
      const s1 = knockout.find(
        (match) => match.knockoutRound === 2 && match.knockoutPosition === 1,
      );
      expect(s1?.slot1GameTeamId).toBe(seeded.team(2));
      expect(q2?.slot1GameTeamId).toBe(seeded.team(1));
    } finally {
      await close();
    }
  });

  it("is refused once any Knockout Match has a Set", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedGroupsThenKnockout(db, "refuse");
      const pool = await poolMatches(db, seeded.gameId);
      for (const match of pool) {
        await settleWithWinner(db, seeded, match, lowerSideWins(seeded, match));
      }
      const q2 = (await knockoutMatches(db, seeded.gameId)).find(
        (match) => match.knockoutRound === 1 && match.knockoutPosition === 2,
      )!;
      await addSet(db, {
        gameId: seeded.gameId,
        matchId: q2.id,
        userId: seeded.owner.id,
      });

      const last = pool[pool.length - 1]!;
      await expectRefused(
        () =>
          reportWrongScore(db, {
            gameId: seeded.gameId,
            matchId: last.id,
            userId: seeded.owner.id,
          }),
        "CONFLICT",
        POOL_CORRECTION_REFUSED_MESSAGE,
      );
      const unchanged = await db.query.matches.findFirst({
        where: eq(matches.id, last.id),
      });
      expect(unchanged?.status).toBe(MatchStatusEnum.COMPLETED);
      expect(await expectPlacedFromTables(db, seeded)).toBe(6);
      const knockoutSets = await db.query.matchSets.findMany({
        where: eq(matchSets.matchId, q2.id),
      });
      expect(knockoutSets).toHaveLength(1);
    } finally {
      await close();
    }
  });
});

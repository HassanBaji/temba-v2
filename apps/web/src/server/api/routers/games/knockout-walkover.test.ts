import { TRPCError } from "@trpc/server";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  MatchStatusEnum,
  courts,
  gameTeams,
  groups,
  matches,
  ratingEvents,
  user,
  venues,
} from "@repo/db/schema";

import {
  knockoutCancelPrompt,
  knockoutChampion,
  type KnockoutViewRound,
} from "~/lib/tournament-knockout-view";
import { addSet } from "~/server/api/routers/games/addSet";
import { gameById } from "~/server/api/routers/games/byId";
import { cancelGame } from "~/server/api/routers/games/cancel";
import {
  KNOCKOUT_MATCH_ALREADY_COMPLETED_MESSAGE,
  POOL_MATCH_NOT_AWARDED_MESSAGE,
  cancelMatch,
} from "~/server/api/routers/games/cancelMatch";
import { completeMatch } from "~/server/api/routers/games/completeMatch";
import { createTournament } from "~/server/api/routers/games/createTournament";
import { drawPools } from "~/server/api/routers/games/drawPools";
import { kick } from "~/server/api/routers/games/kick";
import { listMyMatchHistoryRows } from "~/server/api/routers/games/listMyMatchHistory";
import { listPoolTables } from "~/server/api/routers/games/poolTables";
import { postPoolDraw } from "~/server/api/routers/games/postPoolDraw";
import { registerSeat } from "~/server/api/routers/games/registerSeat";
import { reportWrongScore } from "~/server/api/routers/games/reportWrongScore";
import { scoreSet } from "~/server/api/routers/games/scoreSet";
import {
  POOL_CORRECTION_REFUSED_MESSAGE,
  WALKOVER_TEAM_NOT_ON_MATCH_MESSAGE,
  WALKOVER_TEAM_REQUIRED_MESSAGE,
} from "~/server/games/knockout-advance";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

const AFTER_THE_DAY = new Date("2026-09-21T12:00:00");

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-01T12:00:00"));
});

afterAll(() => {
  vi.useRealTimers();
});

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

async function seedPosted(
  database: TestDatabase,
  prefix: string,
  shape:
    | { tournamentShape: "knockout_only"; teamCount: 8; completeTeams: 6 }
    | {
        tournamentShape: "groups_then_knockout";
        teamCount: 12;
        completeTeams: 12;
      },
) {
  const place = await insertPlace(database, prefix);
  const created = await createTournament(database, {
    createdBy: place.owner.id,
    name: "Walkover day",
    groupId: place.groupId,
    isPublic: true,
    registrationMode: "individual",
    venueId: place.venueId,
    courtIds: place.courtIds,
    matchMinutes: 45,
    windowStart: new Date("2026-09-20T09:00:00"),
    windowEnd: new Date("2026-09-20T23:00:00"),
    ...(shape.tournamentShape === "knockout_only"
      ? { tournamentShape: "knockout_only", teamCount: 8 }
      : {
          tournamentShape: "groups_then_knockout",
          teamCount: 12,
          poolCount: 3,
          qualifiersPerPool: 2,
        }),
  });
  const playersBySide = new Map<number, string[]>();
  for (let side = 1; side <= shape.completeTeams; side += 1) {
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
  const team = (side: number) => {
    const found = teams.find((row) => row.sideIndex === side);
    if (!found) {
      throw new Error(`No Game team on side ${side}`);
    }
    return found.id;
  };
  const sideOf = (gameTeamId: string | null) =>
    teams.find((row) => row.id === gameTeamId)?.sideIndex ?? 0;
  const players = (side: number) => playersBySide.get(side) ?? [];
  return { owner: place.owner, gameId: created.id, team, sideOf, players };
}

/**
 * Six complete Game teams in an eight-place tree, drawn in side order:
 * sides 1 and 2 have Byes, Q2 is side 4 v side 5, Q4 is side 3 v side 6.
 */
function seedKnockoutOnly(database: TestDatabase, prefix: string) {
  return seedPosted(database, prefix, {
    tournamentShape: "knockout_only",
    teamCount: 8,
    completeTeams: 6,
  });
}

/**
 * Twelve Game teams in three Pools of four, two through from each: sides 1-4
 * are Pool A, 5-8 Pool B and 9-12 Pool C.
 */
function seedGroupsThenKnockout(database: TestDatabase, prefix: string) {
  return seedPosted(database, prefix, {
    tournamentShape: "groups_then_knockout",
    teamCount: 12,
    completeTeams: 12,
  });
}

type Seeded = Awaited<ReturnType<typeof seedPosted>>;

async function matchAt(
  database: TestDatabase,
  gameId: string,
  round: number,
  position: number,
) {
  const row = await database.query.matches.findFirst({
    where: and(
      eq(matches.gameId, gameId),
      eq(matches.knockoutRound, round),
      eq(matches.knockoutPosition, position),
    ),
  });
  if (!row) {
    throw new Error(`No Knockout Match at ${round}:${position}`);
  }
  return row;
}

async function poolMatches(database: TestDatabase, gameId: string) {
  return database.query.matches.findMany({
    where: and(eq(matches.gameId, gameId), isNull(matches.knockoutRound)),
    orderBy: (table, { asc }) => [asc(table.roundNumber), asc(table.startTime)],
  });
}

async function settle(
  database: TestDatabase,
  seeded: Seeded,
  match: { id: string },
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
}

async function settlePoolStage(database: TestDatabase, seeded: Seeded) {
  for (const match of await poolMatches(database, seeded.gameId)) {
    if (match.status !== MatchStatusEnum.PENDING) {
      continue;
    }
    const lower =
      seeded.sideOf(match.slot1GameTeamId) <
      seeded.sideOf(match.slot2GameTeamId);
    await settle(database, seeded, match, lower ? 1 : 2);
  }
}

async function ratingEventCount(database: TestDatabase, matchId: string) {
  const rows = await database.query.ratingEvents.findMany({
    where: eq(ratingEvents.matchId, matchId),
  });
  return rows.length;
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

function placeFor(rounds: KnockoutViewRound[] | null, matchId: string) {
  for (const round of rounds ?? []) {
    for (const place of round.places) {
      if (place.kind === "match" && place.matchId === matchId) {
        return place;
      }
    }
  }
  return null;
}

describe("cancelling a Knockout Match with both sides present", () => {
  it("requires the advancing team and refuses a team that is not on the Match", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedKnockoutOnly(db, "wo-two-refused");
      const q2 = await matchAt(db, seeded.gameId, 1, 2);

      await expectRefused(
        () =>
          cancelMatch(db, {
            gameId: seeded.gameId,
            userId: seeded.owner.id,
            matchId: q2.id,
          }),
        "BAD_REQUEST",
        WALKOVER_TEAM_REQUIRED_MESSAGE,
      );
      await expectRefused(
        () =>
          cancelMatch(db, {
            gameId: seeded.gameId,
            userId: seeded.owner.id,
            matchId: q2.id,
            advancingGameTeamId: seeded.team(1),
          }),
        "BAD_REQUEST",
        WALKOVER_TEAM_NOT_ON_MATCH_MESSAGE,
      );

      const unchanged = await matchAt(db, seeded.gameId, 1, 2);
      expect(unchanged.status).toBe(MatchStatusEnum.PENDING);
      expect(unchanged.walkoverGameTeamId).toBeNull();
      expect(
        (await matchAt(db, seeded.gameId, 2, 1)).slot2GameTeamId,
      ).toBeNull();
    } finally {
      await close();
    }
  });

  it("awards a Walkover: the chosen team goes through, nothing is rated, and Match History has no result", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedKnockoutOnly(db, "wo-two");
      const q2 = await matchAt(db, seeded.gameId, 1, 2);

      await cancelMatch(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        matchId: q2.id,
        advancingGameTeamId: seeded.team(5),
      });

      const walkover = await matchAt(db, seeded.gameId, 1, 2);
      expect(walkover.status).toBe(MatchStatusEnum.CANCELLED);
      expect(walkover.walkoverGameTeamId).toBe(seeded.team(5));
      const semi = await matchAt(db, seeded.gameId, 2, 1);
      expect(semi.slot1GameTeamId).toBe(seeded.team(1));
      expect(semi.slot2GameTeamId).toBe(seeded.team(5));
      expect(await ratingEventCount(db, q2.id)).toBe(0);

      for (const userId of [...seeded.players(4), ...seeded.players(5)]) {
        const history = await listMyMatchHistoryRows(db, userId, AFTER_THE_DAY);
        expect(history.some((row) => row.matchId === q2.id)).toBe(false);
      }

      const detail = await gameById(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      expect(
        detail.matches.find((match) => match.id === q2.id)?.walkoverGameTeamId,
      ).toBe(seeded.team(5));
      const place = placeFor(detail.knockout, q2.id);
      expect(place?.walkover).toBe(2);
      expect(place?.winner).toBeNull();
      expect(place?.settled).toBe(true);
    } finally {
      await close();
    }
  });

  it("writes the advancing team into slot 1 of the fed Match from an odd position", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedKnockoutOnly(db, "wo-slot1");
      await settle(db, seeded, await matchAt(db, seeded.gameId, 1, 2), 1);
      const semi = await matchAt(db, seeded.gameId, 2, 1);
      expect(semi.slot2GameTeamId).toBe(seeded.team(4));

      await cancelMatch(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        matchId: semi.id,
        advancingGameTeamId: seeded.team(4),
      });

      const final = await matchAt(db, seeded.gameId, 3, 1);
      expect(final.slot1GameTeamId).toBe(seeded.team(4));
      expect(final.slot2GameTeamId).toBeNull();
    } finally {
      await close();
    }
  });

  it("refuses to cancel a completed Knockout Match", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedKnockoutOnly(db, "wo-completed");
      const q2 = await matchAt(db, seeded.gameId, 1, 2);
      await settle(db, seeded, q2, 1);

      await expectRefused(
        () =>
          cancelMatch(db, {
            gameId: seeded.gameId,
            userId: seeded.owner.id,
            matchId: q2.id,
            advancingGameTeamId: seeded.team(5),
          }),
        "BAD_REQUEST",
        KNOCKOUT_MATCH_ALREADY_COMPLETED_MESSAGE,
      );
      expect((await matchAt(db, seeded.gameId, 1, 2)).status).toBe(
        MatchStatusEnum.COMPLETED,
      );
      expect((await matchAt(db, seeded.gameId, 2, 1)).slot2GameTeamId).toBe(
        seeded.team(4),
      );
    } finally {
      await close();
    }
  });
});

describe("cancelling a Knockout Match with one side present", () => {
  it("sends that team through without asking", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedKnockoutOnly(db, "wo-one");
      const semi = await matchAt(db, seeded.gameId, 2, 2);
      expect(semi.slot1GameTeamId).toBe(seeded.team(2));
      expect(semi.slot2GameTeamId).toBeNull();

      await expectRefused(
        () =>
          cancelMatch(db, {
            gameId: seeded.gameId,
            userId: seeded.owner.id,
            matchId: semi.id,
            advancingGameTeamId: seeded.team(3),
          }),
        "BAD_REQUEST",
        WALKOVER_TEAM_NOT_ON_MATCH_MESSAGE,
      );

      await cancelMatch(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        matchId: semi.id,
      });

      expect((await matchAt(db, seeded.gameId, 2, 2)).walkoverGameTeamId).toBe(
        seeded.team(2),
      );
      expect((await matchAt(db, seeded.gameId, 3, 1)).slot2GameTeamId).toBe(
        seeded.team(2),
      );
      expect(await ratingEventCount(db, semi.id)).toBe(0);
    } finally {
      await close();
    }
  });
});

describe("cancelling a Knockout Match with no side present", () => {
  it("cancels the Match and sends nobody through", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedKnockoutOnly(db, "wo-none");
      const final = await matchAt(db, seeded.gameId, 3, 1);
      expect(final.slot1GameTeamId).toBeNull();
      expect(final.slot2GameTeamId).toBeNull();

      await cancelMatch(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        matchId: final.id,
        advancingGameTeamId: seeded.team(1),
      });

      const cancelled = await matchAt(db, seeded.gameId, 3, 1);
      expect(cancelled.status).toBe(MatchStatusEnum.CANCELLED);
      expect(cancelled.walkoverGameTeamId).toBeNull();
      const detail = await gameById(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      expect(knockoutChampion(detail.knockout)).toBeNull();
      const place = placeFor(detail.knockout, final.id);
      expect(place?.walkover).toBeNull();
      expect(place ? knockoutCancelPrompt(place).kind : null).toBe("nobody");
    } finally {
      await close();
    }
  });
});

describe("a Walkover in the Final", () => {
  it("makes the awarded team Champion without rating the Final", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedKnockoutOnly(db, "wo-final");
      await settle(db, seeded, await matchAt(db, seeded.gameId, 1, 2), 2);
      await settle(db, seeded, await matchAt(db, seeded.gameId, 1, 4), 1);
      await settle(db, seeded, await matchAt(db, seeded.gameId, 2, 1), 1);
      await settle(db, seeded, await matchAt(db, seeded.gameId, 2, 2), 2);
      const final = await matchAt(db, seeded.gameId, 3, 1);
      expect(final.slot1GameTeamId).toBe(seeded.team(1));
      expect(final.slot2GameTeamId).toBe(seeded.team(3));

      await cancelMatch(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        matchId: final.id,
        advancingGameTeamId: seeded.team(3),
      });

      expect(await ratingEventCount(db, final.id)).toBe(0);
      const detail = await gameById(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      expect(knockoutChampion(detail.knockout)?.gameTeamId).toBe(
        seeded.team(3),
      );
      const place = placeFor(detail.knockout, final.id);
      expect(place?.walkover).toBe(2);
      expect(place?.winner).toBeNull();
    } finally {
      await close();
    }
  });
});

describe("removing a team after the draw", () => {
  it("vacates its slot in unplayed Knockout Matches and leaves its completed Matches alone", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedKnockoutOnly(db, "wo-remove");
      const q4 = await matchAt(db, seeded.gameId, 1, 4);
      await settle(db, seeded, q4, 1);
      expect((await matchAt(db, seeded.gameId, 2, 2)).slot2GameTeamId).toBe(
        seeded.team(3),
      );

      await kick(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        userId: seeded.players(3)[0]!,
      });

      const playedQ4 = await matchAt(db, seeded.gameId, 1, 4);
      expect(playedQ4.status).toBe(MatchStatusEnum.COMPLETED);
      expect(playedQ4.slot1GameTeamId).toBe(seeded.team(3));
      expect(await ratingEventCount(db, q4.id)).toBe(4);
      const semi = await matchAt(db, seeded.gameId, 2, 2);
      expect(semi.status).toBe(MatchStatusEnum.PENDING);
      expect(semi.slot1GameTeamId).toBe(seeded.team(2));
      expect(semi.slot2GameTeamId).toBeNull();

      await cancelMatch(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        matchId: semi.id,
      });
      expect((await matchAt(db, seeded.gameId, 3, 1)).slot2GameTeamId).toBe(
        seeded.team(2),
      );
    } finally {
      await close();
    }
  });

  it("vacates a first-round slot so the Organizer resolves it by cancel", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedKnockoutOnly(db, "wo-remove-first");
      await kick(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        userId: seeded.players(4)[1]!,
      });

      const q2 = await matchAt(db, seeded.gameId, 1, 2);
      expect(q2.status).toBe(MatchStatusEnum.PENDING);
      expect(q2.slot1GameTeamId).toBeNull();
      expect(q2.slot2GameTeamId).toBe(seeded.team(5));

      await cancelMatch(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        matchId: q2.id,
      });
      expect((await matchAt(db, seeded.gameId, 2, 1)).slot2GameTeamId).toBe(
        seeded.team(5),
      );
    } finally {
      await close();
    }
  });

  it("on Groups then knockout voids its unplayed Pool Matches and never places it", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedGroupsThenKnockout(db, "wo-remove-pool");
      const pool = await poolMatches(db, seeded.gameId);
      const first = pool.find(
        (match) =>
          match.slot1GameTeamId === seeded.team(1) ||
          match.slot2GameTeamId === seeded.team(1),
      )!;
      await settle(
        db,
        seeded,
        first,
        first.slot1GameTeamId === seeded.team(1) ? 1 : 2,
      );

      await kick(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        userId: seeded.players(1)[0]!,
      });

      const team1Matches = (await poolMatches(db, seeded.gameId)).filter(
        (match) =>
          match.slot1GameTeamId === seeded.team(1) ||
          match.slot2GameTeamId === seeded.team(1),
      );
      expect(team1Matches.find((match) => match.id === first.id)?.status).toBe(
        MatchStatusEnum.COMPLETED,
      );
      expect(
        team1Matches
          .filter((match) => match.id !== first.id)
          .every((match) => match.status === MatchStatusEnum.CANCELLED),
      ).toBe(true);

      await settlePoolStage(db, seeded);
      const knockout = await db.query.matches.findMany({
        where: and(
          eq(matches.gameId, seeded.gameId),
          isNotNull(matches.knockoutRound),
        ),
      });
      const placed = knockout.flatMap((match) =>
        [match.slot1GameTeamId, match.slot2GameTeamId].filter(Boolean),
      );
      expect(placed).toHaveLength(6);
      expect(placed).not.toContain(seeded.team(1));
      expect(placed).toContain(seeded.team(2));
      expect(placed).toContain(seeded.team(3));
    } finally {
      await close();
    }
  });

  it("on Groups then knockout leaves a vacated qualifier slot empty instead of placing the next team", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedGroupsThenKnockout(db, "wo-remove-placed");
      await settlePoolStage(db, seeded);
      const q2 = await matchAt(db, seeded.gameId, 1, 2);
      expect(q2.slot1GameTeamId).toBe(seeded.team(2));
      expect(q2.slot2GameTeamId).toBe(seeded.team(10));
      const poolMatchesBefore = await poolMatches(db, seeded.gameId);

      await kick(db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        userId: seeded.players(2)[0]!,
      });

      const vacated = await matchAt(db, seeded.gameId, 1, 2);
      expect(vacated.slot1GameTeamId).toBeNull();
      expect(vacated.slot2GameTeamId).toBe(seeded.team(10));
      expect(await poolMatches(db, seeded.gameId)).toEqual(poolMatchesBefore);
      const knockout = await db.query.matches.findMany({
        where: and(
          eq(matches.gameId, seeded.gameId),
          isNotNull(matches.knockoutRound),
        ),
      });
      expect(
        knockout.flatMap((match) =>
          [match.slot1GameTeamId, match.slot2GameTeamId].filter(Boolean),
        ),
      ).not.toContain(seeded.team(3));

      await cancelMatch(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        matchId: vacated.id,
      });
      expect((await matchAt(db, seeded.gameId, 2, 1)).slot2GameTeamId).toBe(
        seeded.team(10),
      );
    } finally {
      await close();
    }
  });
});

describe("Pool Matches and the tournament keep their cancel rules", () => {
  it("refuses an advancing team on a Pool Match and voids it as before", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedGroupsThenKnockout(db, "wo-pool");
      const [first] = await poolMatches(db, seeded.gameId);

      await expectRefused(
        () =>
          cancelMatch(db, {
            gameId: seeded.gameId,
            userId: seeded.owner.id,
            matchId: first!.id,
            advancingGameTeamId: first!.slot1GameTeamId!,
          }),
        "BAD_REQUEST",
        POOL_MATCH_NOT_AWARDED_MESSAGE,
      );
      await cancelMatch(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        matchId: first!.id,
      });

      const voided = await db.query.matches.findFirst({
        where: eq(matches.id, first!.id),
      });
      expect(voided?.status).toBe(MatchStatusEnum.CANCELLED);
      expect(voided?.walkoverGameTeamId).toBeNull();
    } finally {
      await close();
    }
  });

  it("refuses a Pool score correction once a Knockout Match is a Walkover", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedGroupsThenKnockout(db, "wo-pool-correction");
      await settlePoolStage(db, seeded);
      const q2 = await matchAt(db, seeded.gameId, 1, 2);
      await cancelMatch(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        matchId: q2.id,
        advancingGameTeamId: seeded.team(2),
      });

      const pool = await poolMatches(db, seeded.gameId);
      await expectRefused(
        () =>
          reportWrongScore(db, {
            gameId: seeded.gameId,
            matchId: pool[pool.length - 1]!.id,
            userId: seeded.owner.id,
          }),
        "CONFLICT",
        POOL_CORRECTION_REFUSED_MESSAGE,
      );
      expect((await matchAt(db, seeded.gameId, 2, 1)).slot2GameTeamId).toBe(
        seeded.team(2),
      );
      const tables = await listPoolTables(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      expect(tables?.finished).toBe(true);
    } finally {
      await close();
    }
  });

  it("cancelling the tournament keeps played Matches and creates no Walkovers", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedKnockoutOnly(db, "wo-cancel-game");
      const q2 = await matchAt(db, seeded.gameId, 1, 2);
      await settle(db, seeded, q2, 1);

      await cancelGame(db, { gameId: seeded.gameId, userId: seeded.owner.id });

      const rows = await db.query.matches.findMany({
        where: eq(matches.gameId, seeded.gameId),
      });
      expect(rows.find((row) => row.id === q2.id)?.status).toBe(
        MatchStatusEnum.COMPLETED,
      );
      expect(
        rows
          .filter((row) => row.id !== q2.id)
          .every((row) => row.status === MatchStatusEnum.CANCELLED),
      ).toBe(true);
      expect(rows.every((row) => row.walkoverGameTeamId == null)).toBe(true);
      expect(await ratingEventCount(db, q2.id)).toBe(4);
      const semi = await matchAt(db, seeded.gameId, 2, 1);
      expect(semi.slot1GameTeamId).toBe(seeded.team(1));
      expect(semi.slot2GameTeamId).toBe(seeded.team(4));
    } finally {
      await close();
    }
  });
});

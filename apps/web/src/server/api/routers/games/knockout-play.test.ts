import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  MatchStatusEnum,
  courts,
  gameTeams,
  groups,
  matches,
  matchResultConfirmations,
  ratingEvents,
  user,
  venues,
} from "@repo/db/schema";

import { addSet } from "~/server/api/routers/games/addSet";
import { gameById } from "~/server/api/routers/games/byId";
import { completeMatch } from "~/server/api/routers/games/completeMatch";
import { confirmMatchResult } from "~/server/api/routers/games/confirmMatchResult";
import { createTournament } from "~/server/api/routers/games/createTournament";
import { drawPools } from "~/server/api/routers/games/drawPools";
import { listMyMatchHistoryRows } from "~/server/api/routers/games/listMyMatchHistory";
import { postPoolDraw } from "~/server/api/routers/games/postPoolDraw";
import { registerSeat } from "~/server/api/routers/games/registerSeat";
import { removeSet } from "~/server/api/routers/games/removeSet";
import { reportWrongScore } from "~/server/api/routers/games/reportWrongScore";
import { scoreSet } from "~/server/api/routers/games/scoreSet";
import { requireGame } from "~/server/games/access";
import {
  KNOCKOUT_EMPTY_SIDE_MESSAGE,
  KNOCKOUT_LEVEL_MESSAGE,
  KNOCKOUT_TAKE_BACK_REFUSED_MESSAGE,
} from "~/server/games/knockout-advance";
import { runMatchCompletionEffect } from "~/server/games/run-match-completion-effect";
import {
  KNOCKOUT_DECIDING_SET_COPY,
  knockoutChampion,
} from "~/lib/tournament-knockout-view";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

const AFTER_THE_DAY = new Date("2026-09-21T12:00:00");

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

/**
 * Six complete Game teams in an eight-place tree, drawn in side order:
 * sides 1 and 2 have Byes, Q2 is side 4 v side 5, Q4 is side 3 v side 6.
 */
async function seedPostedKnockout(database: TestDatabase, prefix: string) {
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
  const created = await createTournament(database, {
    createdBy: owner.id,
    name: "Knockout day",
    groupId: group.id,
    isPublic: true,
    registrationMode: "individual",
    tournamentShape: "knockout_only",
    teamCount: 8,
    venueId: venue.id,
    courtIds: courtRows.map((court) => court.id),
    matchMinutes: 45,
    windowStart: new Date("2026-09-20T10:00:00"),
    windowEnd: new Date("2026-09-20T18:00:00"),
  });
  const playersBySide = new Map<number, string[]>();
  for (let side = 1; side <= 6; side += 1) {
    const left = await insertUser(database, `${prefix}-${side}l@example.com`);
    const right = await insertUser(database, `${prefix}-${side}r@example.com`);
    await registerSeat(database, {
      gameId: created.id,
      userId: left.id,
      sideIndex: side,
      position: "left",
    });
    await registerSeat(database, {
      gameId: created.id,
      userId: right.id,
      sideIndex: side,
      position: "right",
    });
    playersBySide.set(side, [left.id, right.id]);
  }
  await drawPools(database, {
    gameId: created.id,
    organizerUserId: owner.id,
    shuffle: identityShuffle,
  });
  await postPoolDraw(database, {
    gameId: created.id,
    organizerUserId: owner.id,
  });
  const teams = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, created.id),
  });
  const teamIdBySide = new Map(
    teams.map((team) => [team.sideIndex ?? 0, team.id]),
  );
  const team = (side: number) => {
    const id = teamIdBySide.get(side);
    if (!id) {
      throw new Error(`No Game team on side ${side}`);
    }
    return id;
  };
  const players = (side: number) => playersBySide.get(side) ?? [];
  return { owner, gameId: created.id, team, players };
}

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

async function scoreNewSet(
  database: TestDatabase,
  args: {
    gameId: string;
    matchId: string;
    userId: string;
    slot1GamesWon: number;
    slot2GamesWon: number;
  },
) {
  const set = await addSet(database, {
    gameId: args.gameId,
    matchId: args.matchId,
    userId: args.userId,
  });
  await scoreSet(database, { ...args, setId: set.id });
  return set;
}

async function forceComplete(
  database: TestDatabase,
  seeded: Awaited<ReturnType<typeof seedPostedKnockout>>,
  round: number,
  position: number,
  winner: 1 | 2,
) {
  const match = await matchAt(database, seeded.gameId, round, position);
  await scoreNewSet(database, {
    gameId: seeded.gameId,
    matchId: match.id,
    userId: seeded.owner.id,
    slot1GamesWon: winner === 1 ? 6 : 2,
    slot2GamesWon: winner === 1 ? 2 : 6,
  });
  await completeMatch(database, {
    gameId: seeded.gameId,
    matchId: match.id,
    userId: seeded.owner.id,
  });
  return match;
}

async function ratingEventCount(database: TestDatabase, matchId: string) {
  const rows = await database.query.ratingEvents.findMany({
    where: eq(ratingEvents.matchId, matchId),
  });
  return rows.length;
}

describe("Knockout advance on completion", () => {
  it("advances the winner on the confirmation path, so a Bye team meets a first-round winner", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedKnockout(db, "advance-confirm");
      const q2 = await matchAt(db, seeded.gameId, 1, 2);
      expect(q2.slot1GameTeamId).toBe(seeded.team(4));
      expect(q2.slot2GameTeamId).toBe(seeded.team(5));
      const [side4Left, side4Right] = seeded.players(4);
      const [side5Left, side5Right] = seeded.players(5);

      await scoreNewSet(db, {
        gameId: seeded.gameId,
        matchId: q2.id,
        userId: side4Left!,
        slot1GamesWon: 3,
        slot2GamesWon: 6,
      });
      for (const userId of [side4Right!, side5Left!, side5Right!]) {
        await confirmMatchResult(db, {
          gameId: seeded.gameId,
          matchId: q2.id,
          userId,
        });
      }

      expect((await matchAt(db, seeded.gameId, 1, 2)).status).toBe(
        MatchStatusEnum.COMPLETED,
      );
      const semi = await matchAt(db, seeded.gameId, 2, 1);
      expect(semi.slot1GameTeamId).toBe(seeded.team(1));
      expect(semi.slot2GameTeamId).toBe(seeded.team(5));
      expect(await ratingEventCount(db, q2.id)).toBe(4);

      const history = await listMyMatchHistoryRows(
        db,
        side5Left!,
        AFTER_THE_DAY,
      );
      expect(history.find((row) => row.matchId === q2.id)?.outcome).toBe("won");
    } finally {
      await close();
    }
  });

  it("advances the winner on Organizer force-complete into the even position's slot 2", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedKnockout(db, "advance-force");
      await forceComplete(db, seeded, 1, 4, 1);

      const semi = await matchAt(db, seeded.gameId, 2, 2);
      expect(semi.slot1GameTeamId).toBe(seeded.team(2));
      expect(semi.slot2GameTeamId).toBe(seeded.team(3));
      expect(
        (await matchAt(db, seeded.gameId, 2, 1)).slot2GameTeamId,
      ).toBeNull();
    } finally {
      await close();
    }
  });

  it("does not advance or rate twice on a duplicate confirmation", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedKnockout(db, "advance-dup");
      const q2 = await matchAt(db, seeded.gameId, 1, 2);
      const [side4Left, side4Right] = seeded.players(4);
      const [side5Left, side5Right] = seeded.players(5);
      await scoreNewSet(db, {
        gameId: seeded.gameId,
        matchId: q2.id,
        userId: side4Left!,
        slot1GamesWon: 6,
        slot2GamesWon: 1,
      });
      for (const userId of [side4Right!, side5Left!, side5Right!]) {
        await confirmMatchResult(db, {
          gameId: seeded.gameId,
          matchId: q2.id,
          userId,
        });
      }

      await expect(
        confirmMatchResult(db, {
          gameId: seeded.gameId,
          matchId: q2.id,
          userId: side5Right!,
        }),
      ).rejects.toBeInstanceOf(TRPCError);
      await runMatchCompletionEffect(
        db,
        await requireGame(db, seeded.gameId),
        q2.id,
      );

      expect(await ratingEventCount(db, q2.id)).toBe(4);
      const semi = await matchAt(db, seeded.gameId, 2, 1);
      expect(semi.slot2GameTeamId).toBe(seeded.team(4));
    } finally {
      await close();
    }
  });
});

describe("a level Knockout Match", () => {
  async function seedLevel(database: TestDatabase, prefix: string) {
    const seeded = await seedPostedKnockout(database, prefix);
    const q2 = await matchAt(database, seeded.gameId, 1, 2);
    const [side4Left] = seeded.players(4);
    await scoreNewSet(database, {
      gameId: seeded.gameId,
      matchId: q2.id,
      userId: side4Left!,
      slot1GamesWon: 6,
      slot2GamesWon: 4,
    });
    const second = await scoreNewSet(database, {
      gameId: seeded.gameId,
      matchId: q2.id,
      userId: side4Left!,
      slot1GamesWon: 3,
      slot2GamesWon: 6,
    });
    return { seeded, q2, secondSetId: second.id };
  }

  it("refuses Organizer force-complete with the deciding Set message", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { seeded, q2 } = await seedLevel(db, "level-force");
      await expectRefused(
        () =>
          completeMatch(db, {
            gameId: seeded.gameId,
            matchId: q2.id,
            userId: seeded.owner.id,
          }),
        "BAD_REQUEST",
        KNOCKOUT_LEVEL_MESSAGE,
      );
      expect(KNOCKOUT_LEVEL_MESSAGE).toBe(KNOCKOUT_DECIDING_SET_COPY);
      expect((await matchAt(db, seeded.gameId, 1, 2)).status).toBe(
        MatchStatusEnum.PENDING,
      );
      expect(await ratingEventCount(db, q2.id)).toBe(0);
    } finally {
      await close();
    }
  });

  it("asks nobody to confirm and refuses a result confirmation", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { seeded, q2 } = await seedLevel(db, "level-confirm");
      const confirmations = await db.query.matchResultConfirmations.findMany({
        where: eq(matchResultConfirmations.matchId, q2.id),
      });
      expect(confirmations).toHaveLength(0);

      const [side5Left] = seeded.players(5);
      await expectRefused(
        () =>
          confirmMatchResult(db, {
            gameId: seeded.gameId,
            matchId: q2.id,
            userId: side5Left!,
          }),
        "FORBIDDEN",
        KNOCKOUT_LEVEL_MESSAGE,
      );

      const detail = await gameById(db, {
        gameId: seeded.gameId,
        userId: side5Left!,
      });
      expect(
        detail.matches.find((match) => match.id === q2.id)?.canComplete,
      ).toBe(false);
      const quarter = detail.knockout?.[0]?.places.find(
        (place) => place.kind === "match" && place.matchId === q2.id,
      );
      expect(quarter?.kind === "match" && quarter.needsDecidingSet).toBe(true);
    } finally {
      await close();
    }
  });

  it("does not complete automatically on a Set write even when every seat had confirmed", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { seeded, q2, secondSetId } = await seedLevel(db, "level-auto");
      await db.insert(matchResultConfirmations).values(
        [...seeded.players(4), ...seeded.players(5)].map((userId) => ({
          matchId: q2.id,
          userId,
        })),
      );
      const [, side5Right] = seeded.players(5);
      await scoreSet(db, {
        gameId: seeded.gameId,
        matchId: q2.id,
        setId: secondSetId,
        userId: side5Right!,
        slot1GamesWon: 3,
        slot2GamesWon: 6,
      });
      await runMatchCompletionEffect(
        db,
        await requireGame(db, seeded.gameId),
        q2.id,
      );

      expect((await matchAt(db, seeded.gameId, 1, 2)).status).toBe(
        MatchStatusEnum.PENDING,
      );
      expect(await ratingEventCount(db, q2.id)).toBe(0);
      expect(
        (await matchAt(db, seeded.gameId, 2, 1)).slot2GameTeamId,
      ).toBeNull();
    } finally {
      await close();
    }
  });

  it("completes once a deciding Set is added, and the winner advances", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { seeded, q2 } = await seedLevel(db, "level-decider");
      const [side4Left, side4Right] = seeded.players(4);
      const [side5Left, side5Right] = seeded.players(5);
      await scoreNewSet(db, {
        gameId: seeded.gameId,
        matchId: q2.id,
        userId: side4Left!,
        slot1GamesWon: 7,
        slot2GamesWon: 5,
      });
      for (const userId of [side4Right!, side5Left!, side5Right!]) {
        await confirmMatchResult(db, {
          gameId: seeded.gameId,
          matchId: q2.id,
          userId,
        });
      }

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

describe("a Knockout Match with an empty side", () => {
  it("refuses Sets against a placeholder", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedKnockout(db, "empty-side");
      const semi = await matchAt(db, seeded.gameId, 2, 1);
      const final = await matchAt(db, seeded.gameId, 3, 1);
      for (const match of [semi, final]) {
        await expectRefused(
          () =>
            addSet(db, {
              gameId: seeded.gameId,
              matchId: match.id,
              userId: seeded.owner.id,
            }),
          "FORBIDDEN",
          KNOCKOUT_EMPTY_SIDE_MESSAGE,
        );
      }

      const detail = await gameById(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      const semiRow = detail.matches.find((match) => match.id === semi.id);
      expect(semiRow?.canAddSet).toBe(false);
      expect(semiRow?.canScoreSets).toBe(false);
    } finally {
      await close();
    }
  });
});

describe("the Final and the Champion", () => {
  it("marks the Final's winner as Champion on the tree", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedKnockout(db, "final");
      await forceComplete(db, seeded, 1, 2, 2);
      await forceComplete(db, seeded, 1, 4, 1);
      await forceComplete(db, seeded, 2, 1, 1);
      await forceComplete(db, seeded, 2, 2, 2);

      const final = await matchAt(db, seeded.gameId, 3, 1);
      expect(final.slot1GameTeamId).toBe(seeded.team(1));
      expect(final.slot2GameTeamId).toBe(seeded.team(3));

      let detail = await gameById(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      expect(knockoutChampion(detail.knockout)).toBeNull();

      await forceComplete(db, seeded, 3, 1, 2);
      expect(await ratingEventCount(db, final.id)).toBe(4);

      detail = await gameById(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      expect(knockoutChampion(detail.knockout)?.gameTeamId).toBe(
        seeded.team(3),
      );
      const finalPlace = detail.knockout?.at(-1)?.places[0];
      expect(finalPlace?.kind === "match" ? finalPlace.winner : null).toBe(2);
    } finally {
      await close();
    }
  });
});

describe("a wrong-score report on a Knockout Match", () => {
  it("takes the winner back out of the fed Match and reopens the Match", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedKnockout(db, "take-back");
      const q2 = await forceComplete(db, seeded, 1, 2, 1);
      expect((await matchAt(db, seeded.gameId, 2, 1)).slot2GameTeamId).toBe(
        seeded.team(4),
      );

      await reportWrongScore(db, {
        gameId: seeded.gameId,
        matchId: q2.id,
        userId: seeded.owner.id,
      });

      expect((await matchAt(db, seeded.gameId, 1, 2)).status).toBe(
        MatchStatusEnum.PENDING,
      );
      expect(
        (await matchAt(db, seeded.gameId, 2, 1)).slot2GameTeamId,
      ).toBeNull();
      expect(await ratingEventCount(db, q2.id)).toBe(0);
    } finally {
      await close();
    }
  });

  it("is refused once the fed Match has a Set, with nothing reversed", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedKnockout(db, "take-back-refused");
      const q2 = await forceComplete(db, seeded, 1, 2, 1);
      const semi = await matchAt(db, seeded.gameId, 2, 1);
      const set = await addSet(db, {
        gameId: seeded.gameId,
        matchId: semi.id,
        userId: seeded.owner.id,
      });

      await expectRefused(
        () =>
          reportWrongScore(db, {
            gameId: seeded.gameId,
            matchId: q2.id,
            userId: seeded.owner.id,
          }),
        "CONFLICT",
        KNOCKOUT_TAKE_BACK_REFUSED_MESSAGE,
      );
      expect((await matchAt(db, seeded.gameId, 1, 2)).status).toBe(
        MatchStatusEnum.COMPLETED,
      );
      expect((await matchAt(db, seeded.gameId, 2, 1)).slot2GameTeamId).toBe(
        seeded.team(4),
      );
      expect(await ratingEventCount(db, q2.id)).toBe(4);

      await removeSet(db, {
        gameId: seeded.gameId,
        matchId: semi.id,
        setId: set.id,
        userId: seeded.owner.id,
      });
      await reportWrongScore(db, {
        gameId: seeded.gameId,
        matchId: q2.id,
        userId: seeded.owner.id,
      });
      expect(
        (await matchAt(db, seeded.gameId, 2, 1)).slot2GameTeamId,
      ).toBeNull();
    } finally {
      await close();
    }
  });

  it("is refused once the fed Match is completed", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedKnockout(db, "take-back-completed");
      const q2 = await forceComplete(db, seeded, 1, 2, 1);
      await forceComplete(db, seeded, 2, 1, 1);

      await expect(
        reportWrongScore(db, {
          gameId: seeded.gameId,
          matchId: q2.id,
          userId: seeded.owner.id,
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
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

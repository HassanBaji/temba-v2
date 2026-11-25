import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it, onTestFinished } from "vitest";

import {
  GamePositionEnum,
  GroupMemberRoleEnum,
  MatchStatusEnum,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  games,
  groupMembers,
  groups,
  matchSets,
  matches,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { messagesFor } from "@repo/i18n/messages";

import {
  insertKingPlayers,
  insertKingTournament,
  insertKingUser,
  seatKingTeams,
} from "#src/games/king-of-the-court.test-support";
import { gameById } from "#src/routers/games/byId";
import { cancelGame } from "#src/routers/games/cancel";
import { createGame } from "#src/routers/games/create";
import { postKingCourts } from "#src/routers/games/postKingCourts";
import { postKingFinalOrder } from "#src/routers/games/postKingFinalOrder";
import { reportWrongScore } from "#src/routers/games/reportWrongScore";
import { updateGameSeries } from "#src/routers/games/updateSeries";
import { createSeries } from "#src/routers/series/create";
import { endSeries } from "#src/routers/series/end";

const NOW = new Date("2026-11-21T10:00:00Z");
const HOUR = 60 * 60 * 1000;
const errors = messagesFor("en").series.errors;

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${name}-${crypto.randomUUID()}@example.com` })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function fixture() {
  const { db, close } = await createPgliteDb();
  onTestFinished(close);
  const owner = await insertUser(db, "owner");
  const organizer = await insertUser(db, "organizer");
  const member = await insertUser(db, "member");
  const rival = await insertUser(db, "rival");
  const [group] = await db
    .insert(groups)
    .values({
      name: "Tuesday Night Padel",
      createdBy: owner.id,
      sport: "padel",
      verifiedAt: NOW,
    })
    .returning();
  const [venue] = await db
    .insert(venues)
    .values({ name: "Seef Padel", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  if (!group || !venue) {
    throw new Error("Failed to insert fixture");
  }
  await db.insert(groupMembers).values([
    { groupId: group.id, userId: owner.id },
    {
      groupId: group.id,
      userId: organizer.id,
      role: GroupMemberRoleEnum.ORGANIZER,
    },
    { groupId: group.id, userId: member.id },
    { groupId: group.id, userId: rival.id },
  ]);
  const sunday = await newSeries(db, group.id, owner.id, "Sunday Social");
  const friday = await newSeries(db, group.id, owner.id, "Friday Night");
  const windowStart = new Date("2026-12-06T18:00:00Z");
  const created = await createGame(
    db,
    {
      createdBy: owner.id,
      groupId: group.id,
      isPublic: false,
      format: "friendly_game",
      registrationMode: "individual",
      venueId: venue.id,
      windowStart,
      windowEnd: new Date(windowStart.getTime() + HOUR),
    },
    { now: NOW },
  );
  return {
    db,
    owner,
    organizer,
    member,
    rival,
    group,
    sunday,
    friday,
    gameId: created.id,
    matchId: created.matchId,
  };
}

type Fixture = Awaited<ReturnType<typeof fixture>>;

async function newSeries(
  database: TestDatabase,
  groupId: string,
  userId: string,
  name: string,
) {
  const created = await createSeries(database, {
    groupId,
    userId,
    name,
    emblem: "cup",
    colour: "gold",
    now: NOW,
  });
  return created.id;
}

async function rejection(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(TRPCError);
  return error as TRPCError;
}

async function viewed(f: Fixture, userId: string) {
  return gameById(f.db, { gameId: f.gameId, userId });
}

async function storedSeriesId(f: Fixture) {
  const row = await f.db.query.games.findFirst({
    where: eq(games.id, f.gameId),
    columns: { seriesId: true },
  });
  return row?.seriesId ?? null;
}

async function seat(f: Fixture, userId: string) {
  const [player] = await f.db
    .insert(gamePlayers)
    .values({ gameId: f.gameId, userId })
    .returning({ id: gamePlayers.id });
  if (!player) {
    throw new Error("Failed to insert game player");
  }
  return player.id;
}

async function completeMatch(f: Fixture) {
  const teamIds: string[] = [];
  for (const [sideIndex, userId] of [
    [1, f.member.id],
    [2, f.rival.id],
  ] as const) {
    const [team] = await f.db
      .insert(gameTeams)
      .values({ gameId: f.gameId, sideIndex })
      .returning({ id: gameTeams.id });
    if (!team) {
      throw new Error("Failed to insert game team");
    }
    await f.db.insert(gameTeamPlayers).values({
      gameTeamId: team.id,
      gamePlayerId: await seat(f, userId),
      position: GamePositionEnum.LEFT,
    });
    teamIds.push(team.id);
  }
  await f.db
    .update(matches)
    .set({
      status: MatchStatusEnum.COMPLETED,
      slot1GameTeamId: teamIds[0],
      slot2GameTeamId: teamIds[1],
    })
    .where(eq(matches.id, f.matchId));
  await f.db
    .insert(matchSets)
    .values({
      matchId: f.matchId,
      setNumber: 1,
      slot1GamesWon: 6,
      slot2GamesWon: 3,
    })
    .onConflictDoUpdate({
      target: [matchSets.matchId, matchSets.setNumber],
      set: { slot1GamesWon: 6, slot2GamesWon: 3 },
    });
}

describe("games.updateSeries", () => {
  it("adds, changes and removes a Game's Series, and games.byId follows", async () => {
    const f = await fixture();
    expect((await viewed(f, f.owner.id)).series).toBeNull();

    expect(
      await updateGameSeries(f.db, {
        gameId: f.gameId,
        userId: f.owner.id,
        seriesId: f.sunday,
      }),
    ).toEqual({ ok: true, seriesId: f.sunday });
    expect((await viewed(f, f.owner.id)).series).toMatchObject({
      id: f.sunday,
      name: "Sunday Social",
      edition: 1,
    });

    await updateGameSeries(f.db, {
      gameId: f.gameId,
      userId: f.organizer.id,
      seriesId: f.friday,
    });
    expect((await viewed(f, f.owner.id)).series).toMatchObject({
      id: f.friday,
      name: "Friday Night",
    });

    expect(
      await updateGameSeries(f.db, {
        gameId: f.gameId,
        userId: f.owner.id,
        seriesId: null,
      }),
    ).toEqual({ ok: true, seriesId: null });
    expect((await viewed(f, f.owner.id)).series).toBeNull();
    expect(await storedSeriesId(f)).toBeNull();
  });

  it("refuses a plain member and a player of the Game who is not an Organizer", async () => {
    const f = await fixture();
    await seat(f, f.rival.id);
    for (const userId of [f.member.id, f.rival.id]) {
      const error = await rejection(
        updateGameSeries(f.db, {
          gameId: f.gameId,
          userId,
          seriesId: f.sunday,
        }),
      );
      expect(error.code).toBe("FORBIDDEN");
    }
    expect(await storedSeriesId(f)).toBeNull();
  });

  it("refuses anyone on a cancelled Game", async () => {
    const f = await fixture();
    await updateGameSeries(f.db, {
      gameId: f.gameId,
      userId: f.owner.id,
      seriesId: f.sunday,
    });
    await cancelGame(f.db, { gameId: f.gameId, userId: f.owner.id });
    for (const seriesId of [f.friday, null]) {
      const error = await rejection(
        updateGameSeries(f.db, {
          gameId: f.gameId,
          userId: f.owner.id,
          seriesId,
        }),
      );
      expect(error.message).toBe(messagesFor("en").game.errors.editCancelled);
    }
    const member = await rejection(
      updateGameSeries(f.db, {
        gameId: f.gameId,
        userId: f.member.id,
        seriesId: f.friday,
      }),
    );
    expect(member.code).toBe("FORBIDDEN");
    expect(await storedSeriesId(f)).toBe(f.sunday);
  });

  it("locks add, change and remove once the Match is completed, and unlocks after a wrong-score report", async () => {
    const f = await fixture();
    await updateGameSeries(f.db, {
      gameId: f.gameId,
      userId: f.owner.id,
      seriesId: f.sunday,
    });
    await completeMatch(f);

    for (const seriesId of [f.friday, null]) {
      const error = await rejection(
        updateGameSeries(f.db, {
          gameId: f.gameId,
          userId: f.owner.id,
          seriesId,
        }),
      );
      expect(error.code).toBe("BAD_REQUEST");
      expect(error.message).toBe(errors.scoreIn);
    }
    expect(
      await updateGameSeries(f.db, {
        gameId: f.gameId,
        userId: f.owner.id,
        seriesId: f.sunday,
      }),
    ).toEqual({ ok: true, seriesId: f.sunday });

    await reportWrongScore(f.db, {
      gameId: f.gameId,
      matchId: f.matchId,
      userId: f.owner.id,
    });
    await updateGameSeries(f.db, {
      gameId: f.gameId,
      userId: f.owner.id,
      seriesId: f.friday,
    });
    expect(await storedSeriesId(f)).toBe(f.friday);
    await updateGameSeries(f.db, {
      gameId: f.gameId,
      userId: f.owner.id,
      seriesId: null,
    });
    expect(await storedSeriesId(f)).toBeNull();
  });

  it("refuses to add to a Game with no Series once the score is in", async () => {
    const f = await fixture();
    await completeMatch(f);
    const error = await rejection(
      updateGameSeries(f.db, {
        gameId: f.gameId,
        userId: f.owner.id,
        seriesId: f.sunday,
      }),
    );
    expect(error.message).toBe(errors.scoreIn);
    expect(await storedSeriesId(f)).toBeNull();
  });

  it("refuses an ended Series, and a Game already on one keeps it and can still remove it", async () => {
    const f = await fixture();
    await updateGameSeries(f.db, {
      gameId: f.gameId,
      userId: f.owner.id,
      seriesId: f.sunday,
    });
    expect(
      await endSeries(f.db, { id: f.sunday, userId: f.owner.id, now: NOW }),
    ).toEqual({ ended: true });

    expect((await viewed(f, f.owner.id)).series).toMatchObject({
      id: f.sunday,
    });
    expect(
      await updateGameSeries(f.db, {
        gameId: f.gameId,
        userId: f.owner.id,
        seriesId: f.sunday,
      }),
    ).toEqual({ ok: true, seriesId: f.sunday });

    await updateGameSeries(f.db, {
      gameId: f.gameId,
      userId: f.owner.id,
      seriesId: null,
    });
    expect(await storedSeriesId(f)).toBeNull();

    const again = await rejection(
      updateGameSeries(f.db, {
        gameId: f.gameId,
        userId: f.owner.id,
        seriesId: f.sunday,
      }),
    );
    expect(again.message).toBe(errors.ended);
  });

  it("refuses another Group's Series and a Group that is not Verified", async () => {
    const f = await fixture();
    const [other] = await f.db
      .insert(groups)
      .values({
        name: "Other Group",
        createdBy: f.owner.id,
        sport: "padel",
        verifiedAt: NOW,
      })
      .returning({ id: groups.id });
    const elsewhere = await newSeries(f.db, other!.id, f.owner.id, "Elsewhere");
    const notInGroup = await rejection(
      updateGameSeries(f.db, {
        gameId: f.gameId,
        userId: f.owner.id,
        seriesId: elsewhere,
      }),
    );
    expect(notInGroup.message).toBe(errors.notInGroup);

    await f.db
      .update(groups)
      .set({ verifiedAt: null })
      .where(eq(groups.id, f.group.id));
    const unverified = await rejection(
      updateGameSeries(f.db, {
        gameId: f.gameId,
        userId: f.owner.id,
        seriesId: f.sunday,
      }),
    );
    expect(unverified.code).toBe("FORBIDDEN");
    expect(unverified.message).toBe(errors.verifiedOnly);
  });
});

describe("canChangeSeries on games.byId", () => {
  it("is true for an Organizer before the score and false after, and false for a member", async () => {
    const f = await fixture();
    expect((await viewed(f, f.owner.id)).canChangeSeries).toBe(true);
    expect((await viewed(f, f.organizer.id)).canChangeSeries).toBe(true);
    expect((await viewed(f, f.member.id)).canChangeSeries).toBe(false);

    await completeMatch(f);
    expect((await viewed(f, f.owner.id)).canChangeSeries).toBe(false);
  });

  it("is false on a Group that is not Verified and on a cancelled Game", async () => {
    const f = await fixture();
    await f.db
      .update(groups)
      .set({ verifiedAt: null })
      .where(eq(groups.id, f.group.id));
    expect((await viewed(f, f.owner.id)).canChangeSeries).toBe(false);

    await f.db
      .update(groups)
      .set({ verifiedAt: NOW })
      .where(eq(groups.id, f.group.id));
    await cancelGame(f.db, { gameId: f.gameId, userId: f.owner.id });
    expect((await viewed(f, f.owner.id)).canChangeSeries).toBe(false);
  });
});

describe("seriesScoreLocked on games.byId", () => {
  it("is true only for an Organizer of a Game on a Series once the score is in", async () => {
    const bare = await fixture();
    await completeMatch(bare);
    expect((await viewed(bare, bare.owner.id)).seriesScoreLocked).toBe(false);

    const f = await fixture();
    await updateGameSeries(f.db, {
      gameId: f.gameId,
      userId: f.owner.id,
      seriesId: f.sunday,
    });
    expect((await viewed(f, f.owner.id)).seriesScoreLocked).toBe(false);

    await completeMatch(f);
    expect((await viewed(f, f.owner.id)).seriesScoreLocked).toBe(true);
    expect((await viewed(f, f.organizer.id)).seriesScoreLocked).toBe(true);
    expect((await viewed(f, f.member.id)).seriesScoreLocked).toBe(false);
  });

  it("stays false on a Group that is no longer Verified, where the Series can still be removed", async () => {
    const f = await fixture();
    await updateGameSeries(f.db, {
      gameId: f.gameId,
      userId: f.owner.id,
      seriesId: f.sunday,
    });
    await f.db
      .update(groups)
      .set({ verifiedAt: null })
      .where(eq(groups.id, f.group.id));

    const game = await viewed(f, f.owner.id);
    expect(game.series).toMatchObject({ id: f.sunday });
    expect(game.canChangeSeries).toBe(false);
    expect(game.seriesScoreLocked).toBe(false);
    expect(
      await updateGameSeries(f.db, {
        gameId: f.gameId,
        userId: f.owner.id,
        seriesId: null,
      }),
    ).toEqual({ ok: true, seriesId: null });
  });

  it("is true once the score is in on a Group that is no longer Verified", async () => {
    const f = await fixture();
    await updateGameSeries(f.db, {
      gameId: f.gameId,
      userId: f.owner.id,
      seriesId: f.sunday,
    });
    await f.db
      .update(groups)
      .set({ verifiedAt: null })
      .where(eq(groups.id, f.group.id));
    await completeMatch(f);

    const game = await viewed(f, f.owner.id);
    expect(game.canChangeSeries).toBe(false);
    expect(game.seriesScoreLocked).toBe(true);
  });
});

describe("a King of the court Social", () => {
  it("locks the link once the Final order is posted", async () => {
    const { db, close } = await createPgliteDb();
    onTestFinished(close);
    const organizer = await insertKingUser(db, "Hassan Haji");
    const start = new Date("2026-12-06T09:00:00Z");
    const gameId = await insertKingTournament(db, {
      createdBy: organizer.id,
      courts: 2,
      windowStart: start,
      windowEnd: new Date(start.getTime() + 2 * HOUR),
    });
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
      columns: { groupId: true },
    });
    const sunday = await newSeries(
      db,
      game!.groupId!,
      organizer.id,
      "Sunday Social",
    );
    const friday = await newSeries(
      db,
      game!.groupId!,
      organizer.id,
      "Friday Night",
    );
    await updateGameSeries(db, {
      gameId,
      userId: organizer.id,
      seriesId: sunday,
    });
    const teamIds = await seatKingTeams(
      db,
      gameId,
      await insertKingPlayers(db, 8),
    );
    await postKingCourts(db, {
      gameId,
      organizerUserId: organizer.id,
      gameTeamIds: teamIds,
    });
    expect(
      (await gameById(db, { gameId, userId: organizer.id })).canChangeSeries,
    ).toBe(true);

    await postKingFinalOrder(db, {
      gameId,
      organizerUserId: organizer.id,
      gameTeamIds: teamIds.slice(0, 3),
      now: new Date(start.getTime() + 3 * HOUR),
    });
    for (const seriesId of [friday, null]) {
      const error = await rejection(
        updateGameSeries(db, { gameId, userId: organizer.id, seriesId }),
      );
      expect(error.message).toBe(errors.scoreIn);
    }
    expect(
      (await gameById(db, { gameId, userId: organizer.id })).canChangeSeries,
    ).toBe(false);
  });
});

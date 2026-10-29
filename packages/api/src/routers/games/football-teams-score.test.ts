import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  courts,
  gamePlayers,
  games,
  groupMembers,
  groups,
  matches,
  ratingEvents,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { listMyGamesHubRows } from "#src/games/list-my-games";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { createGame } from "#src/routers/games/create";
import { footballBoard } from "#src/routers/games/footballBoard";
import { kick } from "#src/routers/games/kick";
import { leaveGame } from "#src/routers/games/leave";
import { publishFootballTeams } from "#src/routers/games/publishFootballTeams";
import { register } from "#src/routers/games/register";
import { saveFootballScore } from "#src/routers/games/saveFootballScore";
import { setFootballRole } from "#src/routers/games/setFootballRole";
import { loadGroupStandingMembers } from "#src/standing/load-group-standing";
import { createUnclaimedPlayer } from "#src/unclaimed-players/create-unclaimed-player";

const HOUR = 60 * 60 * 1000;

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

type Fixture = {
  db: TestDatabase;
  organizer: { id: string };
  gameId: string;
  windowEnd: Date;
};

async function withFootballGame(
  run: (f: Fixture) => Promise<void>,
  extra: { playersAllowed?: number } = {},
) {
  const { db, close } = await createPgliteDb();
  try {
    const organizer = await insertUser(db, "organizer");
    const [venue] = await db
      .insert(venues)
      .values({
        name: `Venue ${crypto.randomUUID()}`,
        city: "Manama",
        country: "BH",
      })
      .returning({ id: venues.id });
    const [pitch] = await db
      .insert(courts)
      .values({ venueId: venue!.id, name: "Pitch 1", sport: "football" })
      .returning({ id: courts.id });
    const [group] = await db
      .insert(groups)
      .values({
        name: "Friday Football",
        createdBy: organizer.id,
        sport: "football",
      })
      .returning({ id: groups.id });
    await db
      .insert(groupMembers)
      .values({ groupId: group!.id, userId: organizer.id });
    const windowStart = new Date(Date.now() + HOUR);
    const windowEnd = new Date(windowStart.getTime() + HOUR);
    const created = await createGame(db, {
      createdBy: organizer.id,
      groupId: group!.id,
      isPublic: false,
      format: "friendly_game",
      registrationMode: "individual",
      venueId: venue!.id,
      courtId: pitch!.id,
      windowStart,
      windowEnd,
      ...extra,
    });
    await run({ db, organizer, gameId: created.id, windowEnd });
  } finally {
    await close();
  }
}

async function addPlayer(
  f: Fixture,
  name: string,
  football?: Parameters<typeof register>[1]["football"],
) {
  const player = await insertUser(f.db, name);
  const game = await f.db.query.games.findFirst({
    where: eq(games.id, f.gameId),
    columns: { groupId: true },
  });
  await f.db
    .insert(groupMembers)
    .values({ groupId: game!.groupId!, userId: player.id });
  await register(f.db, { gameId: f.gameId, userId: player.id, football });
  return player;
}

async function addUnclaimedPlayer(f: Fixture, phoneNumber: string) {
  const created = await f.db.transaction((tx) =>
    createUnclaimedPlayer(tx, {
      phoneNumber,
      name: `Unclaimed ${phoneNumber}`,
      addedByUserId: f.organizer.id,
      startingLevel: { sport: "football", placement: "competitive" },
    }),
  );
  const game = await f.db.query.games.findFirst({
    where: eq(games.id, f.gameId),
    columns: { groupId: true },
  });
  await f.db
    .insert(groupMembers)
    .values({ groupId: game!.groupId!, userId: created.user.id });
  await register(f.db, { gameId: f.gameId, userId: created.user.id });
  return created.user;
}

async function addPlayers(f: Fixture, count: number) {
  const players: { id: string }[] = [];
  for (let index = 0; index < count; index += 1) {
    players.push(await addPlayer(f, `p${index}`));
  }
  return players;
}

function publish(
  f: Fixture,
  slot1: { id: string }[],
  slot2: { id: string }[],
  extra: Partial<Parameters<typeof publishFootballTeams>[1]> = {},
) {
  return publishFootballTeams(f.db, {
    gameId: f.gameId,
    userId: f.organizer.id,
    method: "manual",
    bibs: { slot1: "black", slot2: "white" },
    slot1: slot1.map((player) => player.id),
    slot2: slot2.map((player) => player.id),
    ...extra,
  });
}

const AFTER_KICKOFF = () => new Date(Date.now() + 3 * HOUR);

describe("joining a football Game as keeper or outfield", () => {
  it("stores the role and preferred position and caps keepers at two", async () => {
    await withFootballGame(async (f) => {
      const first = await addPlayer(f, "first", {
        role: "keeper",
        position: "mid",
      });
      await addPlayer(f, "second", { role: "keeper", position: "def" });
      await expect(
        addPlayer(f, "third", { role: "keeper", position: "fwd" }),
      ).rejects.toThrow("Both keeper seats are taken");
      const outfield = await addPlayer(f, "outfield", {
        role: "outfield",
        position: "fwd",
      });

      const board = await footballBoard(f.db, {
        gameId: f.gameId,
        userId: outfield.id,
      });
      expect(
        board.players.map((player) => [player.role, player.position]),
      ).toEqual([
        ["keeper", "mid"],
        ["keeper", "def"],
        ["outfield", "fwd"],
      ]);
      expect(board.teams).toBeNull();

      await expect(
        setFootballRole(f.db, {
          gameId: f.gameId,
          userId: outfield.id,
          role: "keeper",
          position: "fwd",
        }),
      ).rejects.toThrow("Both keeper seats are taken");
      await setFootballRole(f.db, {
        gameId: f.gameId,
        userId: first.id,
        role: "outfield",
        position: "def",
      });
      await setFootballRole(f.db, {
        gameId: f.gameId,
        userId: outfield.id,
        role: "keeper",
        position: "fwd",
      });
    });
  });
});

describe("games.publishFootballTeams", () => {
  it("places every player on one team in its bib and creates the one Match", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await publish(f, [a!, b!], [c!, d!], {
        method: "level",
        bibs: { slot1: "red", slot2: "navy" },
      });

      const board = await footballBoard(f.db, {
        gameId: f.gameId,
        userId: a!.id,
      });
      expect(board.teams).toEqual({
        method: "level",
        bibs: { slot1: "red", slot2: "navy" },
      });
      expect(board.players.map((player) => player.sideIndex)).toEqual([
        1, 1, 2, 2,
      ]);
      expect(board.viewer.sideIndex).toBe(1);
      expect(board.viewer.canMakeTeams).toBe(false);
      expect(board.viewer.canEnterScore).toBe(false);
      expect(
        await f.db.select().from(matches).where(eq(matches.gameId, f.gameId)),
      ).toHaveLength(1);

      await publish(f, [a!, c!], [b!, d!]);
      const again = await footballBoard(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
      });
      expect(again.players.map((player) => player.sideIndex)).toEqual([
        1, 2, 1, 2,
      ]);
      expect(again.viewer.canMakeTeams).toBe(true);
      expect(
        await f.db.select().from(matches).where(eq(matches.gameId, f.gameId)),
      ).toHaveLength(1);
    });
  });

  it("refuses a non-organizer, an unplaced player, a lopsided split and one colour", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d, e] = await addPlayers(f, 5);
      await expect(
        publishFootballTeams(f.db, {
          gameId: f.gameId,
          userId: a!.id,
          method: "manual",
          bibs: { slot1: "black", slot2: "white" },
          slot1: [a!.id, b!.id],
          slot2: [c!.id, d!.id, e!.id],
        }),
      ).rejects.toThrow("Only an organizer");
      await expect(publish(f, [a!, b!], [c!, d!])).rejects.toThrow(
        "1 still to place.",
      );
      await expect(publish(f, [a!], [b!, c!, d!, e!])).rejects.toThrow(
        "White has 3 extra.",
      );
      await expect(
        publish(f, [a!, b!], [c!, d!, e!], {
          bibs: { slot1: "red", slot2: "red" },
        }),
      ).rejects.toThrow("two different bib colours");
      await expect(publish(f, [a!, a!], [c!, d!, e!])).rejects.toThrow(
        "one team only",
      );
      await publish(f, [a!, b!], [c!, d!, e!]);
    });
  });

  it("keeps the rest of a team when one player leaves or is kicked", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await publish(f, [a!, b!], [c!, d!]);
      await leaveGame(f.db, { gameId: f.gameId, userId: a!.id });
      await kick(f.db, {
        gameId: f.gameId,
        organizerUserId: f.organizer.id,
        userId: c!.id,
      });
      const board = await footballBoard(f.db, {
        gameId: f.gameId,
        userId: b!.id,
      });
      expect(
        board.players.map((player) => [player.userId, player.sideIndex]),
      ).toEqual([
        [b!.id, 1],
        [d!.id, 2],
      ]);
    });
  });
});

describe("football Score and goals", () => {
  it("opens at kick-off to players on the teams and the organizer", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      const bench = await addPlayer(f, "bench");
      await publish(f, [a!, b!, bench], [c!, d!]);
      await leaveGame(f.db, { gameId: f.gameId, userId: bench.id });
      const score = {
        gameId: f.gameId,
        slot1Goals: 2,
        slot2Goals: 1,
        scorers: [],
      };
      await expect(
        saveFootballScore(f.db, { ...score, userId: a!.id }),
      ).rejects.toThrow("opens at kick-off");
      await expect(
        saveFootballScore(
          f.db,
          { ...score, userId: bench.id },
          AFTER_KICKOFF(),
        ),
      ).rejects.toThrow("Only the organizer or players on the teams");
    });
  });

  it("names scorers within each side's goals", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await publish(f, [a!, b!], [c!, d!]);
      await expect(
        saveFootballScore(
          f.db,
          {
            gameId: f.gameId,
            userId: a!.id,
            slot1Goals: 1,
            slot2Goals: 0,
            scorers: [{ userId: a!.id, goals: 2 }],
          },
          AFTER_KICKOFF(),
        ),
      ).rejects.toThrow("Black scorers add up to more than 1.");
      await expect(
        saveFootballScore(
          f.db,
          {
            gameId: f.gameId,
            userId: a!.id,
            slot1Goals: 3,
            slot2Goals: 0,
            scorers: [{ userId: f.organizer.id, goals: 1 }],
          },
          AFTER_KICKOFF(),
        ),
      ).rejects.toThrow("Scorers must be on one of the teams");
    });
  });

  it("is agreed once one player from each side confirms, and keeps the goals", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await publish(f, [a!, b!], [c!, d!]);
      await saveFootballScore(
        f.db,
        {
          gameId: f.gameId,
          userId: c!.id,
          slot1Goals: 4,
          slot2Goals: 3,
          scorers: [
            { userId: a!.id, goals: 3 },
            { userId: b!.id, goals: 1 },
            { userId: d!.id, goals: 2 },
          ],
        },
        AFTER_KICKOFF(),
      );

      const pending = await footballBoard(f.db, {
        gameId: f.gameId,
        userId: a!.id,
      });
      expect(pending.match?.score).toEqual({ slot1: 4, slot2: 3 });
      expect(pending.match?.confirmed).toEqual({ slot1: false, slot2: true });
      expect(pending.match?.enteredByName).toBe("p2");
      expect(pending.viewer.canConfirm).toBe(true);
      expect(pending.viewer.canMakeTeams).toBe(false);
      expect(
        pending.players.map((player) => [player.userId, player.goals]),
      ).toEqual([
        [a!.id, 3],
        [b!.id, 1],
        [c!.id, 0],
        [d!.id, 2],
      ]);
      const teammate = await footballBoard(f.db, {
        gameId: f.gameId,
        userId: d!.id,
      });
      expect(teammate.viewer.canConfirm).toBe(false);
      await expect(publish(f, [a!, c!], [b!, d!])).rejects.toThrow(
        "teams are fixed",
      );

      const match = await f.db.query.matches.findFirst({
        where: eq(matches.gameId, f.gameId),
      });
      await confirmMatchResult(f.db, {
        gameId: f.gameId,
        matchId: match!.id,
        userId: b!.id,
      });
      const done = await footballBoard(f.db, {
        gameId: f.gameId,
        userId: a!.id,
      });
      expect(done.match?.status).toBe("completed");
      expect(done.viewer.canConfirm).toBe(false);
      expect(done.viewer.canEnterScore).toBe(false);
      await expect(
        saveFootballScore(
          f.db,
          {
            gameId: f.gameId,
            userId: a!.id,
            slot1Goals: 5,
            slot2Goals: 3,
            scorers: [],
          },
          AFTER_KICKOFF(),
        ),
      ).rejects.toThrow("can no longer change");
    });
  });

  it("asks the other side again when the Score changes", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await publish(f, [a!, b!], [c!, d!]);
      const save = (userId: string, slot1Goals: number) =>
        saveFootballScore(
          f.db,
          { gameId: f.gameId, userId, slot1Goals, slot2Goals: 1, scorers: [] },
          AFTER_KICKOFF(),
        );
      await save(f.organizer.id, 2);
      const unconfirmed = await footballBoard(f.db, {
        gameId: f.gameId,
        userId: a!.id,
      });
      expect(unconfirmed.match?.confirmed).toEqual({
        slot1: false,
        slot2: false,
      });
      await save(a!.id, 2);
      await save(c!.id, 3);
      const changed = await footballBoard(f.db, {
        gameId: f.gameId,
        userId: a!.id,
      });
      expect(changed.match?.confirmed).toEqual({ slot1: false, slot2: true });
      expect(changed.match?.status).not.toBe("completed");
    });
  });
});

describe("football Score with a side of Unclaimed players (D14)", () => {
  it("waits on the Organizer for that side, whose confirmation completes the Score", async () => {
    await withFootballGame(async (f) => {
      const [a, b] = await addPlayers(f, 2);
      const c = await addUnclaimedPlayer(f, "+97336124501");
      const d = await addUnclaimedPlayer(f, "+97336124502");
      await publish(f, [a!, b!], [c, d]);
      const match = await f.db.query.matches.findFirst({
        where: eq(matches.gameId, f.gameId),
      });
      await saveFootballScore(
        f.db,
        {
          gameId: f.gameId,
          userId: a!.id,
          slot1Goals: 2,
          slot2Goals: 1,
          scorers: [],
        },
        AFTER_KICKOFF(),
      );

      const waiting = await footballBoard(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
      });
      expect(waiting.match?.confirmed).toEqual({ slot1: true, slot2: false });
      expect(waiting.match?.organizerSides).toEqual([
        { slot: 2, confirmed: false },
      ]);
      expect(waiting.match?.status).not.toBe("completed");
      expect(waiting.viewer.canConfirmAsOrganizer).toBe(true);
      const player = await footballBoard(f.db, {
        gameId: f.gameId,
        userId: b!.id,
      });
      expect(player.viewer.canConfirmAsOrganizer).toBe(false);

      await confirmMatchResult(f.db, {
        gameId: f.gameId,
        matchId: match!.id,
        userId: f.organizer.id,
      });
      const done = await footballBoard(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
      });
      expect(done.match?.status).toBe("completed");
      expect(done.viewer.canConfirmAsOrganizer).toBe(false);
    });
  });
});

describe("an Organizer's football Score confirmation (ADR-0044)", () => {
  it("completes the Score without either side confirming", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await publish(f, [a!, b!], [c!, d!]);
      const match = await f.db.query.matches.findFirst({
        where: eq(matches.gameId, f.gameId),
      });
      await saveFootballScore(
        f.db,
        {
          gameId: f.gameId,
          userId: f.organizer.id,
          slot1Goals: 3,
          slot2Goals: 1,
          scorers: [],
        },
        AFTER_KICKOFF(),
      );
      const entered = await footballBoard(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
      });
      expect(entered.match?.status).not.toBe("completed");

      await confirmMatchResult(f.db, {
        gameId: f.gameId,
        matchId: match!.id,
        userId: f.organizer.id,
      });
      const done = await footballBoard(f.db, {
        gameId: f.gameId,
        userId: a!.id,
      });
      expect(done.match?.status).toBe("completed");
      expect(done.match?.confirmed).toEqual({ slot1: false, slot2: false });
    });
  });
});

describe("an agreed football Score in the Group Standing", () => {
  async function agreeScore(f: Fixture, slot1Goals: number, slot2Goals: number) {
    const match = await f.db.query.matches.findFirst({
      where: eq(matches.gameId, f.gameId),
    });
    await saveFootballScore(
      f.db,
      {
        gameId: f.gameId,
        userId: f.organizer.id,
        slot1Goals,
        slot2Goals,
        scorers: [],
      },
      AFTER_KICKOFF(),
    );
    await confirmMatchResult(f.db, {
      gameId: f.gameId,
      matchId: match!.id,
      userId: f.organizer.id,
    });
    return match!.id;
  }

  async function standingByUserId(f: Fixture) {
    const game = await f.db.query.games.findFirst({
      where: eq(games.id, f.gameId),
      columns: { groupId: true },
    });
    const standing = await loadGroupStandingMembers(f.db, [game!.groupId!]);
    return new Map(
      (standing.get(game!.groupId!) ?? []).map((member) => [
        member.userId,
        member,
      ]),
    );
  }

  it("counts a win as a Set and goals as points, and rates nobody", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await publish(f, [a!, b!], [c!, d!]);
      const matchId = await agreeScore(f, 3, 1);

      const standing = await standingByUserId(f);
      for (const winner of [a!, b!]) {
        expect(standing.get(winner.id)).toMatchObject({
          totalSetsWon: 1,
          totalPointsWon: 3,
          totalGamesPlayed: 1,
        });
      }
      for (const loser of [c!, d!]) {
        expect(standing.get(loser.id)).toMatchObject({
          totalSetsWon: 0,
          totalPointsWon: 1,
          totalGamesPlayed: 1,
        });
      }
      expect(
        await f.db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, matchId),
        }),
      ).toHaveLength(0);
    });
  });

  it("counts a draw as played with no Set won", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await publish(f, [a!, b!], [c!, d!]);
      await agreeScore(f, 2, 2);

      const standing = await standingByUserId(f);
      for (const player of [a!, b!, c!, d!]) {
        expect(standing.get(player.id)).toMatchObject({
          totalSetsWon: 0,
          totalPointsWon: 2,
          totalGamesPlayed: 1,
        });
      }
    });
  });
});

describe("football rows in My Games", () => {
  it("carry the teams and stay listed after kick-off until the Score is agreed", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await f.db
        .update(gamePlayers)
        .set({ footballPosition: "mid" })
        .where(eq(gamePlayers.userId, a!.id));
      await publish(f, [a!, b!], [c!, d!], {
        bibs: { slot1: "black", slot2: "sky" },
      });

      const before = await listMyGamesHubRows(f.db, a!.id);
      const row = before.find((item) => item.id === f.gameId);
      expect(row?.football?.sides?.map((side) => side.bib)).toEqual([
        "black",
        "sky",
      ]);
      expect(row?.football?.viewer).toEqual({
        sideIndex: 1,
        role: null,
        position: "mid",
      });
      expect(row?.football?.needsViewerConfirmation).toBe(false);

      await saveFootballScore(
        f.db,
        {
          gameId: f.gameId,
          userId: c!.id,
          slot1Goals: 1,
          slot2Goals: 1,
          scorers: [],
        },
        AFTER_KICKOFF(),
      );
      const later = new Date(f.windowEnd.getTime() + HOUR);
      const after = await listMyGamesHubRows(f.db, a!.id, later);
      const pending = after.find((item) => item.id === f.gameId);
      expect(pending?.football?.score).toEqual({ slot1: 1, slot2: 1 });
      expect(pending?.football?.needsViewerConfirmation).toBe(true);
      expect(pending?.football?.enteredByName).toBe("p2");

      const outsider = await insertUser(f.db, "outsider");
      expect(
        (await listMyGamesHubRows(f.db, outsider.id, later)).some(
          (item) => item.id === f.gameId,
        ),
      ).toBe(false);
    });
  });
});

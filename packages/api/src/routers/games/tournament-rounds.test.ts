import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  courts,
  games,
  groupMembers,
  groups,
  matches,
  matchResultConfirmations,
  matchSets,
  notifications,
  tournamentDraftMatches,
  user,
  venueVerifiers,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { type Db } from "@repo/db";

import { handle as scoreStands } from "#src/jobs/handlers/match.score-stands";
import { recordJobs } from "#src/jobs/job-sink.test-support";
import { scoreStandsJobKey } from "#src/jobs/specs";
import { addSet } from "#src/routers/games/addSet";
import { gameById } from "#src/routers/games/byId";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { createTournament } from "#src/routers/games/createTournament";
import { drawPools } from "#src/routers/games/drawPools";
import { enterTournamentScore } from "#src/routers/games/enterTournamentScore";
import { generateRounds } from "#src/routers/games/generateRounds";
import { markMatchNotFinished } from "#src/routers/games/markMatchNotFinished";
import { listPoolTables } from "#src/routers/games/poolTables";
import { postPoolDraw } from "#src/routers/games/postPoolDraw";
import { postRounds } from "#src/routers/games/postRounds";
import { registerSeat } from "#src/routers/games/registerSeat";
import { removeSet } from "#src/routers/games/removeSet";
import { saveRoundPairings } from "#src/routers/games/saveRoundPairings";
import { scoreSet } from "#src/routers/games/scoreSet";
import { stampMatch } from "#src/routers/games/stampMatch";
import { swapRoundPairing } from "#src/routers/games/swapRoundPairing";
import { tournamentRounds } from "#src/routers/games/tournamentRounds";
import { undoPoolDraw } from "#src/routers/games/undoPoolDraw";

const NOW = new Date("2026-11-08T07:00:00.000Z");
const WINDOW_START = new Date("2026-11-08T07:00:00.000Z");
const WINDOW_END = new Date("2026-11-08T12:00:00.000Z");

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

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

async function seedPostedDraw(database: TestDatabase) {
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
  const created = await createTournament(database, {
    createdBy: owner.id,
    name: "Sunday Social",
    groupId: group.id,
    isPublic: false,
    registrationMode: "individual",
    teamCount: 4,
    poolCount: 1,
    venueId: venue.id,
    courtIds: courtRows.map((court) => court.id),
    matchMinutes: 30,
    windowStart: WINDOW_START,
    windowEnd: WINDOW_END,
  });
  const players = [];
  for (let index = 0; index < 8; index += 1) {
    const player = await insertUser(database, `Player ${index + 1}`);
    await database
      .insert(groupMembers)
      .values({ groupId: group.id, userId: player.id });
    players.push(player);
  }
  for (let team = 0; team < 4; team += 1) {
    for (const [offset, position] of [
      [0, "left"],
      [1, "right"],
    ] as const) {
      const player = players[team * 2 + offset];
      if (!player) {
        throw new Error("Missing player");
      }
      await registerSeat(database, {
        gameId: created.id,
        userId: player.id,
        sideIndex: team + 1,
        position,
      });
    }
  }
  await drawPools(database, {
    gameId: created.id,
    organizerUserId: owner.id,
    shuffle: (items) => [...items],
  });
  await postPoolDraw(database, {
    gameId: created.id,
    organizerUserId: owner.id,
    rounds: "later",
  });
  return { owner, players, gameId: created.id };
}

async function withDb(run: (database: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

async function poolMatches(database: TestDatabase, gameId: string) {
  return database.query.matches.findMany({ where: eq(matches.gameId, gameId) });
}

describe("making Rounds", () => {
  const jobs = recordJobs();

  it("posts the draw without Matches and shows the Rounds as not made", async () => {
    await withDb(async (database) => {
      const seeded = await seedPostedDraw(database);
      expect(await poolMatches(database, seeded.gameId)).toHaveLength(0);
      const view = await tournamentRounds(database, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      expect(view.roundCount).toBe(3);
      expect(view.rounds.map((round) => round.state)).toEqual([
        "not_made",
        "not_made",
        "not_made",
      ]);
    });
  });

  it("drafts every Round for the Organizer only, then posts Round 1 on the Courts", async () => {
    await withDb(async (database) => {
      const seeded = await seedPostedDraw(database);
      const generated = await generateRounds(database, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        scope: "all",
      });
      expect(generated.roundNumbers).toEqual([1, 2, 3]);
      expect(generated.repeats).toEqual([]);

      const organizerView = await tournamentRounds(database, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      expect(organizerView.rounds.map((round) => round.state)).toEqual([
        "draft",
        "draft",
        "draft",
      ]);
      const playerView = await tournamentRounds(database, {
        gameId: seeded.gameId,
        userId: seeded.players[0]!.id,
      });
      expect(playerView.rounds.map((round) => round.state)).toEqual([
        "not_made",
        "not_made",
        "not_made",
      ]);

      await expect(
        postRounds(database, {
          gameId: seeded.gameId,
          organizerUserId: seeded.owner.id,
          roundNumbers: [2],
        }),
      ).rejects.toThrow("Post Round 1 first");

      const posted = await postRounds(database, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        roundNumbers: [1],
      });
      expect(posted.matchCount).toBe(2);
      const rows = await poolMatches(database, seeded.gameId);
      expect(rows.map((row) => row.roundNumber)).toEqual([1, 1]);
      expect(new Set(rows.map((row) => row.courtId)).size).toBe(2);
      const drafts = await database.query.tournamentDraftMatches.findMany({
        where: eq(tournamentDraftMatches.gameId, seeded.gameId),
      });
      expect(new Set(drafts.map((row) => row.roundNumber))).toEqual(
        new Set([2, 3]),
      );
    });
  });

  it("pairs by hand, fills the rest, and swaps a pairing keeping later drafts free of repeats", async () => {
    await withDb(async (database) => {
      const seeded = await seedPostedDraw(database);
      const view = await tournamentRounds(database, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      const [a, b, c, d] = view.pools[0]!.gameTeamIds;
      const filled = await saveRoundPairings(database, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        roundNumber: 1,
        pairings: [{ slot1GameTeamId: a!, slot2GameTeamId: b! }],
        fill: true,
      });
      expect(filled.pairings).toHaveLength(2);
      expect(filled.pairings[0]).toEqual({
        slot1GameTeamId: a,
        slot2GameTeamId: b,
      });

      await expect(
        saveRoundPairings(database, {
          gameId: seeded.gameId,
          organizerUserId: seeded.owner.id,
          roundNumber: 2,
          pairings: [
            { slot1GameTeamId: a!, slot2GameTeamId: c! },
            { slot1GameTeamId: a!, slot2GameTeamId: d! },
          ],
          fill: false,
        }),
      ).rejects.toThrow("A team plays once a Round");

      await generateRounds(database, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        scope: "rest",
      });
      const swapped = await swapRoundPairing(database, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        roundNumber: 1,
        gameTeamId: a!,
        opponentGameTeamId: c!,
      });
      expect(swapped.repeats).toEqual([]);
      const after = await tournamentRounds(database, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      const round1 = after.rounds[0]!.matches;
      expect(
        round1.some(
          (match) =>
            [match.slot1GameTeamId, match.slot2GameTeamId].includes(a!) &&
            [match.slot1GameTeamId, match.slot2GameTeamId].includes(c!),
        ),
      ).toBe(true);
    });
  });

  it("clears the drafts when the draw is undone", async () => {
    await withDb(async (database) => {
      const seeded = await seedPostedDraw(database);
      await generateRounds(database, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        scope: "all",
      });
      await undoPoolDraw(database, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
      });
      const drafts = await database.query.tournamentDraftMatches.findMany({
        where: eq(tournamentDraftMatches.gameId, seeded.gameId),
      });
      expect(drafts).toHaveLength(0);
      expect(
        jobs.added.filter((job) => job.name === "match.score-stands"),
      ).toEqual([]);
    });
  });
});

async function postedRound1(database: TestDatabase) {
  const seeded = await seedPostedDraw(database);
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
  const view = await tournamentRounds(database, {
    gameId: seeded.gameId,
    userId: seeded.players[0]!.id,
  });
  const match = view.rounds[0]!.matches.find((row) => row.viewerSlot != null)!;
  const teamOf = new Map(view.teams.map((team) => [team.gameTeamId, team]));
  const mine =
    match.viewerSlot === 1 ? match.slot1GameTeamId : match.slot2GameTeamId;
  const theirs =
    match.viewerSlot === 1 ? match.slot2GameTeamId : match.slot1GameTeamId;
  return {
    ...seeded,
    match,
    viewerSlot: match.viewerSlot!,
    teammate: teamOf
      .get(mine)!
      .members.find((m) => m.id !== seeded.players[0]!.id)!,
    opponent: teamOf.get(theirs)!.members[0]!,
  };
}

describe("tournament scores", () => {
  const jobs = recordJobs();

  it("waits for one tap from the other team, then completes", async () => {
    await withDb(async (database) => {
      const seeded = await postedRound1(database);
      const enterer = seeded.players[0]!;
      await enterTournamentScore(database, {
        gameId: seeded.gameId,
        matchId: seeded.match.matchId!,
        userId: enterer.id,
        slot1GamesWon: 6,
        slot2GamesWon: 4,
      });
      expect(jobs.added.map((job) => job.key)).toContain(
        scoreStandsJobKey(seeded.match.matchId!),
      );
      const asked = await database.query.notifications.findMany({
        where: eq(notifications.type, "match_score_to_confirm"),
      });
      expect(asked.map((row) => row.recipientUserId)).toContain(
        seeded.opponent.id,
      );

      const pending = await tournamentRounds(database, {
        gameId: seeded.gameId,
        userId: seeded.opponent.id,
      });
      const row = pending.rounds[0]!.matches.find(
        (match) => match.matchId === seeded.match.matchId,
      )!;
      expect(row.state).toBe("awaiting_confirmation");
      expect(row.canConfirm).toBe(true);
      expect(row.enteredByName).toBe(enterer.name);

      await expect(
        confirmMatchResult(database, {
          gameId: seeded.gameId,
          matchId: seeded.match.matchId!,
          userId: seeded.teammate.id,
        }),
      ).resolves.toEqual({ ok: true });
      const stillPending = await database.query.matches.findFirst({
        where: eq(matches.id, seeded.match.matchId!),
      });
      expect(stillPending?.status).toBe("pending");

      await confirmMatchResult(database, {
        gameId: seeded.gameId,
        matchId: seeded.match.matchId!,
        userId: seeded.opponent.id,
      });
      const done = await database.query.matches.findFirst({
        where: eq(matches.id, seeded.match.matchId!),
      });
      expect(done?.status).toBe("completed");
    });
  });

  it("lets the score stand ten minutes after it is entered, and a correction restarts the clock", async () => {
    await withDb(async (database) => {
      const seeded = await postedRound1(database);
      await enterTournamentScore(database, {
        gameId: seeded.gameId,
        matchId: seeded.match.matchId!,
        userId: seeded.players[0]!.id,
        slot1GamesWon: 6,
        slot2GamesWon: 4,
      });
      vi.setSystemTime(new Date(NOW.getTime() + 2 * 60 * 1000));
      await enterTournamentScore(database, {
        gameId: seeded.gameId,
        matchId: seeded.match.matchId!,
        userId: seeded.opponent.id,
        slot1GamesWon: 5,
        slot2GamesWon: 5,
      });
      const db = database as unknown as Db;
      await scoreStands(
        db,
        { matchId: seeded.match.matchId! },
        undefined,
        new Date(NOW.getTime() + 11 * 60 * 1000),
      );
      const early = await database.query.matches.findFirst({
        where: eq(matches.id, seeded.match.matchId!),
      });
      expect(early?.status).toBe("pending");

      await scoreStands(
        db,
        { matchId: seeded.match.matchId! },
        undefined,
        new Date(NOW.getTime() + 13 * 60 * 1000),
      );
      const stood = await database.query.matches.findFirst({
        where: eq(matches.id, seeded.match.matchId!),
      });
      expect(stood?.status).toBe("completed");
      vi.setSystemTime(NOW);

      const tables = await listPoolTables(database, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      const points = tables?.pools[0]?.rows.map((row) => row.points);
      expect(points?.filter((value) => value === 1)).toHaveLength(2);
      expect(tables?.finished).toBe(false);
    });
  });

  it("keeps the ten minutes when the team that entered the score taps again", async () => {
    await withDb(async (database) => {
      const seeded = await postedRound1(database);
      const matchId = seeded.match.matchId!;
      await enterTournamentScore(database, {
        gameId: seeded.gameId,
        matchId,
        userId: seeded.players[0]!.id,
        slot1GamesWon: 6,
        slot2GamesWon: 4,
      });
      vi.setSystemTime(new Date(NOW.getTime() + 5 * 60 * 1000));
      for (const userId of [seeded.players[0]!.id, seeded.teammate.id]) {
        await confirmMatchResult(database, {
          gameId: seeded.gameId,
          matchId,
          userId,
        });
      }
      vi.setSystemTime(NOW);
      const rows = await database.query.matchResultConfirmations.findMany({
        where: eq(matchResultConfirmations.matchId, matchId),
      });
      expect(rows.map((row) => [row.userId, row.confirmedAt])).toEqual([
        [seeded.players[0]!.id, NOW],
      ]);

      await scoreStands(
        database as unknown as Db,
        { matchId },
        undefined,
        new Date(NOW.getTime() + 10 * 60 * 1000 + 1000),
      );
      const stood = await database.query.matches.findFirst({
        where: eq(matches.id, matchId),
      });
      expect(stood?.status).toBe("completed");
    });
  });

  it("keeps a tournament score off the generic Set doors", async () => {
    await withDb(async (database) => {
      const seeded = await postedRound1(database);
      const matchId = seeded.match.matchId!;
      await expect(
        addSet(database, {
          gameId: seeded.gameId,
          matchId,
          userId: seeded.owner.id,
        }),
      ).rejects.toThrow("Enter a tournament score with enterTournamentScore");
      await enterTournamentScore(database, {
        gameId: seeded.gameId,
        matchId,
        userId: seeded.players[0]!.id,
        slot1GamesWon: 6,
        slot2GamesWon: 4,
      });
      const [set] = await database.query.matchSets.findMany({
        where: eq(matchSets.matchId, matchId),
      });
      await expect(
        scoreSet(database, {
          gameId: seeded.gameId,
          matchId,
          setId: set!.id,
          userId: seeded.opponent.id,
          slot1GamesWon: 0,
          slot2GamesWon: 6,
        }),
      ).rejects.toThrow("Enter a tournament score with enterTournamentScore");
      await expect(
        removeSet(database, {
          gameId: seeded.gameId,
          matchId,
          setId: set!.id,
          userId: seeded.opponent.id,
        }),
      ).rejects.toThrow("Enter a tournament score with enterTournamentScore");
    });
  });

  it("takes an Organizer's score as final and lets them change a confirmed one", async () => {
    await withDb(async (database) => {
      const seeded = await postedRound1(database);
      await enterTournamentScore(database, {
        gameId: seeded.gameId,
        matchId: seeded.match.matchId!,
        userId: seeded.owner.id,
        slot1GamesWon: 6,
        slot2GamesWon: 3,
      });
      const first = await database.query.matches.findFirst({
        where: eq(matches.id, seeded.match.matchId!),
      });
      expect(first?.status).toBe("completed");

      await enterTournamentScore(database, {
        gameId: seeded.gameId,
        matchId: seeded.match.matchId!,
        userId: seeded.owner.id,
        slot1GamesWon: 3,
        slot2GamesWon: 6,
      });
      const sets = await database.query.matchSets.findMany();
      expect(sets.map((set) => [set.slot1GamesWon, set.slot2GamesWon])).toEqual(
        [[3, 6]],
      );
    });
  });

  it("takes the score of an Organizer playing in the Match as final", async () => {
    await withDb(async (database) => {
      const seeded = await postedRound1(database);
      const game = await database.query.games.findFirst({
        where: eq(games.id, seeded.gameId),
      });
      await database
        .update(groups)
        .set({ createdBy: seeded.players[0]!.id })
        .where(eq(groups.id, game!.groupId!));

      const result = await enterTournamentScore(database, {
        gameId: seeded.gameId,
        matchId: seeded.match.matchId!,
        userId: seeded.players[0]!.id,
        slot1GamesWon: 6,
        slot2GamesWon: 3,
      });

      expect(result.final).toBe(true);
      const match = await database.query.matches.findFirst({
        where: eq(matches.id, seeded.match.matchId!),
      });
      expect(match?.status).toBe("completed");
      expect(jobs.added.map((job) => job.key)).not.toContain(
        scoreStandsJobKey(seeded.match.matchId!),
      );
    });
  });

  it("lets an Organizer playing in the Match confirm their teammate's score", async () => {
    await withDb(async (database) => {
      const seeded = await postedRound1(database);
      const game = await database.query.games.findFirst({
        where: eq(games.id, seeded.gameId),
      });
      await database
        .update(groups)
        .set({ createdBy: seeded.players[0]!.id })
        .where(eq(groups.id, game!.groupId!));
      await enterTournamentScore(database, {
        gameId: seeded.gameId,
        matchId: seeded.match.matchId!,
        userId: seeded.teammate.id,
        slot1GamesWon: 6,
        slot2GamesWon: 3,
      });

      const view = await tournamentRounds(database, {
        gameId: seeded.gameId,
        userId: seeded.players[0]!.id,
      });
      const row = view.rounds[0]!.matches.find(
        (match) => match.matchId === seeded.match.matchId,
      )!;
      expect(row.state).toBe("awaiting_confirmation");
      expect(row.canConfirm).toBe(true);

      await confirmMatchResult(database, {
        gameId: seeded.gameId,
        matchId: seeded.match.matchId!,
        userId: seeded.players[0]!.id,
      });
      const match = await database.query.matches.findFirst({
        where: eq(matches.id, seeded.match.matchId!),
      });
      expect(match?.status).toBe("completed");
    });
  });

  it("marks a Match not finished, clearing its score until a new one", async () => {
    await withDb(async (database) => {
      const seeded = await postedRound1(database);
      await enterTournamentScore(database, {
        gameId: seeded.gameId,
        matchId: seeded.match.matchId!,
        userId: seeded.players[0]!.id,
        slot1GamesWon: 2,
        slot2GamesWon: 1,
      });
      await markMatchNotFinished(database, {
        gameId: seeded.gameId,
        matchId: seeded.match.matchId!,
        userId: seeded.opponent.id,
      });
      const view = await tournamentRounds(database, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      const row = view.rounds[0]!.matches.find(
        (match) => match.matchId === seeded.match.matchId,
      )!;
      expect(row.state).toBe("not_finished");
      expect(row.slot1GamesWon).toBeNull();
      expect(jobs.removed).toContain(scoreStandsJobKey(seeded.match.matchId!));
      const game = await database.query.games.findFirst({
        where: eq(games.id, seeded.gameId),
      });
      expect(game?.drawPostedAt).not.toBeNull();
    });
  });

  it("refuses a score from someone outside the Match", async () => {
    await withDb(async (database) => {
      const seeded = await postedRound1(database);
      const outsider = (
        await tournamentRounds(database, {
          gameId: seeded.gameId,
          userId: seeded.owner.id,
        })
      ).teams
        .flatMap((team) => team.members)
        .find(
          (member) =>
            ![seeded.players[0]!.id, seeded.teammate.id].includes(member.id) &&
            !(seeded.match.slot1GameTeamId === seeded.match.slot2GameTeamId),
        );
      const otherMatch = (await poolMatches(database, seeded.gameId)).find(
        (row) => row.id !== seeded.match.matchId,
      )!;
      await expect(
        enterTournamentScore(database, {
          gameId: seeded.gameId,
          matchId: otherMatch.id,
          userId: seeded.players[0]!.id,
          slot1GamesWon: 6,
          slot2GamesWon: 4,
        }),
      ).rejects.toThrow(
        "Only the two teams or an organizer can enter this score",
      );
      expect(outsider).toBeDefined();
    });
  });
});

describe("a Verifier on a tournament's Rounds (ADR-0072)", () => {
  recordJobs();

  it("opens the Rounds of a private tournament at their Venue and stamps an entered score", async () => {
    await withDb(async (database) => {
      const seeded = await postedRound1(database);
      const game = await database.query.games.findFirst({
        where: eq(games.id, seeded.gameId),
        columns: { venueId: true },
      });
      const verifier = await insertUser(database, "Sara");
      await database.insert(venueVerifiers).values({
        venueId: game!.venueId,
        userId: verifier.id,
        kind: "referee",
      });
      const outsider = await insertUser(database, "Outsider");
      const matchId = seeded.match.matchId!;
      await enterTournamentScore(database, {
        gameId: seeded.gameId,
        matchId,
        userId: seeded.players[0]!.id,
        slot1GamesWon: 6,
        slot2GamesWon: 4,
      });

      await expect(
        tournamentRounds(database, {
          gameId: seeded.gameId,
          userId: outsider.id,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      const view = await tournamentRounds(database, {
        gameId: seeded.gameId,
        userId: verifier.id,
      });
      expect(view.isOrganizer).toBe(false);
      expect(
        view.rounds
          .flatMap((round) => round.matches)
          .every(
            (match) =>
              match.viewerSlot === null &&
              !match.canEnterScore &&
              !match.canConfirm &&
              !match.canMarkNotFinished &&
              !match.canSwap,
          ),
      ).toBe(true);

      const details = await gameById(database, {
        gameId: seeded.gameId,
        userId: verifier.id,
      });
      expect(
        details.matches.flatMap((match) => (match.canStamp ? [match.id] : [])),
      ).toEqual([matchId]);
      await expect(
        markMatchNotFinished(database, {
          gameId: seeded.gameId,
          matchId,
          userId: verifier.id,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });

      await stampMatch(database, { matchId, userId: verifier.id });
      const done = await database.query.matches.findFirst({
        where: eq(matches.id, matchId),
      });
      expect(done?.status).toBe("completed");
    });
  });
});

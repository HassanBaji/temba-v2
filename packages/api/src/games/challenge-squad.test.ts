import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  matches,
  matchSets,
} from "@repo/db/schema";
import type { TestDatabase } from "@repo/db/testing";

import {
  footballMatchup,
  withDb,
  type Fixture,
} from "#src/challenges/challenges.test-support";
import { requireGame } from "#src/games/access";
import { listMyGamesHubRows } from "#src/games/list-my-games";
import { recordJobs } from "#src/jobs/job-sink.test-support";
import { confirmProposal } from "#src/routers/challenges/confirmProposal";
import { listMine } from "#src/routers/challenges/listMine";
import { proposeOnChallenge } from "#src/routers/challenges/propose";
import { gameById } from "#src/routers/games/byId";
import { footballBoard } from "#src/routers/games/footballBoard";

import { loadChallengeSides } from "./challenge-squad";

const HOUR = 60 * 60 * 1000;
const sentAt = new Date(Date.now() - 4 * 24 * HOUR);
const kickOff = new Date(sentAt.getTime() + 48 * HOUR);

async function footballChallengeGame({ database, db }: Fixture) {
  const match = await footballMatchup(database, sentAt, { sideSize: 6 });
  const { id: proposalId } = await proposeOnChallenge(db, {
    challengeId: match.challenge.id,
    teamId: match.arad.id,
    venueId: match.venue.id,
    startsAt: kickOff,
    userId: match.aradIds[0]!,
    now: sentAt,
  });
  const { gameId } = await confirmProposal(db, {
    proposalId,
    userId: match.hiddIds[0]!,
    now: sentAt,
  });
  return { match, gameId };
}

/** Seats Users on a side the way naming a squad will. */
async function nameOnSide(
  database: TestDatabase,
  gameId: string,
  sideIndex: 1 | 2,
  userIds: readonly string[],
) {
  const side = await database.query.gameTeams.findFirst({
    where: (table, { and }) =>
      and(eq(table.gameId, gameId), eq(table.sideIndex, sideIndex)),
  });
  for (const userId of userIds) {
    const [player] = await database
      .insert(gamePlayers)
      .values({ gameId, userId, footballRole: "outfield" })
      .returning({ id: gamePlayers.id });
    await database
      .insert(gameTeamPlayers)
      .values({ gameTeamId: side!.id, gamePlayerId: player!.id });
  }
}

describe("loadChallengeSides", () => {
  recordJobs();

  it("reads two empty sides bound to the Teams, then partial, named and locked", async () => {
    await withDb(async (fixture) => {
      const { database } = fixture;
      const { match, gameId } = await footballChallengeGame(fixture);
      const sides = async () =>
        (await loadChallengeSides(
          database,
          await requireGame(database, gameId),
        ))!;

      expect(
        (await sides()).map((side) => [
          side.sideIndex,
          side.teamId,
          side.sideSize,
          side.named.length,
          side.squadState,
        ]),
      ).toEqual([
        [1, match.hidd.id, 6, 0, "empty"],
        [2, match.arad.id, 6, 0, "empty"],
      ]);

      await nameOnSide(database, gameId, 1, match.hiddIds.slice(0, 4));
      await nameOnSide(database, gameId, 2, match.aradIds.slice(0, 7));
      const named = await sides();
      expect(named.map((side) => side.squadState)).toEqual([
        "partial",
        "named",
      ]);
      expect(named[0]?.named.map((player) => player.userId)).toEqual(
        match.hiddIds.slice(0, 4),
      );

      const [gameMatch] = await database.query.matches.findMany({
        where: eq(matches.gameId, gameId),
      });
      await database
        .update(matchSets)
        .set({ slot1GamesWon: 1, slot2GamesWon: 0 })
        .where(eq(matchSets.matchId, gameMatch!.id));
      expect((await sides()).map((side) => side.squadState)).toEqual([
        "locked",
        "locked",
      ]);
    });
  });

  it("is null on a Game that came from no Challenge", async () => {
    await withDb(async ({ database }) => {
      expect(
        await loadChallengeSides(database, {
          id: crypto.randomUUID(),
          sport: "football",
          sideSize: 6,
          challengeId: null,
        }),
      ).toBeNull();
    });
  });
});

describe("football readers on a Challenge Game with nobody named", () => {
  recordJobs();

  it("render two empty sides on the board, details, My Games and Mine", async () => {
    await withDb(async (fixture) => {
      const { database, db } = fixture;
      const { match, gameId } = await footballChallengeGame(fixture);
      const hiddCaptain = match.hiddIds[0]!;

      const board = await footballBoard(db, { gameId, userId: hiddCaptain });
      expect(board.players).toEqual([]);
      expect(board.teams).toEqual({
        method: null,
        bibs: { slot1: "black", slot2: "white" },
      });
      expect(board.match?.score).toBeNull();
      expect(board.viewer).toMatchObject({
        sideIndex: null,
        canMakeTeams: false,
        canEnterScore: false,
      });

      const details = await gameById(db, {
        gameId,
        userId: match.aradIds[3]!,
      });
      expect(details.registeredUserCount).toBe(0);
      expect(details.canRegister).toBe(false);
      expect(details.registrationStatus).toBe("closed");

      const hub = await listMyGamesHubRows(db, hiddCaptain, sentAt);
      const row = hub.find((candidate) => candidate.id === gameId);
      expect(row?.challenge).toBe(true);
      expect(row?.canRegister).toBe(false);
      expect(row?.football?.sides?.map((side) => side.members)).toEqual([
        [],
        [],
      ]);

      const mine = await listMine(db, {
        userId: match.hiddIds[2]!,
        now: sentAt,
      });
      const accepted = mine.items.find((item) => item.kind === "accepted");
      expect(accepted).toMatchObject({
        gameId,
        team: { id: match.hidd.id },
        opponent: { id: match.arad.id },
        squadState: "empty",
        nameYourSquad: false,
      });
      const captainMine = await listMine(db, {
        userId: hiddCaptain,
        now: sentAt,
      });
      expect(
        captainMine.items.find((item) => item.kind === "accepted"),
      ).toMatchObject({ nameYourSquad: true });

      const sides = await database.query.gameTeams.findMany({
        where: eq(gameTeams.gameId, gameId),
      });
      expect(sides).toHaveLength(2);
    });
  });
});

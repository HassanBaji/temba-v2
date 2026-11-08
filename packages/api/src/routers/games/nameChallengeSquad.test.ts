import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  matches,
  notifications,
  teamMembers,
} from "@repo/db/schema";

import {
  footballMatchup,
  padelMatchup,
  refusal,
  withDb,
  type Fixture,
} from "#src/challenges/challenges.test-support";
import { recordJobs } from "#src/jobs/job-sink.test-support";
import { confirmProposal } from "#src/routers/challenges/confirmProposal";
import { proposeOnChallenge } from "#src/routers/challenges/propose";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { reportWrongScore } from "#src/routers/games/reportWrongScore";
import { saveFootballScore } from "#src/routers/games/saveFootballScore";
import { castMvpVote } from "#src/routers/marks/castMvpVote";
import { give } from "#src/routers/marks/give";
import { setMvpMode } from "#src/routers/marks/setMvpMode";
import { loadCompletedMatchesForUser } from "#src/stats/completed-matches";

import { nameChallengeSquad } from "./nameChallengeSquad";

const HOUR = 60 * 60 * 1000;
const sentAt = new Date(Date.now() - 4 * 24 * HOUR);
const kickOff = new Date(sentAt.getTime() + 48 * HOUR);

/** Hidd United (side 1) v Arad Athletic (side 2), 6-a-side, kicked off two days ago. */
async function footballGame(fixture: Fixture, roster = 12) {
  const match = await footballMatchup(fixture.database, sentAt, {
    sideSize: 6,
    roster,
  });
  const { id: proposalId } = await proposeOnChallenge(fixture.db, {
    challengeId: match.challenge.id,
    teamId: match.arad.id,
    venueId: match.venue.id,
    startsAt: kickOff,
    userId: match.aradIds[0]!,
    now: sentAt,
  });
  const { gameId } = await confirmProposal(fixture.db, {
    proposalId,
    userId: match.hiddIds[0]!,
    now: sentAt,
  });
  return { ...match, gameId };
}

async function sideSeats(fixture: Fixture, gameId: string, sideIndex: number) {
  const side = await fixture.database.query.gameTeams.findFirst({
    where: and(
      eq(gameTeams.gameId, gameId),
      eq(gameTeams.sideIndex, sideIndex),
    ),
  });
  const links = await fixture.database.query.gameTeamPlayers.findMany({
    where: eq(gameTeamPlayers.gameTeamId, side!.id),
    with: { gamePlayer: { columns: { userId: true } } },
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });
  return links.map((link) => link.gamePlayer.userId);
}

async function playerCount(fixture: Fixture, gameId: string) {
  return (
    await fixture.database.query.gamePlayers.findMany({
      where: eq(gamePlayers.gameId, gameId),
    })
  ).length;
}

async function namedNotifications(fixture: Fixture, gameId: string) {
  return fixture.database.query.notifications.findMany({
    where: and(
      eq(notifications.type, "challenge_squad_named"),
      eq(notifications.gameId, gameId),
    ),
  });
}

describe("games.nameChallengeSquad", () => {
  recordJobs();

  it("names 6, then 9, then 4: named, named, partial, with the seats to match", async () => {
    await withDb(async (fixture) => {
      const game = await footballGame(fixture);
      const captain = game.hiddIds[0]!;
      const name = (userIds: string[]) =>
        nameChallengeSquad(fixture.db, {
          gameId: game.gameId,
          teamId: game.hidd.id,
          userIds,
          userId: captain,
        });

      expect(await name(game.hiddIds.slice(0, 6))).toMatchObject({
        squadState: "named",
        namedCount: 6,
      });
      expect(await playerCount(fixture, game.gameId)).toBe(6);

      expect(await name(game.hiddIds.slice(0, 9))).toMatchObject({
        squadState: "named",
        namedCount: 9,
      });
      expect(await playerCount(fixture, game.gameId)).toBe(9);
      expect(await sideSeats(fixture, game.gameId, 1)).toEqual(
        game.hiddIds.slice(0, 9),
      );

      expect(await name(game.hiddIds.slice(0, 4))).toMatchObject({
        squadState: "partial",
        namedCount: 4,
      });
      expect(await playerCount(fixture, game.gameId)).toBe(4);
      expect(await sideSeats(fixture, game.gameId, 2)).toEqual([]);

      const seat = await fixture.database.query.gamePlayers.findFirst({
        where: eq(gamePlayers.userId, game.hiddIds[1]!),
      });
      expect(seat?.gameId).toBe(game.gameId);
    });
  });

  it("refuses a 10th name, a non-Roster User, a User named on the other side and the opposing Captain", async () => {
    await withDb(async (fixture) => {
      const game = await footballGame(fixture);
      const captain = game.hiddIds[0]!;

      expect(
        await refusal(
          nameChallengeSquad(fixture.db, {
            gameId: game.gameId,
            teamId: game.hidd.id,
            userIds: game.hiddIds.slice(0, 10),
            userId: captain,
          }),
        ),
      ).toEqual({
        code: "BAD_REQUEST",
        message: "Name up to 9: the side plus three reserves",
      });

      expect(
        await refusal(
          nameChallengeSquad(fixture.db, {
            gameId: game.gameId,
            teamId: game.hidd.id,
            userIds: [captain, game.aradIds[1]!],
            userId: captain,
          }),
        ),
      ).toEqual({
        code: "BAD_REQUEST",
        message: "Everyone named must be on the Team's Roster",
      });

      const shared = game.aradIds[5]!;
      await fixture.database
        .insert(teamMembers)
        .values({ teamId: game.hidd.id, userId: shared });
      await nameChallengeSquad(fixture.db, {
        gameId: game.gameId,
        teamId: game.arad.id,
        userIds: [game.aradIds[0]!, shared],
        userId: game.aradIds[0]!,
      });
      expect(
        await refusal(
          nameChallengeSquad(fixture.db, {
            gameId: game.gameId,
            teamId: game.hidd.id,
            userIds: [captain, shared],
            userId: captain,
          }),
        ),
      ).toEqual({
        code: "BAD_REQUEST",
        message: "Arad 6 is already named for the other side",
      });

      expect(
        await refusal(
          nameChallengeSquad(fixture.db, {
            gameId: game.gameId,
            teamId: game.hidd.id,
            userIds: game.hiddIds.slice(0, 6),
            userId: game.aradIds[0]!,
          }),
        ),
      ).toMatchObject({ code: "FORBIDDEN" });

      expect(
        await refusal(
          nameChallengeSquad(fixture.db, {
            gameId: game.gameId,
            teamId: game.hidd.id,
            userIds: game.hiddIds.slice(1, 3),
            userId: game.hiddIds[1]!,
          }),
        ),
      ).toMatchObject({ code: "FORBIDDEN" });
      expect(await sideSeats(fixture, game.gameId, 1)).toEqual([]);
    });
  });

  it("tells only the newly named, never the namer, and nobody on a re-save", async () => {
    await withDb(async (fixture) => {
      const game = await footballGame(fixture);
      const captain = game.hiddIds[0]!;
      const name = (userIds: string[]) =>
        nameChallengeSquad(fixture.db, {
          gameId: game.gameId,
          teamId: game.hidd.id,
          userIds,
          userId: captain,
        });

      await name(game.hiddIds.slice(0, 6));
      const first = await namedNotifications(fixture, game.gameId);
      expect(first.map((row) => row.recipientUserId).sort()).toEqual(
        game.hiddIds.slice(1, 6).sort(),
      );
      expect(first.every((row) => row.teamId === game.arad.id)).toBe(true);
      expect(first.every((row) => row.actorUserId === captain)).toBe(true);

      await name(game.hiddIds.slice(0, 6));
      expect(await namedNotifications(fixture, game.gameId)).toHaveLength(5);

      await name([...game.hiddIds.slice(0, 5), ...game.hiddIds.slice(6, 8)]);
      const after = await namedNotifications(fixture, game.gameId);
      expect(after).toHaveLength(7);
      expect(
        after
          .filter((row) => !first.some((old) => old.id === row.id))
          .map((row) => row.recipientUserId)
          .sort(),
      ).toEqual(game.hiddIds.slice(6, 8).sort());
    });
  });

  it("locks with the Score, reopens after a wrong-score report, and seats a Reserve like the side", async () => {
    await withDb(async (fixture) => {
      const game = await footballGame(fixture);
      const hiddCaptain = game.hiddIds[0]!;
      const aradCaptain = game.aradIds[0]!;
      const reserve = game.hiddIds[7]!;
      await setMvpMode(fixture.db, {
        gameId: game.gameId,
        userId: hiddCaptain,
        mode: "vote",
      });
      await nameChallengeSquad(fixture.db, {
        gameId: game.gameId,
        teamId: game.hidd.id,
        userIds: game.hiddIds.slice(0, 8),
        userId: hiddCaptain,
      });
      await nameChallengeSquad(fixture.db, {
        gameId: game.gameId,
        teamId: game.arad.id,
        userIds: game.aradIds.slice(0, 6),
        userId: aradCaptain,
      });

      await saveFootballScore(fixture.db, {
        gameId: game.gameId,
        userId: hiddCaptain,
        slot1Goals: 3,
        slot2Goals: 1,
        scorers: [{ userId: reserve, goals: 1 }],
      });
      const locked = () =>
        refusal(
          nameChallengeSquad(fixture.db, {
            gameId: game.gameId,
            teamId: game.hidd.id,
            userIds: game.hiddIds.slice(0, 6),
            userId: hiddCaptain,
          }),
        );
      expect(await locked()).toEqual({
        code: "BAD_REQUEST",
        message: "The squads are locked once the score is entered",
      });

      const [match] = await fixture.database.query.matches.findMany({
        where: eq(matches.gameId, game.gameId),
      });
      await confirmMatchResult(fixture.db, {
        gameId: game.gameId,
        matchId: match!.id,
        userId: aradCaptain,
      });
      expect(await locked()).toMatchObject({ code: "BAD_REQUEST" });

      const played = await loadCompletedMatchesForUser(fixture.db, reserve);
      expect(played.map((row) => row.matchId)).toContain(match!.id);
      await castMvpVote(fixture.db, {
        gameId: game.gameId,
        userId: reserve,
        candidateUserId: hiddCaptain,
      });
      await give(fixture.db, {
        gameId: game.gameId,
        userId: aradCaptain,
        receiverUserId: reserve,
        kind: "good_game",
      });

      await reportWrongScore(fixture.db, {
        gameId: game.gameId,
        matchId: match!.id,
        userId: hiddCaptain,
      });
      const reopened = await fixture.database.query.matches.findFirst({
        where: eq(matches.id, match!.id),
        with: { sets: true },
      });
      expect(reopened?.status).toBe("pending");
      expect(
        reopened?.sets.map((set) => [set.slot1GamesWon, set.slot2GamesWon]),
      ).toEqual([[null, null]]);

      expect(
        await nameChallengeSquad(fixture.db, {
          gameId: game.gameId,
          teamId: game.hidd.id,
          userIds: game.hiddIds.slice(0, 6),
          userId: hiddCaptain,
        }),
      ).toMatchObject({ squadState: "named", namedCount: 6 });
    });
  });

  it("is refused on a padel Challenge Game", async () => {
    await withDb(async (fixture) => {
      const match = await padelMatchup(fixture.database, sentAt);
      const { id: proposalId } = await proposeOnChallenge(fixture.db, {
        challengeId: match.challenge.id,
        teamId: match.riffa.id,
        venueId: match.venue.id,
        startsAt: kickOff,
        userId: match.proposer.rafi,
        now: sentAt,
      });
      const { gameId } = await confirmProposal(fixture.db, {
        proposalId,
        userId: match.poster.ali,
        now: sentAt,
      });
      expect(
        await refusal(
          nameChallengeSquad(fixture.db, {
            gameId,
            teamId: match.seef.id,
            userIds: [match.poster.ali],
            userId: match.poster.ali,
          }),
        ),
      ).toEqual({
        code: "BAD_REQUEST",
        message: "Both players are the squad on padel",
      });
    });
  });
});

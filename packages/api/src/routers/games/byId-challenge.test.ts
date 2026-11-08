import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import {
  courts,
  groupMembers,
  groups,
  matches,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import {
  addOpenChallenge,
  footballMatchup,
  withDb,
  type Fixture,
} from "#src/challenges/challenges.test-support";
import { recordJobs } from "#src/jobs/job-sink.test-support";
import { confirmProposal } from "#src/routers/challenges/confirmProposal";
import { proposeOnChallenge } from "#src/routers/challenges/propose";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { createGame } from "#src/routers/games/create";
import { nameChallengeSquad } from "#src/routers/games/nameChallengeSquad";
import { register } from "#src/routers/games/register";
import { registerSeat } from "#src/routers/games/registerSeat";
import { saveFootballScore } from "#src/routers/games/saveFootballScore";
import { teamById } from "#src/routers/teams/byId";
import { createFriendlyGame } from "#src/games/create-friendly";
import { type db } from "#src/db";

import { gameById } from "./byId";

const HOUR = 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ids and timestamps change every run; their places in the output do not. */
function normalized(value: unknown, ids = new Map<string, string>()): unknown {
  if (value instanceof Date) {
    return "<date>";
  }
  if (typeof value === "string" && UUID.test(value)) {
    if (!ids.has(value)) {
      ids.set(value, `<id ${ids.size + 1}>`);
    }
    return ids.get(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalized(item, ids));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalized(item, ids)]),
    );
  }
  return value;
}

/** Everything `games.byId` returned before the Challenge variant. */
function ordinaryFields(details: Awaited<ReturnType<typeof gameById>>) {
  const {
    isChallengeGame: _isChallengeGame,
    challenge: _challenge,
    canJoin: _canJoin,
    canInvite: _canInvite,
    canAddPlayer: _canAddPlayer,
    canMakeTeams: _canMakeTeams,
    ...rest
  } = details as typeof details & Record<string, unknown>;
  return normalized(rest);
}

async function ordinaryGames(database: TestDatabase) {
  const people = await database
    .insert(user)
    .values(
      ["Owner", "Bea", "Cal", "Dee", "Eve"].map((name) => ({
        name,
        email: `${name.toLowerCase()}@example.com`,
        clerkId: `clerk_${name.toLowerCase()}`,
      })),
    )
    .returning({ id: user.id });
  const [owner, bea, cal, dee, eve] = people.map((row) => row.id);
  const [venue] = await database
    .insert(venues)
    .values({ name: "Seef Courts", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  const [pitch] = await database
    .insert(courts)
    .values({ venueId: venue!.id, name: "Pitch 1", sport: "football" })
    .returning({ id: courts.id });
  const [padelGroup, footballGroup] = await database
    .insert(groups)
    .values([
      { name: "Padel Friends", createdBy: owner!, sport: "padel" },
      { name: "Five a side", createdBy: owner!, sport: "football" },
    ])
    .returning({ id: groups.id });
  await database.insert(groupMembers).values(
    [padelGroup!, footballGroup!].flatMap((group) =>
      [owner!, bea!, cal!, dee!, eve!].map((userId) => ({
        groupId: group.id,
        userId,
      })),
    ),
  );
  const windowStart = new Date(Date.now() + 24 * HOUR);
  const windowEnd = new Date(windowStart.getTime() + HOUR);
  const padel = await createFriendlyGame(database, {
    createdBy: owner!,
    groupId: padelGroup!.id,
    venueId: venue!.id,
    windowStart,
    windowEnd,
  });
  const fixtureDb = database as unknown as typeof db;
  for (const [userId, sideIndex, position] of [
    [owner!, 1, "left"],
    [bea!, 1, "right"],
    [cal!, 2, "left"],
  ] as const) {
    await registerSeat(fixtureDb, {
      gameId: padel.game.id,
      userId,
      sideIndex,
      position,
    });
  }
  const football = await createGame(fixtureDb, {
    createdBy: owner!,
    groupId: footballGroup!.id,
    isPublic: false,
    format: "friendly_game",
    registrationMode: "individual",
    venueId: venue!.id,
    courtId: pitch!.id,
    windowStart,
    windowEnd,
  });
  for (const userId of [bea!, cal!]) {
    await register(fixtureDb, {
      gameId: football.id,
      userId,
      football: { role: "outfield", position: "mid" },
    });
  }
  return {
    fixtureDb,
    padelId: padel.game.id,
    footballId: football.id,
    owner: owner!,
    bea: bea!,
    eve: eve!,
  };
}

describe("games.byId on an ordinary Game", () => {
  it("is unchanged: no Challenge, and the same output as before", async () => {
    const { db: database, close } = await createPgliteDb();
    try {
      const games = await ordinaryGames(database);
      const views: Awaited<ReturnType<typeof gameById>>[] = [];
      for (const [gameId, userId] of [
        [games.padelId, games.owner],
        [games.padelId, games.eve],
        [games.footballId, games.owner],
        [games.footballId, games.bea],
      ] as const) {
        views.push(await gameById(games.fixtureDb, { gameId, userId }));
      }
      for (const details of views) {
        expect(ordinaryFields(details)).toMatchSnapshot();
      }
      for (const details of views) {
        expect(details.challenge).toBeNull();
        expect(details.isChallengeGame).toBe(false);
      }
      const organizerView = await gameById(games.fixtureDb, {
        gameId: games.footballId,
        userId: games.owner,
      });
      expect(organizerView).toMatchObject({
        canInvite: true,
        canAddPlayer: true,
        canMakeTeams: true,
      });
      const joinable = await gameById(games.fixtureDb, {
        gameId: games.padelId,
        userId: games.eve,
      });
      expect(joinable).toMatchObject({ canJoin: true, canInvite: false });
    } finally {
      await close();
    }
  });
});

const sentAt = new Date(Date.now() - 20 * 24 * HOUR);

/** Arad proposes on the Challenge and Hidd confirms, kick-off two days after `postedAt`. */
async function challengeGame(
  fixture: Fixture,
  match: Awaited<ReturnType<typeof footballMatchup>>,
  postedAt: Date,
) {
  const { id: proposalId } = await proposeOnChallenge(fixture.db, {
    challengeId: match.challenge.id,
    teamId: match.arad.id,
    venueId: match.venue.id,
    courtId: match.court.id,
    startsAt: new Date(postedAt.getTime() + 48 * HOUR),
    pricePerPlayerFils: 1500,
    userId: match.aradIds[0]!,
    now: postedAt,
  });
  const { gameId } = await confirmProposal(fixture.db, {
    proposalId,
    userId: match.hiddIds[0]!,
    now: postedAt,
  });
  return gameId;
}

async function playOut(
  fixture: Fixture,
  match: Awaited<ReturnType<typeof footballMatchup>>,
  gameId: string,
  goals: [number, number],
) {
  for (const [team, ids] of [
    [match.hidd, match.hiddIds],
    [match.arad, match.aradIds],
  ] as const) {
    await nameChallengeSquad(fixture.db, {
      gameId,
      teamId: team.id,
      userIds: ids.slice(0, 6),
      userId: ids[0]!,
    });
  }
  await saveFootballScore(fixture.db, {
    gameId,
    userId: match.hiddIds[0]!,
    slot1Goals: goals[0],
    slot2Goals: goals[1],
    scorers: [],
  });
  const gameMatch = await fixture.database.query.matches.findFirst({
    where: eq(matches.gameId, gameId),
  });
  await confirmMatchResult(fixture.db, {
    gameId,
    matchId: gameMatch!.id,
    userId: match.aradIds[0]!,
  });
}

describe("games.byId on a Challenge Game", () => {
  recordJobs();

  it("reads the Challenge variant, with every join, invite, add and make-teams flag off", async () => {
    await withDb(async (fixture) => {
      const match = await footballMatchup(fixture.database, sentAt, {
        sideSize: 6,
        roster: 9,
      });
      const gameId = await challengeGame(fixture, match, sentAt);
      await nameChallengeSquad(fixture.db, {
        gameId,
        teamId: match.hidd.id,
        userIds: match.hiddIds.slice(0, 7),
        userId: match.hiddIds[0]!,
      });

      const captainView = await gameById(fixture.db, {
        gameId,
        userId: match.hiddIds[0]!,
      });
      expect(captainView).toMatchObject({
        isChallengeGame: true,
        canJoin: false,
        canInvite: false,
        canAddPlayer: false,
        canMakeTeams: false,
        canRegister: false,
        canWaitlist: false,
        canPickSeat: false,
      });
      const challenge = captainView.challenge!;
      expect(challenge).toMatchObject({
        id: match.challenge.id,
        postedByTeamId: match.hidd.id,
        postedByTeamName: "Hidd United",
        proposedBy: {
          userId: match.aradIds[0],
          name: "Arad 1",
          teamId: match.arad.id,
        },
        confirmedBy: { userId: match.hiddIds[0], name: "Hidd 1" },
        pitch: { venueName: "Pitch Park", courtName: "Court 1" },
        costLine: "1.500 BD each, pay at the venue",
        viewerCanNameSide: match.hidd.id,
      });
      expect(
        challenge.sides.map((side) => [
          side.teamId,
          side.name,
          side.initials,
          side.sideSize,
          side.reserveSeats,
          side.named.length,
          side.state,
          side.headToHead,
          side.viewerActs,
        ]),
      ).toEqual([
        [match.hidd.id, "Hidd United", "HU", 6, 3, 7, "named", null, true],
        [match.arad.id, "Arad Athletic", "AA", 6, 3, 0, "empty", null, false],
      ]);
      expect(challenge.sides[0]?.named[0]).toEqual({
        userId: match.hiddIds[0],
        name: "Hidd 1",
        image: null,
        role: null,
        position: null,
        levelBand: null,
        unclaimed: false,
      });

      const playerView = await gameById(fixture.db, {
        gameId,
        userId: match.hiddIds[3]!,
      });
      expect(playerView.challenge?.viewerCanNameSide).toBeNull();
      const opponentView = await gameById(fixture.db, {
        gameId,
        userId: match.aradIds[0]!,
      });
      expect(opponentView.challenge?.viewerCanNameSide).toBe(match.arad.id);
    });
  });

  it("reads head-to-head as teams.byId's Rivals for the pair, and a first meeting as none", async () => {
    await withDb(async (fixture) => {
      const match = await footballMatchup(fixture.database, sentAt, {
        sideSize: 6,
        roster: 7,
      });
      const first = await challengeGame(fixture, match, sentAt);
      const firstView = await gameById(fixture.db, {
        gameId: first,
        userId: match.hiddIds[0]!,
      });
      expect(firstView.challenge?.sides.map((side) => side.headToHead)).toEqual(
        [null, null],
      );

      await playOut(fixture, match, first, [2, 1]);
      const rematchAt = new Date(sentAt.getTime() + 5 * 24 * HOUR);
      const again = await addOpenChallenge(fixture.database, {
        teamId: match.hidd.id,
        postedBy: match.hiddIds[0]!,
        sport: "football",
        sideSize: 6,
        postedAt: rematchAt,
        venueIds: [match.venue.id],
      });
      const second = await challengeGame(
        fixture,
        { ...match, challenge: again },
        rematchAt,
      );
      await playOut(fixture, match, second, [1, 1]);
      const thirdAt = new Date(sentAt.getTime() + 10 * 24 * HOUR);
      const third = await challengeGame(
        fixture,
        {
          ...match,
          challenge: await addOpenChallenge(fixture.database, {
            teamId: match.hidd.id,
            postedBy: match.hiddIds[0]!,
            sport: "football",
            sideSize: 6,
            postedAt: thirdAt,
            venueIds: [match.venue.id],
          }),
        },
        thirdAt,
      );

      const view = await gameById(fixture.db, {
        gameId: third,
        userId: match.hiddIds[0]!,
      });
      const hiddRivals = (
        await teamById(fixture.db, {
          teamId: match.hidd.id,
          userId: match.hiddIds[0]!,
        })
      ).rivals.find((rival) => rival.teamId === match.arad.id);
      const aradRivals = (
        await teamById(fixture.db, {
          teamId: match.arad.id,
          userId: match.aradIds[0]!,
        })
      ).rivals.find((rival) => rival.teamId === match.hidd.id);
      const pick = (rival: typeof hiddRivals) => ({
        wins: rival!.wins,
        draws: rival!.draws,
        losses: rival!.losses,
      });
      expect(view.challenge?.sides[0]?.headToHead).toEqual(pick(hiddRivals));
      expect(view.challenge?.sides[1]?.headToHead).toEqual(pick(aradRivals));
      expect(view.challenge?.sides[0]?.headToHead).toEqual({
        wins: 1,
        draws: 1,
        losses: 0,
      });
      expect(view.challenge?.sides[0]?.record).toEqual({
        wins: 1,
        draws: 1,
        losses: 0,
      });
    });
  });
});

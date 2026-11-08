import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  MatchStatusEnum,
  gameTeams,
  games,
  matchSets,
  matches,
  ratings,
  teamMemberInvites,
  teamMembers,
  teams,
  user,
  venues,
} from "@repo/db/schema";

import { teamById } from "#src/routers/teams/byId";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const START = new Date("2026-09-01T18:00:00.000Z");
const END = new Date("2026-09-01T20:00:00.000Z");

async function setup(database: TestDatabase) {
  const [owner] = await database
    .insert(user)
    .values({ name: "Owner", email: "owner@example.com" })
    .returning({ id: user.id });
  const [venue] = await database
    .insert(venues)
    .values({ name: "Venue", city: "Lisbon", country: "PT" })
    .returning({ id: venues.id });
  const [ours] = await database
    .insert(teams)
    .values({ createdBy: owner!.id })
    .returning({ id: teams.id });
  const [theirs] = await database
    .insert(teams)
    .values({ createdBy: owner!.id })
    .returning({ id: teams.id });
  await database.insert(teamMembers).values([
    { teamId: ours!.id, userId: owner!.id },
    { teamId: theirs!.id, userId: owner!.id },
  ]);
  return {
    ownerId: owner!.id,
    venueId: venue!.id,
    teamId: ours!.id,
    rivalId: theirs!.id,
  };
}

async function playMatch(
  database: TestDatabase,
  base: Awaited<ReturnType<typeof setup>>,
  args: {
    status: MatchStatusEnum;
    sets: { slot1GamesWon: number; slot2GamesWon: number }[];
    ourSlot?: 1 | 2;
    cancelledGame?: boolean;
  },
) {
  const [game] = await database
    .insert(games)
    .values({
      name: "Team game",
      format: GameFormatEnum.FRIENDLY_GAME,
      registrationMode: GameRegistrationModeEnum.TEAM_ONLY,
      venueId: base.venueId,
      createdBy: base.ownerId,
      isPublic: false,
      playersAllowed: 4,
      teamsAllowed: 2,
      windowStart: START,
      windowEnd: END,
      cancelledAt: args.cancelledGame ? new Date() : null,
    })
    .returning({ id: games.id });
  const ourSlot = args.ourSlot ?? 1;
  const [ours] = await database
    .insert(gameTeams)
    .values({ gameId: game!.id, teamId: base.teamId, sideIndex: 1 })
    .returning({ id: gameTeams.id });
  const [theirs] = await database
    .insert(gameTeams)
    .values({ gameId: game!.id, teamId: base.rivalId, sideIndex: 2 })
    .returning({ id: gameTeams.id });
  const [match] = await database
    .insert(matches)
    .values({
      gameId: game!.id,
      startTime: START,
      status: args.status,
      slot1GameTeamId: ourSlot === 1 ? ours!.id : theirs!.id,
      slot2GameTeamId: ourSlot === 1 ? theirs!.id : ours!.id,
    })
    .returning({ id: matches.id });
  let setNumber = 1;
  for (const set of args.sets) {
    await database.insert(matchSets).values({
      matchId: match!.id,
      setNumber: setNumber++,
      slot1GamesWon: set.slot1GamesWon,
      slot2GamesWon: set.slot2GamesWon,
    });
  }
  return match!.id;
}

async function loadTeamRecord(
  database: TestDatabase,
  base: Awaited<ReturnType<typeof setup>>,
  teamId: string,
) {
  const { gamesPlayed, wins, losses } = await teamById(
    database as unknown as Parameters<typeof teamById>[0],
    {
      teamId,
      userId: base.ownerId,
    },
  );
  return { gamesPlayed, wins, losses };
}

describe("teamById record", () => {
  it("shows zero played for a new Team", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const base = await setup(db);
      expect(await loadTeamRecord(db, base, base.teamId)).toEqual({
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
      });
    } finally {
      await close();
    }
  });

  it("counts a win and a loss from completed Matches on either slot", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const base = await setup(db);
      await playMatch(db, base, {
        status: MatchStatusEnum.COMPLETED,
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 2 }],
      });
      await playMatch(db, base, {
        status: MatchStatusEnum.COMPLETED,
        ourSlot: 2,
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 3 }],
      });
      expect(await loadTeamRecord(db, base, base.teamId)).toEqual({
        gamesPlayed: 2,
        wins: 1,
        losses: 1,
      });
      expect(await loadTeamRecord(db, base, base.rivalId)).toEqual({
        gamesPlayed: 2,
        wins: 1,
        losses: 1,
      });
    } finally {
      await close();
    }
  });

  it("counts a draw as played only", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const base = await setup(db);
      await playMatch(db, base, {
        status: MatchStatusEnum.COMPLETED,
        sets: [
          { slot1GamesWon: 6, slot2GamesWon: 3 },
          { slot1GamesWon: 3, slot2GamesWon: 6 },
        ],
      });
      expect(await loadTeamRecord(db, base, base.teamId)).toEqual({
        gamesPlayed: 1,
        wins: 0,
        losses: 0,
      });
      const team = await teamById(
        db as unknown as Parameters<typeof teamById>[0],
        { teamId: base.teamId, userId: base.ownerId },
      );
      expect(team.record).toEqual({
        gamesPlayed: 1,
        wins: 0,
        draws: 1,
        losses: 0,
      });
    } finally {
      await close();
    }
  });

  it("ignores Matches awaiting confirmation, cancelled Matches, Walkovers and cancelled Games", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const base = await setup(db);
      const sets = [{ slot1GamesWon: 6, slot2GamesWon: 2 }];
      await playMatch(db, base, { status: MatchStatusEnum.PENDING, sets });
      await playMatch(db, base, { status: MatchStatusEnum.CANCELLED, sets });
      const walkover = await playMatch(db, base, {
        status: MatchStatusEnum.CANCELLED,
        sets: [],
      });
      await db
        .update(matches)
        .set({
          walkoverGameTeamId: (
            await db.query.matches.findFirst({
              where: eq(matches.id, walkover),
              columns: { slot2GameTeamId: true },
            })
          )?.slot2GameTeamId,
        })
        .where(eq(matches.id, walkover));
      await playMatch(db, base, {
        status: MatchStatusEnum.COMPLETED,
        sets,
        cancelledGame: true,
      });
      expect(await loadTeamRecord(db, base, base.teamId)).toEqual({
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
      });
    } finally {
      await close();
    }
  });
});

type Db = Parameters<typeof teamById>[0];

async function makeUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({
      name,
      email: `${name.toLowerCase()}@example.com`,
      preferredPosition: "left",
      preferredFootballRole: "keeper",
    })
    .returning({ id: user.id });
  return row!.id;
}

async function makeTeam(
  database: TestDatabase,
  sport: "padel" | "football",
  creatorId: string,
  memberIds: string[],
) {
  const [team] = await database
    .insert(teams)
    .values({ createdBy: creatorId, sport })
    .returning({ id: teams.id });
  await database
    .insert(teamMembers)
    .values(
      [creatorId, ...memberIds].map((userId) => ({ teamId: team!.id, userId })),
    );
  return team!.id;
}

describe("teamById for any signed-in User", () => {
  it("opens to a non-member with the record, form, Rivals and Roster, and nothing member-only", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const base = await setup(db);
      const outsider = await makeUser(db, "Outsider");
      const invitee = await makeUser(db, "Invitee");
      await db.insert(teamMemberInvites).values({
        teamId: base.teamId,
        userId: invitee,
        invitedBy: base.ownerId,
      });
      await playMatch(db, base, {
        status: MatchStatusEnum.COMPLETED,
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 2 }],
      });
      await playMatch(db, base, {
        status: MatchStatusEnum.COMPLETED,
        sets: [{ slot1GamesWon: 2, slot2GamesWon: 6 }],
      });
      await db.insert(ratings).values({
        userId: base.ownerId,
        sport: "padel",
        mu: 1400,
        phi: 150,
        sigma: 0.06,
        levelBand: "C2",
      });

      const team = await teamById(db as unknown as Db, {
        teamId: base.teamId,
        userId: outsider,
      });
      expect(team.record).toEqual({
        gamesPlayed: 2,
        wins: 1,
        draws: 0,
        losses: 1,
      });
      expect(team.form).toEqual(["won", "lost"]);
      expect(team.rivals).toMatchObject([
        { teamId: base.rivalId, name: "Owner", played: 2, wins: 1, losses: 1 },
      ]);
      expect(team.closestRival).toBeNull();
      expect(team.games).toHaveLength(2);
      expect(team.games[0]).toMatchObject({
        venueName: "Venue",
        opponent: { teamId: base.rivalId, name: "Owner" },
        sets: [{ us: 2, them: 6 }],
        result: "lost",
      });
      expect(team.members).toEqual([
        expect.objectContaining({
          userId: base.ownerId,
          isViewer: false,
          level: "2.8",
          levelBand: "C2",
        }),
      ]);
      expect(team.viewerIsMember).toBe(false);
      expect(team.viewerActsForTeam).toBe(false);
      expect(team.captainUserId).toBe(base.ownerId);
      expect(team.membership).toBeNull();
      expect(team.canInvite).toBe(false);
      expect(team.unusedInvite).toBeNull();
      expect(team.canDissolve).toBe(false);
      expect(team.viewerCanLeave).toBe(false);
    } finally {
      await close();
    }
  });

  it("lets every padel member act for the Team, and only the football Captain", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const captain = await makeUser(db, "Captain");
      const member = await makeUser(db, "Member");
      const padel = await makeTeam(db, "padel", captain, [member]);
      const football = await makeTeam(db, "football", captain, [member]);
      const acts = async (teamId: string, userId: string) =>
        (await teamById(db as unknown as Db, { teamId, userId }))
          .viewerActsForTeam;

      expect(await acts(padel, captain)).toBe(true);
      expect(await acts(padel, member)).toBe(true);
      expect(await acts(football, captain)).toBe(true);
      expect(await acts(football, member)).toBe(false);

      const view = await teamById(db as unknown as Db, {
        teamId: football,
        userId: member,
      });
      expect(view.viewerIsMember).toBe(true);
      expect(view.members[1]).toMatchObject({
        userId: member,
        isViewer: true,
        level: null,
        levelBand: null,
        preferredPosition: "left",
        footballRole: "keeper",
        footballPosition: null,
      });
    } finally {
      await close();
    }
  });
});

import { and, eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  challengeProposals,
  gamePlayers,
  games,
  gameTeamPlayers,
  gameTeams,
  groups,
  matches,
  matchRatingWindows,
  matchSets,
  notifications,
  ratingEvents,
  teamMembers,
  teams,
  user,
} from "@repo/db/schema";
import { messagesFor } from "@repo/i18n/messages";

import {
  addPendingProposal,
  challengeRow,
  footballMatchup,
  makeTeam,
  makeUsers,
  padelMatchup,
  proposalRow,
  refusal,
  withDb,
  type Fixture,
} from "#src/challenges/challenges.test-support";
import { recordJobs } from "#src/jobs/job-sink.test-support";
import {
  challengeExpireJobKey,
  challengeSquadDueJobKey,
  proposalExpireJobKey,
} from "#src/jobs/specs";
import { gameById } from "#src/routers/games/byId";
import { completeMatch } from "#src/routers/games/completeMatch";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { footballBoard } from "#src/routers/games/footballBoard";
import { nameChallengeSquad } from "#src/routers/games/nameChallengeSquad";
import { saveFootballScore } from "#src/routers/games/saveFootballScore";
import { scoreSet } from "#src/routers/games/scoreSet";
import { teamById } from "#src/routers/teams/byId";
import { loadTeamRecord } from "#src/teams/team-record";

import { confirmProposal } from "./confirmProposal";
import { listMine } from "./listMine";
import { proposeOnChallenge } from "./propose";

const HOUR = 60 * 60 * 1000;
const sentAt = new Date(Date.now() - 4 * 24 * HOUR);
const kickOff = new Date(sentAt.getTime() + 48 * HOUR);

async function notificationsOf(
  database: Fixture["database"],
  type:
    | "challenge_proposal_confirmed"
    | "challenge_proposal_passed_over"
    | "challenge_squad_due",
) {
  return database.query.notifications.findMany({
    where: eq(notifications.type, type),
  });
}

describe("challenges.confirmProposal", () => {
  const jobs = recordJobs();

  it("creates a groupless Rated padel Game with both pairs seated, and lists it on both Teams", async () => {
    await withDb(async ({ database, db }) => {
      const match = await padelMatchup(database, sentAt);
      await database
        .update(user)
        .set({ preferredPosition: "left" })
        .where(inArray(user.id, [match.poster.ali, match.poster.omar]));
      await database
        .update(user)
        .set({ preferredPosition: "right" })
        .where(eq(user.id, match.proposer.saad));
      const { id: proposalId } = await proposeOnChallenge(db, {
        challengeId: match.challenge.id,
        teamId: match.riffa.id,
        venueId: match.venue.id,
        courtId: match.court.id,
        startsAt: kickOff,
        pricePerPlayerFils: 1500,
        userId: match.proposer.rafi,
        now: sentAt,
      });
      jobs.clear();

      const { gameId } = await confirmProposal(db, {
        proposalId,
        userId: match.poster.ali,
        now: sentAt,
      });

      const game = await database.query.games.findFirst({
        where: eq(games.id, gameId),
      });
      expect(game).toMatchObject({
        groupId: null,
        rated: true,
        groupRated: false,
        sport: "padel",
        challengeId: match.challenge.id,
        registrationClosedAt: sentAt,
        venueId: match.venue.id,
        pricePerPlayerFils: 1500,
        windowStart: kickOff,
        windowEnd: new Date(kickOff.getTime() + 90 * 60 * 1000),
      });
      const sides = await database.query.gameTeams.findMany({
        where: eq(gameTeams.gameId, gameId),
        with: {
          players: {
            columns: { position: true },
            with: { gamePlayer: { columns: { userId: true } } },
          },
        },
      });
      expect(sides.map((side) => [side.sideIndex, side.teamId]).sort()).toEqual(
        [
          [1, match.seef.id],
          [2, match.riffa.id],
        ],
      );
      expect(
        await database.query.gamePlayers.findMany({
          where: eq(gamePlayers.gameId, gameId),
        }),
      ).toHaveLength(4);
      const positionOf = (userId: string) =>
        sides
          .flatMap((side) => side.players)
          .find((link) => link.gamePlayer.userId === userId)?.position;
      expect(positionOf(match.poster.ali)).toBe("left");
      expect(positionOf(match.poster.omar)).toBe("right");
      expect(positionOf(match.proposer.saad)).toBe("right");
      expect(positionOf(match.proposer.rafi)).toBe("left");
      for (const side of sides) {
        expect(new Set(side.players.map((link) => link.position)).size).toBe(2);
      }
      const [gameMatch] = await database.query.matches.findMany({
        where: eq(matches.gameId, gameId),
        with: { sets: true },
      });
      expect(gameMatch).toMatchObject({
        courtId: match.court.id,
        slot1GameTeamId: sides.find((side) => side.sideIndex === 1)?.id,
        slot2GameTeamId: sides.find((side) => side.sideIndex === 2)?.id,
      });
      expect(gameMatch?.sets).toHaveLength(3);

      expect(await challengeRow(database, match.challenge.id)).toMatchObject({
        status: "confirmed",
        confirmedProposalId: proposalId,
        gameId,
        confirmedAt: sentAt,
      });
      expect(await proposalRow(database, proposalId)).toMatchObject({
        status: "confirmed",
        decidedBy: match.poster.ali,
      });
      expect(jobs.removed.sort()).toEqual(
        [
          proposalExpireJobKey(proposalId),
          challengeExpireJobKey(match.challenge.id),
        ].sort(),
      );
      expect(jobs.added.map((job) => job.name)).not.toContain(
        "challenge.squad-due",
      );

      const confirmed = await notificationsOf(
        database,
        "challenge_proposal_confirmed",
      );
      expect(
        confirmed.map((row) => [row.recipientUserId, row.teamId]).sort(),
      ).toEqual(
        [
          [match.poster.omar, match.riffa.id],
          [match.proposer.rafi, match.seef.id],
          [match.proposer.saad, match.seef.id],
        ].sort(),
      );
      expect(confirmed.every((row) => row.gameId === gameId)).toBe(true);

      for (const teamId of [match.seef.id, match.riffa.id]) {
        const team = await teamById(db, {
          teamId,
          userId: match.poster.ali,
        });
        expect(team.challengeGames.map((row) => row.gameId)).toEqual([gameId]);
      }
    });
  });

  it("rates all four at the groupless weight and records the result on both Teams once scored", async () => {
    await withDb(async ({ database, db }) => {
      const match = await padelMatchup(database, sentAt);
      const { id: proposalId } = await proposeOnChallenge(db, {
        challengeId: match.challenge.id,
        teamId: match.riffa.id,
        venueId: match.venue.id,
        startsAt: kickOff,
        userId: match.proposer.rafi,
        now: sentAt,
      });
      const { gameId } = await confirmProposal(db, {
        proposalId,
        userId: match.poster.omar,
        now: sentAt,
      });
      const [gameMatch] = await database.query.matches.findMany({
        where: eq(matches.gameId, gameId),
        with: { sets: { orderBy: (table, { asc }) => [asc(table.setNumber)] } },
      });
      const [first, second] = gameMatch!.sets;
      for (const set of [first!, second!]) {
        await scoreSet(db, {
          gameId,
          matchId: gameMatch!.id,
          setId: set.id,
          userId: match.poster.ali,
          slot1GamesWon: 6,
          slot2GamesWon: 3,
        });
      }
      // Every player acts for their Team, so none of them settles the score
      // alone: it rates once all four agree.
      await confirmMatchResult(db, {
        gameId,
        matchId: gameMatch!.id,
        userId: match.proposer.rafi,
      });
      expect(
        await database.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, gameMatch!.id),
        }),
      ).toHaveLength(0);
      for (const userId of [match.poster.omar, match.proposer.saad]) {
        await confirmMatchResult(db, {
          gameId,
          matchId: gameMatch!.id,
          userId,
        });
      }

      const events = await database.query.ratingEvents.findMany({
        where: eq(ratingEvents.matchId, gameMatch!.id),
      });
      expect(events.map((event) => event.userId).sort()).toEqual(
        [
          match.poster.ali,
          match.poster.omar,
          match.proposer.rafi,
          match.proposer.saad,
        ].sort(),
      );
      expect(events.every((event) => event.weight === 0.5)).toBe(true);
      expect(await loadTeamRecord(db, match.seef.id)).toMatchObject({
        wins: 1,
        losses: 0,
      });
      expect(await loadTeamRecord(db, match.riffa.id)).toMatchObject({
        wins: 0,
        losses: 1,
      });
      const mine = await listMine(db, { userId: match.proposer.saad });
      expect(mine.items.find((item) => item.kind === "played")).toMatchObject({
        gameId,
        team: { id: match.riffa.id },
        opponent: { id: match.seef.id },
        squadState: "locked",
        sets: [
          { us: 3, them: 6 },
          { us: 3, them: 6 },
          { us: null, them: null },
        ],
      });
    });
  });

  it("opens a 6-a-side football Game with two empty sides, its Match and Score shell, and the squad reminder", async () => {
    await withDb(async ({ database, db }) => {
      const match = await footballMatchup(database, sentAt, { sideSize: 6 });
      const [hiddCaptain, hiddMember] = match.hiddIds;
      const [aradCaptain, aradMember] = match.aradIds;
      const { id: proposalId } = await proposeOnChallenge(db, {
        challengeId: match.challenge.id,
        teamId: match.arad.id,
        venueId: match.venue.id,
        courtId: match.court.id,
        startsAt: kickOff,
        userId: aradCaptain!,
        now: sentAt,
      });
      jobs.clear();

      const { gameId } = await confirmProposal(db, {
        proposalId,
        userId: hiddCaptain!,
        now: sentAt,
      });

      const game = await database.query.games.findFirst({
        where: eq(games.id, gameId),
      });
      expect(game).toMatchObject({
        sport: "football",
        sideSize: 6,
        playersAllowed: 18,
        rated: true,
        groupRated: false,
        groupId: null,
        challengeId: match.challenge.id,
        registrationClosedAt: sentAt,
      });
      const sides = await database.query.gameTeams.findMany({
        where: eq(gameTeams.gameId, gameId),
      });
      expect(
        sides.map((side) => [side.sideIndex, side.teamId, side.bib]).sort(),
      ).toEqual([
        [1, match.hidd.id, "black"],
        [2, match.arad.id, "white"],
      ]);
      expect(
        await database.query.gamePlayers.findMany({
          where: eq(gamePlayers.gameId, gameId),
        }),
      ).toHaveLength(0);
      expect(
        await database.query.gameTeamPlayers.findMany({
          where: inArray(
            gameTeamPlayers.gameTeamId,
            sides.map((side) => side.id),
          ),
        }),
      ).toHaveLength(0);
      const gameMatches = await database.query.matches.findMany({
        where: eq(matches.gameId, gameId),
        with: { sets: true },
      });
      expect(gameMatches).toHaveLength(1);
      expect(gameMatches[0]).toMatchObject({
        courtId: match.court.id,
        slot1GameTeamId: sides.find((side) => side.sideIndex === 1)?.id,
        slot2GameTeamId: sides.find((side) => side.sideIndex === 2)?.id,
      });
      expect(
        gameMatches[0]?.sets.map((set) => [
          set.setNumber,
          set.slot1GamesWon,
          set.slot2GamesWon,
        ]),
      ).toEqual([[1, null, null]]);

      expect(jobs.added).toContainEqual(
        expect.objectContaining({
          key: challengeSquadDueJobKey(gameId),
          runAt: new Date(kickOff.getTime() - 24 * HOUR),
        }),
      );
      const confirmed = await notificationsOf(
        database,
        "challenge_proposal_confirmed",
      );
      expect(confirmed.map((row) => row.recipientUserId)).toEqual([
        aradCaptain,
      ]);
      expect(confirmed[0]?.teamId).toBe(match.hidd.id);

      const board = await footballBoard(db, {
        gameId,
        userId: aradMember!,
      });
      expect(board).toBeTruthy();
      const details = await gameById(db, { gameId, userId: hiddMember! });
      expect(details).toMatchObject({ id: gameId, sport: "football" });

      expect(
        await refusal(
          saveFootballScore(db, {
            gameId,
            userId: hiddCaptain!,
            slot1Goals: 2,
            slot2Goals: 1,
            scorers: [],
          }),
        ),
      ).toEqual({ code: "BAD_REQUEST", message: "Name both squads first" });
    });
  });

  describe("a football Challenge Game's score", () => {
    /**
     * Hidd confirms Arad's Proposal and each Captain names a squad without
     * themselves, so neither Captain is seated; Hidd's Captain enters 2-1.
     */
    async function scored(fixture: Fixture) {
      const match = await footballMatchup(fixture.database, sentAt, {
        sideSize: 5,
        roster: 7,
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
      for (const [team, ids] of [
        [match.hidd, match.hiddIds],
        [match.arad, match.aradIds],
      ] as const) {
        await nameChallengeSquad(fixture.db, {
          gameId,
          teamId: team.id,
          userIds: ids.slice(1, 6),
          userId: ids[0]!,
        });
      }
      await saveFootballScore(fixture.db, {
        gameId,
        userId: match.hiddIds[0]!,
        slot1Goals: 2,
        slot2Goals: 1,
        scorers: [],
      });
      const gameMatch = await fixture.database.query.matches.findFirst({
        where: eq(matches.gameId, gameId),
      });
      const confirm = (userId: string) =>
        confirmMatchResult(fixture.db, {
          gameId,
          matchId: gameMatch!.id,
          userId,
        });
      const status = async () =>
        (
          await fixture.database.query.matches.findFirst({
            where: eq(matches.id, gameMatch!.id),
          })
        )?.status;
      return { match, gameId, matchId: gameMatch!.id, confirm, status };
    }

    it("waits for a confirmation from each Team, then opens the Rating window that moves OVR", async () => {
      await withDb(async (fixture) => {
        const { match, gameId, matchId, confirm, status } =
          await scored(fixture);
        const [hiddCaptain, hiddPlayer] = match.hiddIds;
        const aradCaptain = match.aradIds[0]!;

        const captainBoard = await footballBoard(fixture.db, {
          gameId,
          userId: hiddCaptain!,
        });
        expect(captainBoard.viewer).toMatchObject({
          canConfirm: true,
          canConfirmAsOrganizer: false,
          canConfirmForSlots: [],
        });

        await confirm(hiddCaptain!);
        await confirm(hiddPlayer!);
        expect(await status()).toBe("pending");
        const waiting = await footballBoard(fixture.db, {
          gameId,
          userId: hiddCaptain!,
        });
        expect(waiting.match?.confirmed).toEqual({
          slot1: true,
          slot2: false,
        });
        expect(waiting.viewer.canConfirm).toBe(false);
        expect(
          await refusal(
            completeMatch(fixture.db, {
              gameId,
              matchId,
              userId: hiddCaptain!,
            }),
          ),
        ).toMatchObject({ code: "FORBIDDEN" });
        expect(
          await fixture.database.query.matchRatingWindows.findMany(),
        ).toHaveLength(0);

        await confirm(aradCaptain);
        expect(await status()).toBe("completed");
        expect(
          await fixture.database.query.matchRatingWindows.findFirst({
            where: eq(matchRatingWindows.matchId, matchId),
          }),
        ).toMatchObject({ mode: "everyone", countsForLevel: true });
      });
    });

    it("refuses someone who neither plays nor acts for a Team", async () => {
      await withDb(async (fixture) => {
        const { match, confirm, status } = await scored(fixture);
        expect(await refusal(confirm(match.hiddIds[6]!))).toMatchObject({
          code: "FORBIDDEN",
        });
        expect(await status()).toBe("pending");
      });
    });

    it("keeps an older Unrated football Challenge Game's Captain final", async () => {
      await withDb(async (fixture) => {
        const { match, gameId, confirm, status } = await scored(fixture);
        await fixture.database
          .update(games)
          .set({ rated: false })
          .where(eq(games.id, gameId));

        await confirm(match.hiddIds[0]!);

        expect(await status()).toBe("completed");
        expect(
          await fixture.database.query.matchRatingWindows.findMany(),
        ).toHaveLength(0);
      });
    });
  });

  it("writes nothing when a Roster dropped below the Format since the Proposal", async () => {
    await withDb(async ({ database, db }) => {
      const match = await footballMatchup(database, sentAt, {
        sideSize: 6,
        roster: 6,
      });
      const { id: proposalId } = await proposeOnChallenge(db, {
        challengeId: match.challenge.id,
        teamId: match.arad.id,
        venueId: match.venue.id,
        startsAt: kickOff,
        userId: match.aradIds[0]!,
        now: sentAt,
      });
      await database
        .delete(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, match.arad.id),
            eq(teamMembers.userId, match.aradIds[5]!),
          ),
        );
      jobs.clear();

      expect(
        await refusal(
          confirmProposal(db, {
            proposalId,
            userId: match.hiddIds[0]!,
            now: sentAt,
          }),
        ),
      ).toEqual({
        code: "BAD_REQUEST",
        message: "Arad Athletic's Roster is short for 6-a-side",
      });
      expect(await database.query.games.findMany()).toHaveLength(0);
      expect(await challengeRow(database, match.challenge.id)).toMatchObject({
        status: "open",
        gameId: null,
      });
      expect((await proposalRow(database, proposalId)).status).toBe("pending");
      expect(
        await notificationsOf(database, "challenge_proposal_confirmed"),
      ).toHaveLength(0);
      expect(jobs.added).toHaveLength(0);
    });
  });

  it("passes the other pending Proposals over and tells each of their Teams once", async () => {
    await withDb(async ({ database, db }) => {
      const match = await padelMatchup(database, sentAt);
      const [p1, p2, p3, p4] = await makeUsers(database, "Other", 4);
      const sitra = await makeTeam(database, {
        name: "Sitra Spin",
        sport: "padel",
        userIds: [p1!, p2!],
      });
      const zallaq = await makeTeam(database, {
        name: "Zallaq Lobs",
        sport: "padel",
        userIds: [p3!, p4!],
      });
      const { id: chosen } = await proposeOnChallenge(db, {
        challengeId: match.challenge.id,
        teamId: match.riffa.id,
        venueId: match.venue.id,
        startsAt: kickOff,
        userId: match.proposer.rafi,
        now: sentAt,
      });
      const others = await Promise.all(
        [sitra, zallaq].map((team) =>
          addPendingProposal(database, {
            challengeId: match.challenge.id,
            teamId: team.id,
            proposedBy: team.createdBy,
            venueId: match.venue.id,
            expiresAt: new Date(sentAt.getTime() + 48 * HOUR),
          }),
        ),
      );
      jobs.clear();

      await confirmProposal(db, {
        proposalId: chosen,
        userId: match.poster.ali,
        now: sentAt,
      });

      for (const other of others) {
        expect(await proposalRow(database, other.id)).toMatchObject({
          status: "passed_over",
          decidedAt: sentAt,
        });
      }
      expect(jobs.removed).toEqual(
        expect.arrayContaining(
          others.map((other) => proposalExpireJobKey(other.id)),
        ),
      );
      const passed = await notificationsOf(
        database,
        "challenge_proposal_passed_over",
      );
      expect(passed.map((row) => row.recipientUserId).sort()).toEqual(
        [p1, p2, p3, p4].sort(),
      );
      expect(passed.every((row) => row.teamId === match.seef.id)).toBe(true);
      const told = await database.query.notifications.findMany({
        where: eq(notifications.recipientUserId, match.poster.ali),
      });
      expect(
        told.filter(
          (row) =>
            row.type === "challenge_proposal_confirmed" ||
            row.type === "challenge_proposal_passed_over",
        ),
      ).toHaveLength(0);
      expect(
        await database.query.challengeProposals.findMany({
          where: eq(challengeProposals.status, "pending"),
        }),
      ).toHaveLength(0);
    });
  });

  it("refuses the proposing Team, a Proposal no longer pending, and a Challenge already confirmed", async () => {
    await withDb(async ({ db, database }) => {
      const match = await padelMatchup(database, sentAt);
      const { id: proposalId } = await proposeOnChallenge(db, {
        challengeId: match.challenge.id,
        teamId: match.riffa.id,
        venueId: match.venue.id,
        startsAt: kickOff,
        userId: match.proposer.rafi,
        now: sentAt,
      });
      const confirm = (userId: string, now: Date) =>
        confirmProposal(db, { proposalId, userId, now });

      expect(await refusal(confirm(match.proposer.rafi, sentAt))).toMatchObject(
        { code: "FORBIDDEN" },
      );
      expect(
        await refusal(
          confirm(match.poster.ali, new Date(sentAt.getTime() + 49 * HOUR)),
        ),
      ).toMatchObject({ code: "BAD_REQUEST" });
      await confirm(match.poster.ali, sentAt);
      expect(await refusal(confirm(match.poster.ali, sentAt))).toEqual({
        code: "BAD_REQUEST",
        message: "This challenge is no longer open",
      });
      expect(await database.query.games.findMany()).toHaveLength(1);
      expect(
        await database.query.matchSets.findMany({
          where: eq(matchSets.setNumber, 1),
        }),
      ).toHaveLength(1);
    });
  });

  it("refuses an Organizer who acts for both tagged Teams, and lets the poster's Captain confirm", async () => {
    await withDb(async ({ db, database }) => {
      const match = await footballMatchup(database, sentAt, { sideSize: 5 });
      const [organizer] = await makeUsers(database, "Organizer", 1);
      const [group] = await database
        .insert(groups)
        .values({ name: "Gooz", sport: "football", createdBy: organizer! })
        .returning({ id: groups.id });
      await database
        .update(teams)
        .set({ groupId: group!.id })
        .where(inArray(teams.id, [match.hidd.id, match.arad.id]));
      const { id: proposalId } = await proposeOnChallenge(db, {
        challengeId: match.challenge.id,
        teamId: match.arad.id,
        venueId: match.venue.id,
        startsAt: kickOff,
        userId: organizer!,
        now: sentAt,
      });

      expect(
        await refusal(
          confirmProposal(db, { proposalId, userId: organizer!, now: sentAt }),
        ),
      ).toEqual({
        code: "FORBIDDEN",
        message: messagesFor("en").challenge.errors.confirmOwnProposal,
      });
      expect(await database.query.games.findMany()).toHaveLength(0);

      await confirmProposal(db, {
        proposalId,
        userId: match.hiddIds[0]!,
        now: sentAt,
      });
      expect(await database.query.games.findMany()).toHaveLength(1);
    });
  });
});

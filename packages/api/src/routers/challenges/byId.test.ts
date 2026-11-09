import { describe, expect, it } from "vitest";

import {
  footballMatchup,
  makeTeam,
  makeUsers,
  makeVenue,
  padelMatchup,
  withDb,
} from "#src/challenges/challenges.test-support";
import { recordJobs } from "#src/jobs/job-sink.test-support";

import { challengeById } from "./byId";
import { confirmProposal } from "./confirmProposal";
import { postChallenge } from "./post";
import { proposeOnChallenge } from "./propose";
import { withdrawChallenge } from "./withdraw";

const now = new Date("2026-11-08T10:00:00Z");

describe("challenges.byId", () => {
  it("returns the open state to anyone, and Withdraw only to who acts for the Team", async () => {
    await withDb(async ({ database, db }) => {
      const [ali, omar, stranger] = await makeUsers(database, "Seef", 3);
      const seef = await makeTeam(database, {
        name: "Seef Smashers",
        sport: "padel",
        userIds: [ali!, omar!],
      });
      const venue = await makeVenue(database, {
        name: "Padel Central",
        city: "Manama",
        sport: "padel",
      });
      const slot = new Date("2026-11-12T16:00:00Z");
      const { id } = await postChallenge(db, {
        teamId: seef.id,
        levelMinTenths: 28,
        venueIds: [venue.id],
        days: ["thu"],
        timings: ["evening"],
        exactSlots: [slot],
        note: "Bring balls",
        userId: ali!,
        now,
      });

      const seen = await challengeById(db, {
        challengeId: id,
        userId: stranger!,
        now,
      });
      expect(seen).toMatchObject({
        id,
        state: "open",
        sport: "padel",
        sideSize: null,
        levelMinTenths: 28,
        levelMaxTenths: null,
        days: ["thu"],
        timings: ["evening"],
        exactSlots: [slot],
        note: "Bring balls",
        venues: [{ name: "Padel Central" }],
        team: { displayName: "Seef Smashers", rosterCount: 2 },
        postedBy: { id: ali },
        viewerEligibleTeams: [],
        viewerCanWithdraw: false,
      });
      expect(seen.viewer.ineligibleReason).toBe("no_team");
      expect(
        (await challengeById(db, { challengeId: id, userId: omar!, now }))
          .viewerCanWithdraw,
      ).toBe(true);

      await withdrawChallenge(db, { challengeId: id, userId: omar!, now });
      const closed = await challengeById(db, {
        challengeId: id,
        userId: omar!,
        now,
      });
      expect(closed).toMatchObject({
        state: "withdrawn",
        viewerCanWithdraw: false,
        viewerEligibleTeams: [],
      });
    });
  });

  it("shows the proposing Team its pending Proposal and the posting Team the queue", async () => {
    await withDb(async ({ database, db }) => {
      const match = await padelMatchup(database, now);
      const startsAt = new Date("2026-11-13T16:00:00Z");
      const { id: proposalId } = await proposeOnChallenge(db, {
        challengeId: match.challenge.id,
        teamId: match.riffa.id,
        venueId: match.venue.id,
        courtId: match.court.id,
        startsAt,
        pricePerPlayerFils: 1500,
        userId: match.proposer.rafi,
        now,
      });
      const pending = {
        id: proposalId,
        status: "pending",
        team: { id: match.riffa.id, displayName: "Riffa Rackets" },
        proposedBy: { id: match.proposer.rafi },
        venue: { id: match.venue.id, name: "Padel Central" },
        court: { id: match.court.id, name: "Court 1" },
        startsAt,
        pricePerPlayerFils: 1500,
        expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        sentAt: now,
      };

      const proposer = await challengeById(db, {
        challengeId: match.challenge.id,
        userId: match.proposer.saad,
        now,
      });
      expect(proposer).toMatchObject({
        proposalCount: 1,
        viewerProposals: [pending],
        proposalQueue: [],
        viewerCanDecide: false,
      });
      const faceOf = (teamId: string) =>
        proposer.teamFaces.find((face) => face.id === teamId);
      expect(faceOf(match.seef.id)).toMatchObject({
        displayName: "Seef Smashers",
        sport: "padel",
        rosterCount: 2,
        teamLevel: null,
        viewerOnRoster: false,
        members: expect.arrayContaining([
          { name: "Player 1", isViewer: false },
          { name: "Player 2", isViewer: false },
        ]),
      });
      expect(faceOf(match.riffa.id)).toMatchObject({
        displayName: "Riffa Rackets",
        viewerOnRoster: true,
        members: expect.arrayContaining([
          { name: "Player 3", isViewer: false },
          { name: "Player 4", isViewer: true },
        ]),
      });

      const poster = await challengeById(db, {
        challengeId: match.challenge.id,
        userId: match.poster.omar,
        now,
      });
      expect(poster).toMatchObject({
        viewerProposals: [],
        proposalQueue: [pending],
        viewerCanDecide: true,
      });

      const lapsed = await challengeById(db, {
        challengeId: match.challenge.id,
        userId: match.poster.omar,
        now: new Date(now.getTime() + 49 * 60 * 60 * 1000),
      });
      expect(lapsed).toMatchObject({ proposalCount: 0, proposalQueue: [] });
    });
  });

  it("is not found for an unknown id", async () => {
    await withDb(async ({ database, db }) => {
      const [viewer] = await makeUsers(database, "Viewer", 1);
      await expect(
        challengeById(db, {
          challengeId: crypto.randomUUID(),
          userId: viewer!,
          now,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("confirmed", () => {
    recordJobs();

    it("shows the Challenge Game with both squads, who proposed and confirmed, the Pitch and the price", async () => {
      await withDb(async ({ database, db }) => {
        const HOUR = 60 * 60 * 1000;
        const sentAt = new Date(Date.now() - HOUR);
        const kickOff = new Date(sentAt.getTime() + 72 * HOUR);
        const match = await footballMatchup(database, sentAt, { sideSize: 5 });
        const { id: proposalId } = await proposeOnChallenge(db, {
          challengeId: match.challenge.id,
          teamId: match.arad.id,
          venueId: match.venue.id,
          courtId: match.court.id,
          startsAt: kickOff,
          pricePerPlayerFils: 1500,
          userId: match.aradIds[0]!,
          now: sentAt,
        });
        const { gameId } = await confirmProposal(db, {
          proposalId,
          userId: match.hiddIds[0]!,
          now: sentAt,
        });

        const detail = await challengeById(db, {
          challengeId: match.challenge.id,
          userId: match.aradIds[4]!,
          now: sentAt,
        });
        expect(detail.state).toBe("confirmed");
        expect(detail.viewerCanDecide).toBe(false);
        expect(detail.game).toEqual({
          id: gameId,
          sport: "football",
          startsAt: kickOff,
          endsAt: new Date(kickOff.getTime() + 60 * 60 * 1000),
          cancelled: false,
          venue: { name: "Pitch Park", city: "Hidd" },
          court: { name: "Court 1" },
          pricePerPlayerFils: 1500,
          proposedBy: {
            name: "Arad 1",
            teamId: match.arad.id,
            isViewer: false,
          },
          confirmedBy: { name: "Hidd 1" },
          confirmedAt: sentAt,
          sides: [
            {
              teamId: match.hidd.id,
              displayName: "Hidd United",
              sideSize: 5,
              namedCount: 0,
              squadState: "empty",
            },
            {
              teamId: match.arad.id,
              displayName: "Arad Athletic",
              sideSize: 5,
              namedCount: 0,
              squadState: "empty",
            },
          ],
        });
        expect(detail.teamFaces.map((face) => face.id).sort()).toEqual(
          [match.hidd.id, match.arad.id].sort(),
        );
      });
    });
  });
});

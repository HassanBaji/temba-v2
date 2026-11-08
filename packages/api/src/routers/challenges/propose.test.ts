import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { notifications } from "@repo/db/schema";

import {
  addOpenChallenge,
  courtOf,
  makeTeam,
  makeUsers,
  makeVenue,
  padelMatchup,
  proposalRow,
  rate,
  refusal,
  withDb,
} from "#src/challenges/challenges.test-support";
import { recordJobs } from "#src/jobs/job-sink.test-support";
import { proposalExpireJobKey } from "#src/jobs/specs";

import { declineProposal } from "./declineProposal";
import { proposeOnChallenge } from "./propose";

const now = new Date("2026-11-08T10:00:00Z");
const HOUR = 60 * 60 * 1000;
const inTwoDays = new Date(now.getTime() + 48 * HOUR);

describe("challenges.propose", () => {
  const jobs = recordJobs();

  it("sends a Proposal pending 48 hours, enqueues its expiry and tells the posting Team", async () => {
    await withDb(async ({ database, db }) => {
      const match = await padelMatchup(database, now);
      jobs.clear();

      const { id } = await proposeOnChallenge(db, {
        challengeId: match.challenge.id,
        teamId: match.riffa.id,
        venueId: match.venue.id,
        courtId: match.court.id,
        startsAt: inTwoDays,
        pricePerPlayerFils: 1500,
        userId: match.proposer.rafi,
        now,
      });

      expect(await proposalRow(database, id)).toMatchObject({
        status: "pending",
        teamId: match.riffa.id,
        proposedBy: match.proposer.rafi,
        venueId: match.venue.id,
        courtId: match.court.id,
        startsAt: inTwoDays,
        pricePerPlayerFils: 1500,
        expiresAt: new Date(now.getTime() + 48 * HOUR),
      });
      expect(jobs.added).toContainEqual(
        expect.objectContaining({
          name: "proposal.expire",
          key: proposalExpireJobKey(id),
          payload: { proposalId: id },
          runAt: new Date(now.getTime() + 48 * HOUR),
          mode: "replace",
        }),
      );
      const received = await database.query.notifications.findMany({
        where: eq(notifications.type, "challenge_proposal_received"),
      });
      expect(received.map((row) => row.recipientUserId).sort()).toEqual(
        [match.poster.ali, match.poster.omar].sort(),
      );
      expect(
        received.every(
          (row) =>
            row.teamId === match.riffa.id &&
            row.challengeId === match.challenge.id &&
            row.actorUserId === match.proposer.rafi,
        ),
      ).toBe(true);
    });
  });

  it("refuses a second pending Proposal from the same Team, and takes a new one after decline", async () => {
    await withDb(async ({ database, db }) => {
      const match = await padelMatchup(database, now);
      const send = (userId: string) =>
        proposeOnChallenge(db, {
          challengeId: match.challenge.id,
          teamId: match.riffa.id,
          venueId: match.venue.id,
          startsAt: inTwoDays,
          userId,
          now,
        });

      const first = await send(match.proposer.rafi);
      expect(await refusal(send(match.proposer.saad))).toEqual({
        code: "CONFLICT",
        message:
          "Your Team already has a pending proposal here. Change it instead.",
      });

      await declineProposal(db, {
        proposalId: first.id,
        userId: match.poster.ali,
        now,
      });
      const second = await send(match.proposer.saad);
      expect(second.id).not.toBe(first.id);
      expect((await proposalRow(database, second.id)).status).toBe("pending");
      expect((await proposalRow(database, first.id)).status).toBe("declined");
    });
  });

  it("refuses the posting Team, a Team sharing a member with it, and someone who does not act for the Team", async () => {
    await withDb(async ({ database, db }) => {
      const match = await padelMatchup(database, now);
      const [partner, stranger] = await makeUsers(database, "Other", 2);
      const shared = await makeTeam(database, {
        name: "Omar's other pair",
        sport: "padel",
        userIds: [partner!, match.poster.omar],
      });
      const send = (teamId: string, userId: string) =>
        proposeOnChallenge(db, {
          challengeId: match.challenge.id,
          teamId,
          venueId: match.venue.id,
          startsAt: inTwoDays,
          userId,
          now,
        });

      expect(await refusal(send(match.seef.id, match.poster.ali))).toEqual({
        code: "BAD_REQUEST",
        message: "Your Team's challenge",
      });
      expect(await refusal(send(shared.id, partner!))).toEqual({
        code: "BAD_REQUEST",
        message: "Your Team shares a player with this one",
      });
      expect(await refusal(send(match.riffa.id, stranger!))).toEqual({
        code: "FORBIDDEN",
        message: "Only someone who acts for the Team can do that",
      });
    });
  });

  it("refuses a football Roster below the Format and a Team Level outside the range", async () => {
    await withDb(async ({ database, db }) => {
      const goozUsers = await makeUsers(database, "Gooz", 12);
      const gooz = await makeTeam(database, {
        name: "Gooz FC",
        sport: "football",
        userIds: goozUsers,
      });
      const pitches = await makeVenue(database, {
        name: "Matchday Pitches",
        city: "Manama",
        sport: "football",
      });
      const challenge = await addOpenChallenge(database, {
        teamId: gooz.id,
        postedBy: goozUsers[0]!,
        sport: "football",
        sideSize: 7,
        levelMinTenths: 20,
        levelMaxTenths: 35,
        postedAt: now,
      });
      const sixUsers = await makeUsers(database, "Six", 6);
      const six = await makeTeam(database, {
        name: "Six FC",
        sport: "football",
        userIds: sixUsers,
      });
      await rate(database, sixUsers, "football", 1400);
      const strongUsers = await makeUsers(database, "Strong", 7);
      const strong = await makeTeam(database, {
        name: "Strong FC",
        sport: "football",
        userIds: strongUsers,
      });
      await rate(database, strongUsers, "football", 2000);
      const fitUsers = await makeUsers(database, "Fit", 7);
      const fit = await makeTeam(database, {
        name: "Fit FC",
        sport: "football",
        userIds: fitUsers,
      });
      await rate(database, fitUsers, "football", 1400);
      const send = (teamId: string, userId: string) =>
        proposeOnChallenge(db, {
          challengeId: challenge.id,
          teamId,
          venueId: pitches.id,
          startsAt: inTwoDays,
          userId,
          now,
        });

      expect(await refusal(send(six.id, sixUsers[0]!))).toEqual({
        code: "BAD_REQUEST",
        message: "Your Roster is short for 7-a-side",
      });
      expect(await refusal(send(strong.id, strongUsers[0]!))).toEqual({
        code: "BAD_REQUEST",
        message: "Your Team Level is outside the level wanted",
      });
      await expect(send(fit.id, fitUsers[0]!)).resolves.toEqual({
        id: expect.any(String),
      });
    });
  });

  it("refuses a slot 30 minutes ahead or past 30 days, a Venue without the sport, and a Court on another Venue", async () => {
    await withDb(async ({ database, db }) => {
      const match = await padelMatchup(database, now);
      const elsewhere = await makeVenue(database, {
        name: "Riffa Courts",
        city: "Riffa",
        sport: "padel",
      });
      const pitch = await makeVenue(database, {
        name: "Matchday Pitches",
        city: "Manama",
        sport: "football",
      });
      const send = (terms: {
        venueId?: string;
        courtId?: string;
        startsAt?: Date;
      }) =>
        proposeOnChallenge(db, {
          challengeId: match.challenge.id,
          teamId: match.riffa.id,
          venueId: terms.venueId ?? match.venue.id,
          courtId: terms.courtId,
          startsAt: terms.startsAt ?? inTwoDays,
          userId: match.proposer.rafi,
          now,
        });

      expect(
        await refusal(send({ startsAt: new Date(now.getTime() + HOUR / 2) })),
      ).toEqual({
        code: "BAD_REQUEST",
        message: "Pick a time at least an hour ahead",
      });
      expect(
        await refusal(
          send({ startsAt: new Date(now.getTime() + 31 * 24 * HOUR) }),
        ),
      ).toEqual({ code: "BAD_REQUEST", message: "Pick a time within 30 days" });
      expect(await refusal(send({ venueId: pitch.id }))).toEqual({
        code: "BAD_REQUEST",
        message: "Pick venues with a padel court",
      });
      expect(
        await refusal(
          send({ courtId: (await courtOf(database, elsewhere.id)).id }),
        ),
      ).toEqual({
        code: "BAD_REQUEST",
        message: "That court is not at this venue, or not for this sport",
      });
      expect(await database.query.challengeProposals.findMany()).toEqual([]);
    });
  });

  it("refuses a Challenge past its seven days with nothing pending", async () => {
    await withDb(async ({ database, db }) => {
      const match = await padelMatchup(database, now);
      const later = new Date(now.getTime() + 8 * 24 * HOUR);
      expect(
        await refusal(
          proposeOnChallenge(db, {
            challengeId: match.challenge.id,
            teamId: match.riffa.id,
            venueId: match.venue.id,
            startsAt: new Date(later.getTime() + 48 * HOUR),
            userId: match.proposer.rafi,
            now: later,
          }),
        ),
      ).toEqual({
        code: "BAD_REQUEST",
        message: "This challenge is no longer open",
      });
    });
  });
});

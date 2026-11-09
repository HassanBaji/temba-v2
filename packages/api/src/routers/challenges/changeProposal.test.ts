import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { notifications } from "@repo/db/schema";
import { messagesFor } from "@repo/i18n/messages";

import {
  courtOf,
  makeVenue,
  padelMatchup,
  proposalRow,
  refusal,
  withDb,
} from "#src/challenges/challenges.test-support";
import { recordJobs } from "#src/jobs/job-sink.test-support";
import { proposalExpireJobKey } from "#src/jobs/specs";

import { changeProposal, PROPOSAL_MAX_CHANGES } from "./changeProposal";
import { proposeOnChallenge } from "./propose";
import { withdrawProposal } from "./withdrawProposal";

const sentAt = new Date("2026-11-08T10:00:00Z");
const HOUR = 60 * 60 * 1000;

describe("challenges.changeProposal", () => {
  const jobs = recordJobs();

  it("replaces the terms in place, restarts the 48 hours with the job, and tells the poster again", async () => {
    await withDb(async ({ database, db }) => {
      const match = await padelMatchup(database, sentAt);
      const { id } = await proposeOnChallenge(db, {
        challengeId: match.challenge.id,
        teamId: match.riffa.id,
        venueId: match.venue.id,
        startsAt: new Date(sentAt.getTime() + 48 * HOUR),
        userId: match.proposer.rafi,
        now: sentAt,
      });
      const other = await makeVenue(database, {
        name: "Riffa Courts",
        city: "Riffa",
        sport: "padel",
      });
      const court = await courtOf(database, other.id);
      const changedAt = new Date(sentAt.getTime() + 20 * HOUR);
      const startsAt = new Date(sentAt.getTime() + 72 * HOUR);
      jobs.clear();

      await changeProposal(db, {
        proposalId: id,
        venueId: other.id,
        courtId: court.id,
        startsAt,
        pricePerPlayerFils: 2000,
        userId: match.proposer.saad,
        now: changedAt,
      });

      const changedExpiry = new Date(changedAt.getTime() + 48 * HOUR);
      expect(await proposalRow(database, id)).toMatchObject({
        status: "pending",
        venueId: other.id,
        courtId: court.id,
        startsAt,
        pricePerPlayerFils: 2000,
        expiresAt: changedExpiry,
        proposedBy: match.proposer.rafi,
      });
      expect(jobs.added).toContainEqual(
        expect.objectContaining({
          name: "proposal.expire",
          key: proposalExpireJobKey(id),
          runAt: changedExpiry,
          mode: "replace",
        }),
      );
      const received = await database.query.notifications.findMany({
        where: eq(notifications.type, "challenge_proposal_received"),
      });
      expect(
        received.filter((row) => row.recipientUserId === match.poster.ali),
      ).toHaveLength(2);
      expect(
        received.filter((row) => row.recipientUserId === match.poster.omar),
      ).toHaveLength(2);
    });
  });

  it("refuses a Proposal no longer pending and someone who does not act for its Team", async () => {
    await withDb(async ({ database, db }) => {
      const match = await padelMatchup(database, sentAt);
      const { id } = await proposeOnChallenge(db, {
        challengeId: match.challenge.id,
        teamId: match.riffa.id,
        venueId: match.venue.id,
        startsAt: new Date(sentAt.getTime() + 48 * HOUR),
        userId: match.proposer.rafi,
        now: sentAt,
      });
      const change = (userId: string, now: Date) =>
        changeProposal(db, {
          proposalId: id,
          venueId: match.venue.id,
          startsAt: new Date(now.getTime() + 24 * HOUR),
          userId,
          now,
        });

      expect(await refusal(change(match.poster.ali, sentAt))).toMatchObject({
        code: "FORBIDDEN",
      });
      expect(
        await refusal(
          change(match.proposer.rafi, new Date(sentAt.getTime() + 49 * HOUR)),
        ),
      ).toEqual({
        code: "BAD_REQUEST",
        message: "This proposal is no longer pending",
      });
      await withdrawProposal(db, {
        proposalId: id,
        userId: match.proposer.rafi,
        now: sentAt,
      });
      expect(await refusal(change(match.proposer.rafi, sentAt))).toMatchObject({
        code: "BAD_REQUEST",
      });
    });
  });

  it("stops renewing the 48 hours after the last allowed change", async () => {
    await withDb(async ({ database, db }) => {
      const match = await padelMatchup(database, sentAt);
      const { id } = await proposeOnChallenge(db, {
        challengeId: match.challenge.id,
        teamId: match.riffa.id,
        venueId: match.venue.id,
        startsAt: new Date(sentAt.getTime() + 48 * HOUR),
        userId: match.proposer.rafi,
        now: sentAt,
      });
      const change = (now: Date) =>
        changeProposal(db, {
          proposalId: id,
          venueId: match.venue.id,
          startsAt: new Date(now.getTime() + 24 * HOUR),
          userId: match.proposer.rafi,
          now,
        });

      let now = sentAt;
      for (let index = 0; index < PROPOSAL_MAX_CHANGES; index += 1) {
        now = new Date(now.getTime() + 40 * HOUR);
        await change(now);
      }
      const lastExpiry = new Date(now.getTime() + 48 * HOUR);
      expect(await proposalRow(database, id)).toMatchObject({
        changeCount: PROPOSAL_MAX_CHANGES,
        expiresAt: lastExpiry,
      });

      expect(
        await refusal(change(new Date(now.getTime() + 40 * HOUR))),
      ).toEqual({
        code: "BAD_REQUEST",
        message:
          messagesFor("en").challenge.errors.changeLimit(PROPOSAL_MAX_CHANGES),
      });
      expect((await proposalRow(database, id)).expiresAt).toEqual(lastExpiry);
    });
  });
});

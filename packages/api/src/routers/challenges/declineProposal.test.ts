import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { challenges, notifications } from "@repo/db/schema";

import {
  padelMatchup,
  proposalRow,
  refusal,
  withDb,
} from "#src/challenges/challenges.test-support";
import { recordJobs } from "#src/jobs/job-sink.test-support";
import { challengeExpireJobKey, proposalExpireJobKey } from "#src/jobs/specs";

import { declineProposal } from "./declineProposal";
import { proposeOnChallenge } from "./propose";

const sentAt = new Date("2026-11-08T10:00:00Z");
const HOUR = 60 * 60 * 1000;

describe("challenges.declineProposal", () => {
  const jobs = recordJobs();

  it("declines for the posting Team, tells the proposing Team except the decider, and drops the job", async () => {
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
      jobs.clear();

      await declineProposal(db, {
        proposalId: id,
        userId: match.poster.omar,
        now: sentAt,
      });

      expect(await proposalRow(database, id)).toMatchObject({
        status: "declined",
        decidedBy: match.poster.omar,
        decidedAt: sentAt,
      });
      expect(jobs.removed).toEqual([proposalExpireJobKey(id)]);
      expect(jobs.added).toContainEqual(
        expect.objectContaining({
          key: challengeExpireJobKey(match.challenge.id),
          runAt: match.challenge.expiresAt,
        }),
      );
      const declined = await database.query.notifications.findMany({
        where: eq(notifications.type, "challenge_proposal_declined"),
      });
      expect(declined.map((row) => row.recipientUserId).sort()).toEqual(
        [match.proposer.rafi, match.proposer.saad].sort(),
      );
      expect(
        declined.every(
          (row) =>
            row.teamId === match.seef.id &&
            row.challengeId === match.challenge.id,
        ),
      ).toBe(true);
    });
  });

  it("refuses the proposing Team, a Proposal no longer pending, and a Challenge no longer open", async () => {
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
      const decline = (userId: string, now: Date) =>
        declineProposal(db, { proposalId: id, userId, now });

      expect(await refusal(decline(match.proposer.rafi, sentAt))).toMatchObject(
        { code: "FORBIDDEN" },
      );
      expect(
        await refusal(
          decline(match.poster.ali, new Date(sentAt.getTime() + 49 * HOUR)),
        ),
      ).toEqual({
        code: "BAD_REQUEST",
        message: "This proposal is no longer pending",
      });
      await database
        .update(challenges)
        .set({ status: "withdrawn" })
        .where(eq(challenges.id, match.challenge.id));
      expect(await refusal(decline(match.poster.ali, sentAt))).toEqual({
        code: "BAD_REQUEST",
        message: "This challenge is no longer open",
      });
    });
  });
});

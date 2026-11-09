import { describe, expect, it } from "vitest";

import {
  padelMatchup,
  proposalRow,
  refusal,
  withDb,
} from "#src/challenges/challenges.test-support";
import { recordJobs } from "#src/jobs/job-sink.test-support";
import { challengeExpireJobKey, proposalExpireJobKey } from "#src/jobs/specs";

import { proposeOnChallenge } from "./propose";
import { withdrawProposal } from "./withdrawProposal";

const sentAt = new Date("2026-11-08T10:00:00Z");
const HOUR = 60 * 60 * 1000;

describe("challenges.withdrawProposal", () => {
  const jobs = recordJobs();

  it("stamps the Proposal withdrawn, drops its job and hands a due Challenge back to its clock", async () => {
    await withDb(async ({ database, db }) => {
      const match = await padelMatchup(database, sentAt);
      const proposedAt = new Date(sentAt.getTime() + 6 * 24 * HOUR);
      const { id } = await proposeOnChallenge(db, {
        challengeId: match.challenge.id,
        teamId: match.riffa.id,
        venueId: match.venue.id,
        startsAt: new Date(proposedAt.getTime() + 24 * HOUR),
        userId: match.proposer.rafi,
        now: proposedAt,
      });
      expect(
        await refusal(
          withdrawProposal(db, {
            proposalId: id,
            userId: match.poster.ali,
            now: proposedAt,
          }),
        ),
      ).toMatchObject({ code: "FORBIDDEN" });
      const withdrawnAt = new Date(sentAt.getTime() + 7.5 * 24 * HOUR);
      jobs.clear();

      await withdrawProposal(db, {
        proposalId: id,
        userId: match.proposer.saad,
        now: withdrawnAt,
      });

      expect(await proposalRow(database, id)).toMatchObject({
        status: "withdrawn",
        decidedBy: match.proposer.saad,
        decidedAt: withdrawnAt,
      });
      expect(jobs.removed).toEqual([proposalExpireJobKey(id)]);
      expect(jobs.added).toEqual([
        expect.objectContaining({
          key: challengeExpireJobKey(match.challenge.id),
          runAt: withdrawnAt,
        }),
      ]);
      expect(
        await refusal(
          withdrawProposal(db, {
            proposalId: id,
            userId: match.proposer.rafi,
            now: withdrawnAt,
          }),
        ),
      ).toEqual({
        code: "BAD_REQUEST",
        message: "This proposal is no longer pending",
      });
    });
  });
});

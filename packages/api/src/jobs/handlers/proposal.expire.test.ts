import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { notifications, type Db } from "@repo/db";

import {
  challengeRow,
  makeTeam,
  makeUsers,
  padelMatchup,
  proposalRow,
  withDb,
  type Fixture,
} from "#src/challenges/challenges.test-support";
import { recordJobs } from "#src/jobs/job-sink.test-support";
import { proposalExpireJobKey } from "#src/jobs/specs";
import { proposeOnChallenge } from "#src/routers/challenges/propose";

import { handle, jobName, payloadSchema } from "./proposal.expire";

const posted = new Date("2026-11-01T10:00:00Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function asDb(fixture: Fixture): Db {
  return fixture.db as unknown as Db;
}

async function ofType(
  fixture: Fixture,
  type: "challenge_proposal_expired" | "challenge_expired",
) {
  return fixture.database.query.notifications.findMany({
    where: eq(notifications.type, type),
  });
}

describe("proposal.expire", () => {
  const jobs = recordJobs();

  it("is named for Proposals and takes a Proposal id", () => {
    expect(jobName).toBe("proposal.expire");
    expect(payloadSchema.safeParse({ proposalId: "nope" }).success).toBe(false);
  });

  it("at hour 49 stamps the Proposal expired, tells the proposing Team once, then expires a Challenge past day 7", async () => {
    await withDb(async (fixture) => {
      const match = await padelMatchup(fixture.database, posted);
      const sentAt = new Date(posted.getTime() + 6 * DAY);
      const { id } = await proposeOnChallenge(fixture.db, {
        challengeId: match.challenge.id,
        teamId: match.riffa.id,
        venueId: match.venue.id,
        startsAt: new Date(sentAt.getTime() + 3 * DAY),
        userId: match.proposer.rafi,
        now: sentAt,
      });
      const hour49 = new Date(sentAt.getTime() + 49 * HOUR);

      await handle(asDb(fixture), { proposalId: id }, undefined, hour49);

      expect(await proposalRow(fixture.database, id)).toMatchObject({
        status: "expired",
        decidedAt: hour49,
      });
      const expired = await ofType(fixture, "challenge_proposal_expired");
      expect(expired.map((row) => row.recipientUserId).sort()).toEqual(
        [match.proposer.rafi, match.proposer.saad].sort(),
      );
      expect(
        expired.every(
          (row) =>
            row.teamId === match.seef.id &&
            row.challengeId === match.challenge.id,
        ),
      ).toBe(true);
      expect(
        await challengeRow(fixture.database, match.challenge.id),
      ).toMatchObject({ status: "expired", expiredAt: hour49 });
      expect(await ofType(fixture, "challenge_expired")).toHaveLength(2);

      await handle(
        asDb(fixture),
        { proposalId: id },
        undefined,
        new Date(hour49.getTime() + HOUR),
      );
      expect(await ofType(fixture, "challenge_proposal_expired")).toHaveLength(
        2,
      );
    });
  });

  it("keeps the Challenge open while another Proposal is pending", async () => {
    await withDb(async (fixture) => {
      const match = await padelMatchup(fixture.database, posted);
      const [kai, lee] = await makeUsers(fixture.database, "Isa", 2);
      const isa = await makeTeam(fixture.database, {
        name: "Isa Town Pair",
        sport: "padel",
        userIds: [kai!, lee!],
      });
      const sentAt = new Date(posted.getTime() + 6 * DAY);
      const first = await proposeOnChallenge(fixture.db, {
        challengeId: match.challenge.id,
        teamId: match.riffa.id,
        venueId: match.venue.id,
        startsAt: new Date(sentAt.getTime() + 3 * DAY),
        userId: match.proposer.rafi,
        now: sentAt,
      });
      await proposeOnChallenge(fixture.db, {
        challengeId: match.challenge.id,
        teamId: isa.id,
        venueId: match.venue.id,
        startsAt: new Date(sentAt.getTime() + 3 * DAY),
        userId: kai!,
        now: new Date(sentAt.getTime() + 10 * HOUR),
      });
      jobs.clear();

      await handle(
        asDb(fixture),
        { proposalId: first.id },
        undefined,
        new Date(sentAt.getTime() + 49 * HOUR),
      );

      expect((await proposalRow(fixture.database, first.id)).status).toBe(
        "expired",
      );
      expect(
        (await challengeRow(fixture.database, match.challenge.id)).status,
      ).toBe("open");
      expect(await ofType(fixture, "challenge_expired")).toEqual([]);
      expect(jobs.added).toContainEqual(
        expect.objectContaining({
          name: "challenge.expire",
          runAt: new Date(sentAt.getTime() + 58 * HOUR),
        }),
      );
    });
  });

  it("re-schedules a Proposal whose clock moved, and leaves a decided one alone", async () => {
    await withDb(async (fixture) => {
      const match = await padelMatchup(fixture.database, posted);
      const { id } = await proposeOnChallenge(fixture.db, {
        challengeId: match.challenge.id,
        teamId: match.riffa.id,
        venueId: match.venue.id,
        startsAt: new Date(posted.getTime() + 3 * DAY),
        userId: match.proposer.rafi,
        now: posted,
      });
      jobs.clear();
      const early = new Date(posted.getTime() + 10 * HOUR);
      await handle(asDb(fixture), { proposalId: id }, undefined, early);
      expect((await proposalRow(fixture.database, id)).status).toBe("pending");
      expect(jobs.added).toEqual([
        expect.objectContaining({
          key: proposalExpireJobKey(id),
          runAt: new Date(posted.getTime() + 48 * HOUR),
        }),
      ]);

      await expect(
        handle(
          asDb(fixture),
          { proposalId: crypto.randomUUID() },
          undefined,
          early,
        ),
      ).resolves.toBeUndefined();
      expect(await ofType(fixture, "challenge_proposal_expired")).toEqual([]);
    });
  });
});

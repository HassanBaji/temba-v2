import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { challenges, notifications, type Db } from "@repo/db";

import {
  addPendingProposal,
  challengeRow,
  makeTeam,
  makeUsers,
  makeVenue,
  withDb,
  type Fixture,
} from "#src/challenges/challenges.test-support";
import { recordJobs } from "#src/jobs/job-sink.test-support";
import { challengeExpireJobKey } from "#src/jobs/specs";
import { postChallenge } from "#src/routers/challenges/post";

import { handle, jobName, payloadSchema } from "./challenge.expire";

const posted = new Date("2026-11-01T10:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const dayEight = new Date(posted.getTime() + 8 * DAY);

function asDb(fixture: Fixture): Db {
  return fixture.db as unknown as Db;
}

async function padelChallenge(fixture: Fixture) {
  const [ali, omar] = await makeUsers(fixture.database, "Seef", 2);
  const team = await makeTeam(fixture.database, {
    name: "Seef Smashers",
    sport: "padel",
    userIds: [ali!, omar!],
  });
  const { id } = await postChallenge(fixture.db, {
    teamId: team.id,
    userId: ali!,
    now: posted,
  });
  return { id, team, actingUserIds: [ali!, omar!] };
}

async function expiredNotifications(fixture: Fixture) {
  return fixture.database.query.notifications.findMany({
    where: eq(notifications.type, "challenge_expired"),
  });
}

describe("challenge.expire", () => {
  const jobs = recordJobs();

  it("is named for Challenges and takes a Challenge id", () => {
    expect(jobName).toBe("challenge.expire");
    expect(payloadSchema.safeParse({ challengeId: "nope" }).success).toBe(
      false,
    );
  });

  it("stamps a Challenge with no Proposal expired at day 8 and tells each acting User once", async () => {
    await withDb(async (fixture) => {
      const challenge = await padelChallenge(fixture);
      jobs.clear();

      await handle(
        asDb(fixture),
        { challengeId: challenge.id },
        undefined,
        dayEight,
      );
      expect(await challengeRow(fixture.database, challenge.id)).toMatchObject({
        status: "expired",
        expiredAt: dayEight,
      });
      const sent = await expiredNotifications(fixture);
      expect(sent.map((row) => row.recipientUserId).sort()).toEqual(
        [...challenge.actingUserIds].sort(),
      );
      expect(sent.every((row) => row.challengeId === challenge.id)).toBe(true);
      expect(sent.every((row) => row.teamId === challenge.team.id)).toBe(true);
      expect(jobs.added.map((job) => job.name)).toEqual([
        "notification.email",
        "notification.email",
      ]);
      jobs.clear();

      await handle(
        asDb(fixture),
        { challengeId: challenge.id },
        undefined,
        new Date(dayEight.getTime() + DAY),
      );
      expect(await expiredNotifications(fixture)).toHaveLength(2);
      expect(
        (await challengeRow(fixture.database, challenge.id)).expiredAt,
      ).toEqual(dayEight);
      expect(jobs.added).toEqual([]);
    });
  });

  it("re-schedules at the pending Proposal's expiry and stamps nothing", async () => {
    await withDb(async (fixture) => {
      const challenge = await padelChallenge(fixture);
      const [rafi, saad] = await makeUsers(fixture.database, "Riffa", 2);
      const riffa = await makeTeam(fixture.database, {
        name: "Riffa Rackets",
        sport: "padel",
        userIds: [rafi!, saad!],
      });
      const venue = await makeVenue(fixture.database, {
        name: "Padel Central",
        city: "Manama",
        sport: "padel",
      });
      const proposalExpiresAt = new Date(dayEight.getTime() + DAY);
      await addPendingProposal(fixture.database, {
        challengeId: challenge.id,
        teamId: riffa.id,
        proposedBy: rafi!,
        venueId: venue.id,
        expiresAt: proposalExpiresAt,
      });
      jobs.clear();

      await handle(
        asDb(fixture),
        { challengeId: challenge.id },
        undefined,
        dayEight,
      );
      expect((await challengeRow(fixture.database, challenge.id)).status).toBe(
        "open",
      );
      expect(await expiredNotifications(fixture)).toEqual([]);
      expect(jobs.added).toEqual([
        expect.objectContaining({
          name: "challenge.expire",
          key: challengeExpireJobKey(challenge.id),
          runAt: proposalExpiresAt,
        }),
      ]);
    });
  });

  it("leaves a withdrawn Challenge and an unknown one alone", async () => {
    await withDb(async (fixture) => {
      const challenge = await padelChallenge(fixture);
      await fixture.database.update(challenges).set({ status: "withdrawn" });
      await handle(
        asDb(fixture),
        { challengeId: challenge.id },
        undefined,
        dayEight,
      );
      expect((await challengeRow(fixture.database, challenge.id)).status).toBe(
        "withdrawn",
      );
      await expect(
        handle(
          asDb(fixture),
          { challengeId: crypto.randomUUID() },
          undefined,
          dayEight,
        ),
      ).resolves.toBeUndefined();
      expect(await expiredNotifications(fixture)).toEqual([]);
    });
  });
});

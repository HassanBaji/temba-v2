import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { challengeVenues, notifications } from "@repo/db/schema";
import type { TestDatabase } from "@repo/db/testing";

import {
  challengeRow,
  makeTeam,
  makeUsers,
  makeVenue,
  playTeams,
  withDb,
} from "#src/challenges/challenges.test-support";
import { recordJobs } from "#src/jobs/job-sink.test-support";
import { challengeExpireJobKey } from "#src/jobs/specs";

import { postChallenge } from "./post";
import { withdrawChallenge } from "./withdraw";

const now = new Date("2026-11-08T10:00:00Z");

async function refusal(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    if (error instanceof TRPCError) {
      return { code: error.code, message: error.message };
    }
    throw error;
  }
  throw new Error("Expected a refusal");
}

describe("challenges.post", () => {
  const jobs = recordJobs();

  it("writes the Challenge, its Venues in order, and the expiry Job at seven days", async () => {
    await withDb(async ({ database, db }) => {
      const users = await makeUsers(database, "Gooz", 12);
      const gooz = await makeTeam(database, {
        name: "Gooz FC",
        sport: "football",
        userIds: users,
      });
      const pitches = await makeVenue(database, {
        name: "Matchday Pitches",
        city: "Manama",
        sport: "football",
      });
      const arena = await makeVenue(database, {
        name: "Arad Arena",
        city: "Muharraq",
        sport: "football",
      });
      const slot = new Date("2026-11-13T16:00:00Z");

      const { id } = await postChallenge(db, {
        teamId: gooz.id,
        sideSize: 6,
        levelMinTenths: 28,
        levelMaxTenths: 48,
        venueIds: [arena.id, pitches.id],
        days: ["fri", "sat"],
        timings: ["evening"],
        exactSlots: [slot],
        note: "  Friendly, on time  ",
        userId: users[0]!,
        now,
      });

      expect(await challengeRow(database, id)).toMatchObject({
        teamId: gooz.id,
        sport: "football",
        status: "open",
        postedBy: users[0],
        sideSize: 6,
        levelMinTenths: 28,
        levelMaxTenths: 48,
        days: ["fri", "sat"],
        timings: ["evening"],
        exactSlots: [slot],
        durationMinutes: 60,
        note: "Friendly, on time",
        expiresAt: new Date("2026-11-15T10:00:00Z"),
      });
      const venues = await database.query.challengeVenues.findMany({
        where: eq(challengeVenues.challengeId, id),
        orderBy: (table, { asc }) => [asc(table.rank)],
      });
      expect(venues.map((venue) => venue.venueId)).toEqual([
        arena.id,
        pitches.id,
      ]);
      expect(jobs.added).toEqual([
        expect.objectContaining({
          name: "challenge.expire",
          key: challengeExpireJobKey(id),
          payload: { challengeId: id },
          mode: "replace",
          runAt: new Date("2026-11-15T10:00:00Z"),
        }),
      ]);
    });
  });

  it("defaults padel to a 90-minute Game and needs both players", async () => {
    await withDb(async ({ database, db }) => {
      const [ali, omar, solo] = await makeUsers(database, "Seef", 3);
      const seef = await makeTeam(database, {
        name: "Seef Smashers",
        sport: "padel",
        userIds: [ali!, omar!],
      });
      const { id } = await postChallenge(db, {
        teamId: seef.id,
        userId: omar!,
        now,
      });
      expect((await challengeRow(database, id)).durationMinutes).toBe(90);

      const waiting = await makeTeam(database, {
        name: "Waiting",
        sport: "padel",
        userIds: [solo!],
      });
      expect(
        await refusal(
          postChallenge(db, { teamId: waiting.id, userId: solo!, now }),
        ),
      ).toEqual({
        code: "BAD_REQUEST",
        message: "A padel Team needs both players to post",
      });
    });
  });

  it("allows one open Challenge per Team; withdraw then post succeeds", async () => {
    await withDb(async ({ database, db }) => {
      const [ali, omar] = await makeUsers(database, "Seef", 2);
      const seef = await makeTeam(database, {
        name: "Seef Smashers",
        sport: "padel",
        userIds: [ali!, omar!],
      });
      const first = await postChallenge(db, {
        teamId: seef.id,
        userId: ali!,
        now,
      });
      expect(
        await refusal(
          postChallenge(db, { teamId: seef.id, userId: omar!, now }),
        ),
      ).toEqual({
        code: "CONFLICT",
        message:
          "This Team already has an open challenge. Withdraw it to post another.",
      });

      await withdrawChallenge(db, {
        challengeId: first.id,
        userId: omar!,
        now,
      });
      const second = await postChallenge(db, {
        teamId: seef.id,
        userId: ali!,
        now,
      });
      expect(second.id).not.toBe(first.id);
      expect((await challengeRow(database, first.id)).status).toBe("withdrawn");
      expect(jobs.removed).toEqual([challengeExpireJobKey(first.id)]);
    });
  });

  it("gates the Format on the Roster and refuses a Format on padel", async () => {
    await withDb(async ({ database, db }) => {
      const five = await makeUsers(database, "Five", 5);
      const fiveTeam = await makeTeam(database, {
        name: "Five FC",
        sport: "football",
        userIds: five,
      });
      const formatMessage =
        "6-a-side needs that many on the Roster. Yours has 5.";
      expect(
        await refusal(
          postChallenge(db, {
            teamId: fiveTeam.id,
            sideSize: 6,
            userId: five[0]!,
            now,
          }),
        ),
      ).toEqual({ code: "BAD_REQUEST", message: formatMessage });
      await expect(
        postChallenge(db, {
          teamId: fiveTeam.id,
          sideSize: 5,
          userId: five[0]!,
          now,
        }),
      ).resolves.toEqual({ id: expect.any(String) });

      const six = await makeUsers(database, "Six", 6);
      const sixTeam = await makeTeam(database, {
        name: "Six FC",
        sport: "football",
        userIds: six,
      });
      expect(
        await refusal(
          postChallenge(db, {
            teamId: sixTeam.id,
            sideSize: 7,
            userId: six[0]!,
            now,
          }),
        ),
      ).toMatchObject({ code: "BAD_REQUEST" });
      expect(
        await refusal(
          postChallenge(db, { teamId: sixTeam.id, userId: six[0]!, now }),
        ),
      ).toEqual({
        code: "BAD_REQUEST",
        message: "Pick a Format: 5, 6 or 7-a-side",
      });
      const sixOnSix = await postChallenge(db, {
        teamId: sixTeam.id,
        sideSize: 6,
        userId: six[0]!,
        now,
      });
      await withdrawChallenge(db, {
        challengeId: sixOnSix.id,
        userId: six[0]!,
        now,
      });
      await expect(
        postChallenge(db, {
          teamId: sixTeam.id,
          sideSize: 5,
          userId: six[0]!,
          now,
        }),
      ).resolves.toEqual({ id: expect.any(String) });

      const [ali, omar] = await makeUsers(database, "Seef", 2);
      const seef = await makeTeam(database, {
        name: "Seef Smashers",
        sport: "padel",
        userIds: [ali!, omar!],
      });
      expect(
        await refusal(
          postChallenge(db, {
            teamId: seef.id,
            sideSize: 5,
            userId: ali!,
            now,
          }),
        ),
      ).toEqual({
        code: "BAD_REQUEST",
        message: "Padel challenges have no Format",
      });
    });
  });

  it("refuses an outsider, an inverted range, a long line, a past slot and a Venue without the sport", async () => {
    await withDb(async ({ database, db }) => {
      const [ali, omar, outsider] = await makeUsers(database, "Seef", 3);
      const seef = await makeTeam(database, {
        name: "Seef Smashers",
        sport: "padel",
        userIds: [ali!, omar!],
      });
      const pitch = await makeVenue(database, {
        name: "Pitch Only",
        city: "Manama",
        sport: "football",
      });
      const base = { teamId: seef.id, userId: ali!, now };

      expect(
        await refusal(postChallenge(db, { ...base, userId: outsider! })),
      ).toMatchObject({ code: "FORBIDDEN" });
      expect(
        await refusal(
          postChallenge(db, {
            ...base,
            levelMinTenths: 49,
            levelMaxTenths: 28,
          }),
        ),
      ).toEqual({
        code: "BAD_REQUEST",
        message: "Minimum Level cannot be greater than Maximum Level",
      });
      expect(
        await refusal(postChallenge(db, { ...base, note: "x".repeat(141) })),
      ).toEqual({
        code: "BAD_REQUEST",
        message: "Keep the line to 140 characters",
      });
      expect(
        await refusal(
          postChallenge(db, {
            ...base,
            exactSlots: [new Date(now.getTime() - 60_000)],
          }),
        ),
      ).toEqual({
        code: "BAD_REQUEST",
        message: "Exact slots must be in the future",
      });
      expect(
        await refusal(postChallenge(db, { ...base, venueIds: [pitch.id] })),
      ).toEqual({
        code: "BAD_REQUEST",
        message: "Pick venues with a padel court",
      });
      expect(await database.query.challenges.findMany()).toEqual([]);
    });
  });
});

describe("challenges.post with a Rematch nudge", () => {
  recordJobs();

  async function padelRivals(database: TestDatabase) {
    const [ali, omar, rafi, saad, hana, lulu] = await makeUsers(
      database,
      "Player",
      6,
    );
    const seef = await makeTeam(database, {
      name: "Seef Smashers",
      sport: "padel",
      userIds: [ali!, omar!],
    });
    const riffa = await makeTeam(database, {
      name: "Riffa Rackets",
      sport: "padel",
      userIds: [rafi!, saad!],
    });
    const stranger = await makeTeam(database, {
      name: "Juffair Jets",
      sport: "padel",
      userIds: [hana!, lulu!],
    });
    const venue = await makeVenue(database, {
      name: "Padel Central",
      city: "Manama",
      sport: "padel",
    });
    await playTeams(database, {
      teamIds: [seef.id, riffa.id],
      createdBy: ali!,
      venueId: venue.id,
      sport: "padel",
      playedAt: new Date("2026-11-01T18:00:00Z"),
    });
    return {
      seef,
      riffa,
      stranger,
      venue,
      poster: ali!,
      partner: omar!,
      nudged: [rafi!, saad!],
    };
  }

  it("refuses a Team never played, the poster's own Team and another sport", async () => {
    await withDb(async ({ database, db }) => {
      const { seef, stranger, poster } = await padelRivals(database);
      const footballers = await makeUsers(database, "Arad", 5);
      const arad = await makeTeam(database, {
        name: "Arad Athletic",
        sport: "football",
        userIds: footballers,
      });
      const base = { teamId: seef.id, userId: poster, now };
      expect(
        await refusal(postChallenge(db, { ...base, nudgeTeamId: stranger.id })),
      ).toEqual({
        code: "BAD_REQUEST",
        message: "You can only send it straight to a Team you've played",
      });
      expect(
        await refusal(postChallenge(db, { ...base, nudgeTeamId: seef.id })),
      ).toEqual({
        code: "BAD_REQUEST",
        message: "Send it to another Team, not your own",
      });
      expect(
        await refusal(postChallenge(db, { ...base, nudgeTeamId: arad.id })),
      ).toEqual({
        code: "BAD_REQUEST",
        message: "Send it to a Team of the same sport",
      });
      expect(
        await refusal(
          postChallenge(db, { ...base, nudgeTeamId: crypto.randomUUID() }),
        ),
      ).toEqual({
        code: "BAD_REQUEST",
        message: "You can only send it straight to a Team you've played",
      });
      expect(await database.query.challenges.findMany()).toEqual([]);
      expect(await database.query.notifications.findMany()).toEqual([]);
    });
  });

  it("stores the nudge on a Team played once and tells each of its acting Users, not the poster", async () => {
    await withDb(async ({ database, db }) => {
      const { seef, riffa, poster, partner, nudged } =
        await padelRivals(database);
      const { id } = await postChallenge(db, {
        teamId: seef.id,
        nudgeTeamId: riffa.id,
        userId: poster,
        now,
      });
      expect(await challengeRow(database, id)).toMatchObject({
        status: "open",
        nudgeTeamId: riffa.id,
      });
      const rows = await database.query.notifications.findMany({
        where: eq(notifications.type, "challenge_rematch_nudge"),
      });
      expect(rows.map((row) => row.recipientUserId).sort()).toEqual(
        [...nudged].sort(),
      );
      expect(rows.every((row) => row.challengeId === id)).toBe(true);
      expect(rows.every((row) => row.teamId === seef.id)).toBe(true);
      expect(rows.every((row) => row.actorUserId === poster)).toBe(true);
      expect(
        rows.some(
          (row) =>
            row.recipientUserId === poster || row.recipientUserId === partner,
        ),
      ).toBe(false);
    });
  });

  it("tells only who acts for a nudged football Team", async () => {
    await withDb(async ({ database, db }) => {
      const hiddIds = await makeUsers(database, "Hidd", 6);
      const aradIds = await makeUsers(database, "Arad", 6);
      const hidd = await makeTeam(database, {
        name: "Hidd United",
        sport: "football",
        userIds: hiddIds,
      });
      const arad = await makeTeam(database, {
        name: "Arad Athletic",
        sport: "football",
        userIds: aradIds,
      });
      const venue = await makeVenue(database, {
        name: "Pitch Park",
        city: "Hidd",
        sport: "football",
      });
      await playTeams(database, {
        teamIds: [arad.id, hidd.id],
        createdBy: aradIds[0]!,
        venueId: venue.id,
        sport: "football",
        sideSize: 6,
        playedAt: new Date("2026-11-01T18:00:00Z"),
      });
      await postChallenge(db, {
        teamId: hidd.id,
        sideSize: 6,
        nudgeTeamId: arad.id,
        userId: hiddIds[0]!,
        now,
      });
      const rows = await database.query.notifications.findMany({
        where: eq(notifications.type, "challenge_rematch_nudge"),
      });
      expect(rows.map((row) => row.recipientUserId)).toEqual([aradIds[0]]);
    });
  });
});

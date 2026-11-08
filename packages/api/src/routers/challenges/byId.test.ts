import { describe, expect, it } from "vitest";

import {
  makeTeam,
  makeUsers,
  makeVenue,
  withDb,
} from "#src/challenges/challenges.test-support";

import { challengeById } from "./byId";
import { postChallenge } from "./post";
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
});

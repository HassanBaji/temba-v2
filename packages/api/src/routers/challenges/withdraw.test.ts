import { describe, expect, it } from "vitest";

import {
  addPendingProposal,
  challengeRow,
  makeTeam,
  makeUsers,
  makeVenue,
  withDb,
} from "#src/challenges/challenges.test-support";

import { postChallenge } from "./post";
import { withdrawChallenge } from "./withdraw";

const now = new Date("2026-11-08T10:00:00Z");

describe("challenges.withdraw", () => {
  it("lets the Captain withdraw, passes pending Proposals over, and refuses twice and to others", async () => {
    await withDb(async ({ database, db }) => {
      const roster = await makeUsers(database, "Gooz", 6);
      const gooz = await makeTeam(database, {
        name: "Gooz FC",
        sport: "football",
        userIds: roster,
      });
      const { id } = await postChallenge(db, {
        teamId: gooz.id,
        sideSize: 5,
        userId: roster[0]!,
        now,
      });
      const other = await makeUsers(database, "Riffa", 5);
      const riffa = await makeTeam(database, {
        name: "Riffa FC",
        sport: "football",
        userIds: other,
      });
      const venue = await makeVenue(database, {
        name: "Matchday Pitches",
        city: "Manama",
        sport: "football",
      });
      const proposal = await addPendingProposal(database, {
        challengeId: id,
        teamId: riffa.id,
        proposedBy: other[0]!,
        venueId: venue.id,
        expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
      });

      await expect(
        withdrawChallenge(db, { challengeId: id, userId: roster[1]!, now }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });

      await withdrawChallenge(db, { challengeId: id, userId: roster[0]!, now });
      expect(await challengeRow(database, id)).toMatchObject({
        status: "withdrawn",
        withdrawnAt: now,
      });
      const passed = await database.query.challengeProposals.findFirst({
        where: (table, { eq }) => eq(table.id, proposal.id),
      });
      expect(passed?.status).toBe("passed_over");

      await expect(
        withdrawChallenge(db, { challengeId: id, userId: roster[0]!, now }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "This challenge is no longer open",
      });
    });
  });
});

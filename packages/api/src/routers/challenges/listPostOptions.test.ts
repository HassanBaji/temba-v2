import { describe, expect, it } from "vitest";

import {
  makeTeam,
  makeUsers,
  makeVenue,
  withDb,
} from "#src/challenges/challenges.test-support";

import { listPostOptions } from "./listPostOptions";
import { postChallenge } from "./post";

const now = new Date("2026-11-08T10:00:00Z");

describe("challenges.listPostOptions", () => {
  it("lists the viewer's Teams that may post, with Formats, and Venues per sport", async () => {
    await withDb(async ({ database, db }) => {
      const roster = await makeUsers(database, "Gooz", 6);
      const captain = roster[0]!;
      const gooz = await makeTeam(database, {
        name: "Gooz FC",
        sport: "football",
        userIds: roster,
      });
      await makeTeam(database, {
        name: "Four FC",
        sport: "football",
        userIds: [captain, ...(await makeUsers(database, "Four", 3))],
      });
      const [partner, other] = await makeUsers(database, "Seef", 2);
      const seef = await makeTeam(database, {
        name: "Seef Smashers",
        sport: "padel",
        userIds: [captain, partner!],
      });
      await makeTeam(database, {
        name: "Waiting",
        sport: "padel",
        userIds: [captain],
      });
      const busy = await makeTeam(database, {
        name: "Busy Pair",
        sport: "padel",
        userIds: [other!, captain],
      });
      await postChallenge(db, { teamId: busy.id, userId: captain, now });
      await makeTeam(database, {
        name: "Not mine FC",
        sport: "football",
        userIds: [partner!, ...(await makeUsers(database, "Else", 5))],
      });
      const court = await makeVenue(database, {
        name: "Padel Central",
        city: "Manama",
        sport: "padel",
      });
      const pitch = await makeVenue(database, {
        name: "Matchday Pitches",
        city: "Manama",
        sport: "football",
      });

      const options = await listPostOptions(db, { userId: captain, now });
      expect(
        options.teams.map((team) => [
          team.displayName,
          team.rosterCount,
          team.formatsPlayable,
        ]),
      ).toEqual([
        ["Gooz FC", 6, [5, 6]],
        ["Seef Smashers", 2, []],
      ]);
      expect(options.teams.map((team) => team.id)).toEqual([gooz.id, seef.id]);
      expect(options.venues).toEqual({
        padel: [{ id: court.id, name: "Padel Central", city: "Manama" }],
        football: [{ id: pitch.id, name: "Matchday Pitches", city: "Manama" }],
      });
      expect(options.defaultDurationMinutes).toEqual({
        padel: 90,
        football: 60,
      });
    });
  });
});

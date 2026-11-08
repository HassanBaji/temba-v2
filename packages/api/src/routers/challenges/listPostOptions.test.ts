import { describe, expect, it } from "vitest";

import {
  makeTeam,
  makeUsers,
  makeVenue,
  playTeams,
  rate,
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

  it("lists a Team whose open Challenge is past its seven days with no pending Proposal", async () => {
    await withDb(async ({ database, db }) => {
      const [ali, omar] = await makeUsers(database, "Seef", 2);
      const seef = await makeTeam(database, {
        name: "Seef Smashers",
        sport: "padel",
        userIds: [ali!, omar!],
      });
      await postChallenge(db, { teamId: seef.id, userId: ali!, now });

      const listed = async (at: Date) =>
        (await listPostOptions(db, { userId: ali!, now: at })).teams.map(
          (team) => team.id,
        );
      expect(await listed(now)).toEqual([]);
      expect(
        await listed(new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000)),
      ).toEqual([seef.id]);
    });
  });

  it("lists the Teams each has played, newest first, with the last Game's Format and Venue and the opponent's Team Level", async () => {
    await withDb(async ({ database, db }) => {
      const roster = await makeUsers(database, "Gooz", 7);
      const gooz = await makeTeam(database, {
        name: "Gooz FC",
        sport: "football",
        userIds: roster,
      });
      const aradIds = await makeUsers(database, "Arad", 6);
      const arad = await makeTeam(database, {
        name: "Arad Athletic",
        sport: "football",
        userIds: aradIds,
      });
      await rate(database, aradIds, "football", 1400);
      const hidd = await makeTeam(database, {
        name: "Hidd United",
        sport: "football",
        userIds: await makeUsers(database, "Hidd", 5),
      });
      await makeTeam(database, {
        name: "Never played",
        sport: "football",
        userIds: await makeUsers(database, "Never", 5),
      });
      const park = await makeVenue(database, {
        name: "Pitch Park",
        city: "Hidd",
        sport: "football",
      });
      const arena = await makeVenue(database, {
        name: "Arad Arena",
        city: "Muharraq",
        sport: "football",
      });
      const played = (
        teamId: string,
        venueId: string,
        day: number,
        side: number,
      ) =>
        playTeams(database, {
          teamIds: [gooz.id, teamId],
          createdBy: roster[0]!,
          venueId,
          sport: "football",
          sideSize: side,
          playedAt: new Date(`2026-11-0${day}T18:00:00Z`),
        });
      await played(arad.id, park.id, 1, 5);
      await played(hidd.id, park.id, 2, 5);
      await played(arad.id, arena.id, 3, 6);

      const [team] = (await listPostOptions(db, { userId: roster[0]!, now }))
        .teams;
      expect(team?.playedTeams).toEqual([
        {
          id: arad.id,
          displayName: "Arad Athletic",
          teamLevel: expect.objectContaining({ tenths: 28 }),
          lastGame: {
            playedAt: new Date("2026-11-03T18:00:00Z"),
            sideSize: 6,
            venueId: arena.id,
          },
        },
        {
          id: hidd.id,
          displayName: "Hidd United",
          teamLevel: null,
          lastGame: {
            playedAt: new Date("2026-11-02T18:00:00Z"),
            sideSize: 5,
            venueId: park.id,
          },
        },
      ]);
    });
  });
});

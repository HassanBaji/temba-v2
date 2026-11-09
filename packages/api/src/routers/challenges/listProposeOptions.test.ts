import { describe, expect, it } from "vitest";

import { courts } from "@repo/db/schema";

import {
  makeTeam,
  makeUsers,
  makeVenue,
  padelMatchup,
  withDb,
} from "#src/challenges/challenges.test-support";

import { listProposeOptions } from "./listProposeOptions";
import { proposeOnChallenge } from "./propose";

const now = new Date("2026-11-08T10:00:00Z");
const HOUR = 60 * 60 * 1000;

describe("challenges.listProposeOptions", () => {
  it("lists the viewer's eligible Teams, Venues with the preferred first and their Courts, and suggested slots", async () => {
    await withDb(async ({ database, db }) => {
      const match = await padelMatchup(database, now);
      const atlas = await makeVenue(database, {
        name: "Atlas Padel",
        city: "Manama",
        sport: "padel",
      });
      await database
        .insert(courts)
        .values({ venueId: match.venue.id, name: "Court 2", sport: "padel" });
      await makeVenue(database, {
        name: "Matchday Pitches",
        city: "Manama",
        sport: "football",
      });

      const options = await listProposeOptions(db, {
        challengeId: match.challenge.id,
        userId: match.proposer.rafi,
        now,
      });
      expect(options).toMatchObject({
        challengeId: match.challenge.id,
        state: "open",
        sport: "padel",
        durationMinutes: 90,
        posterTeam: { id: match.seef.id, displayName: "Seef Smashers" },
        teams: [
          {
            id: match.riffa.id,
            displayName: "Riffa Rackets",
            face: {
              sport: "padel",
              rosterCount: 2,
              teamLevel: null,
              viewerOnRoster: true,
            },
            pendingProposal: null,
          },
        ],
      });
      expect(
        options.teams[0]?.face?.members.filter((member) => member.isViewer),
      ).toHaveLength(1);
      expect(options.days).toEqual(expect.any(Array));
      expect(
        options.venues.map((venue) => [venue.name, venue.preferred]),
      ).toEqual([
        ["Padel Central", true],
        ["Atlas Padel", false],
      ]);
      expect(options.venues[0]?.courts.map((court) => court.name)).toEqual([
        "Court 1",
        "Court 2",
      ]);
      expect(atlas.id).toBe(options.venues[1]?.id);
      expect(options.slots.length).toBeGreaterThan(0);
      expect(
        options.slots.every((slot) => slot.getTime() >= now.getTime() + HOUR),
      ).toBe(true);
    });
  });

  it("carries a Team's pending Proposal for Change proposal and lists no Team for the poster", async () => {
    await withDb(async ({ database, db }) => {
      const match = await padelMatchup(database, now);
      const startsAt = new Date("2026-11-30T05:15:00Z");
      const { id } = await proposeOnChallenge(db, {
        challengeId: match.challenge.id,
        teamId: match.riffa.id,
        venueId: match.venue.id,
        courtId: match.court.id,
        startsAt,
        pricePerPlayerFils: 1500,
        userId: match.proposer.rafi,
        now,
      });

      const options = await listProposeOptions(db, {
        challengeId: match.challenge.id,
        userId: match.proposer.saad,
        now,
      });
      expect(options.teams[0]?.pendingProposal).toEqual({
        id,
        venueId: match.venue.id,
        courtId: match.court.id,
        startsAt,
        pricePerPlayerFils: 1500,
      });
      expect(options.slots).toContainEqual(startsAt);

      expect(
        (
          await listProposeOptions(db, {
            challengeId: match.challenge.id,
            userId: match.poster.ali,
            now,
          })
        ).teams,
      ).toEqual([]);
      const [loner] = await makeUsers(database, "Loner", 1);
      await makeTeam(database, {
        name: "Half a pair",
        sport: "padel",
        userIds: [loner!],
      });
      expect(
        (
          await listProposeOptions(db, {
            challengeId: match.challenge.id,
            userId: loner!,
            now,
          })
        ).teams,
      ).toEqual([]);
    });
  });
});

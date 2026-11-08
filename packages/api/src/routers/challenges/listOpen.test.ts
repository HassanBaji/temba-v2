import { describe, expect, it } from "vitest";

import {
  makeTeam,
  makeUsers,
  makeVenue,
  rate,
  withDb,
  type Fixture,
} from "#src/challenges/challenges.test-support";

import { challengeById } from "./byId";
import { listOpen } from "./listOpen";
import { postChallenge } from "./post";

const now = new Date("2026-11-08T10:00:00Z");

async function footballTeam(
  fixture: Fixture,
  name: string,
  size: number,
  mu: number | null,
) {
  const userIds = await makeUsers(fixture.database, name, size);
  const team = await makeTeam(fixture.database, {
    name,
    sport: "football",
    userIds,
  });
  if (mu != null) {
    await rate(fixture.database, userIds, "football", mu);
  }
  return { team, captain: userIds[0]! };
}

describe("challenges.listOpen eligibility", () => {
  it("greys the card for a Roster below the Format, a Team Level outside the range, or no rated member", async () => {
    await withDb(async (fixture) => {
      const gooz = await footballTeam(fixture, "Gooz FC", 12, 1400);
      const { id } = await postChallenge(fixture.db, {
        teamId: gooz.team.id,
        sideSize: 6,
        levelMinTenths: 28,
        levelMaxTenths: 48,
        userId: gooz.captain,
        now,
      });

      const short = await footballTeam(fixture, "Short FC", 5, 1400);
      const weak = await footballTeam(fixture, "Weak FC", 7, 1000);
      const unrated = await footballTeam(fixture, "Unrated FC", 6, null);
      const ready = await footballTeam(fixture, "Ready FC", 6, 1400);
      const [loner] = await makeUsers(fixture.database, "Loner", 1);

      const viewerOf = async (userId: string) => {
        const board = await listOpen(fixture.db, { userId, now });
        expect(board.challenges.map((card) => card.id)).toEqual([id]);
        const detail = await challengeById(fixture.db, {
          challengeId: id,
          userId,
          now,
        });
        return {
          card: board.challenges[0]!.viewer,
          eligible: detail.viewerEligibleTeams,
        };
      };

      expect(await viewerOf(short.captain)).toEqual({
        card: expect.objectContaining({
          eligibleTeams: [],
          ineligibleReason: "roster_short",
        }),
        eligible: [],
      });
      expect((await viewerOf(weak.captain)).card.ineligibleReason).toBe(
        "level_outside",
      );
      expect((await viewerOf(weak.captain)).eligible).toEqual([]);
      expect((await viewerOf(unrated.captain)).card.ineligibleReason).toBe(
        "no_level",
      );
      expect((await viewerOf(unrated.captain)).eligible).toEqual([]);
      expect(await viewerOf(ready.captain)).toEqual({
        card: expect.objectContaining({
          eligibleTeams: [{ id: ready.team.id, displayName: "Ready FC" }],
          ineligibleReason: null,
        }),
        eligible: [{ id: ready.team.id, displayName: "Ready FC" }],
      });
      expect((await viewerOf(loner!)).card.ineligibleReason).toBe("no_team");
      expect(await viewerOf(gooz.captain)).toEqual({
        card: expect.objectContaining({
          ineligibleReason: "own",
          actsForPoster: true,
        }),
        eligible: [],
      });
    });
  });

  it("reads the poster Team, its Team Level, record and first six members", async () => {
    await withDb(async (fixture) => {
      const gooz = await footballTeam(fixture, "Gooz FC", 12, 1400);
      const venue = await makeVenue(fixture.database, {
        name: "Matchday Pitches",
        city: "Manama",
        sport: "football",
      });
      await postChallenge(fixture.db, {
        teamId: gooz.team.id,
        sideSize: 6,
        venueIds: [venue.id],
        userId: gooz.captain,
        now,
      });
      const [card] = (await listOpen(fixture.db, { userId: gooz.captain, now }))
        .challenges;
      expect(card).toMatchObject({
        state: "open",
        sport: "football",
        sideSize: 6,
        proposalCount: 0,
        venues: [{ id: venue.id, name: "Matchday Pitches", city: "Manama" }],
        team: {
          id: gooz.team.id,
          displayName: "Gooz FC",
          rosterCount: 12,
          teamLevel: { tenths: 28, level: "2.8", band: "C" },
          record: { gamesPlayed: 0, wins: 0, draws: 0, losses: 0 },
        },
        postedBy: { id: gooz.captain, name: "Gooz FC 1" },
      });
      expect(card?.team.members).toHaveLength(6);
    });
  });

  it("drops a Challenge past its seven days from the board before the job runs", async () => {
    await withDb(async (fixture) => {
      const gooz = await footballTeam(fixture, "Gooz FC", 6, null);
      const { id } = await postChallenge(fixture.db, {
        teamId: gooz.team.id,
        sideSize: 6,
        userId: gooz.captain,
        now,
      });
      const later = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
      expect(
        (await listOpen(fixture.db, { userId: gooz.captain, now: later }))
          .challenges,
      ).toEqual([]);
      const detail = await challengeById(fixture.db, {
        challengeId: id,
        userId: gooz.captain,
        now: later,
      });
      expect(detail.state).toBe("expired");
    });
  });
});

describe("challenges.listOpen filters", () => {
  it("filters by sport, Level overlap, Venue city and day, keeping the open-ended ones", async () => {
    await withDb(async (fixture) => {
      const manama = await makeVenue(fixture.database, {
        name: "Matchday Pitches",
        city: "Manama",
        sport: "football",
      });
      const muharraq = await makeVenue(fixture.database, {
        name: "Arad Arena",
        city: "Muharraq",
        sport: "football",
      });
      const [ali, omar] = await makeUsers(fixture.database, "Seef", 2);
      const seef = await makeTeam(fixture.database, {
        name: "Seef Smashers",
        sport: "padel",
        userIds: [ali!, omar!],
      });
      const padel = await postChallenge(fixture.db, {
        teamId: seef.id,
        userId: ali!,
        now,
      });
      const friday = await footballTeam(fixture, "Friday FC", 6, null);
      const fridayChallenge = await postChallenge(fixture.db, {
        teamId: friday.team.id,
        sideSize: 6,
        levelMinTenths: 28,
        levelMaxTenths: 48,
        venueIds: [manama.id],
        days: ["fri"],
        userId: friday.captain,
        now: new Date(now.getTime() + 1000),
      });
      const saturday = await footballTeam(fixture, "Saturday FC", 6, null);
      const saturdayChallenge = await postChallenge(fixture.db, {
        teamId: saturday.team.id,
        sideSize: 5,
        levelMinTenths: 49,
        levelMaxTenths: 62,
        venueIds: [muharraq.id],
        days: ["sat"],
        userId: saturday.captain,
        now: new Date(now.getTime() + 2000),
      });

      const ids = async (filters: Parameters<typeof listOpen>[1]["filters"]) =>
        (
          await listOpen(fixture.db, { userId: ali!, filters, now })
        ).challenges.map((card) => card.id);

      const all = await listOpen(fixture.db, { userId: ali!, now });
      expect(all.challenges.map((card) => card.id)).toEqual([
        saturdayChallenge.id,
        fridayChallenge.id,
        padel.id,
      ]);
      expect(all.areas).toEqual(["Manama", "Muharraq"]);
      expect(await ids({ sport: "football" })).toEqual([
        saturdayChallenge.id,
        fridayChallenge.id,
      ]);
      expect(await ids({ levelMinTenths: 28, levelMaxTenths: 34 })).toEqual([
        fridayChallenge.id,
        padel.id,
      ]);
      expect(await ids({ area: "manama" })).toEqual([
        fridayChallenge.id,
        padel.id,
      ]);
      expect(await ids({ weekday: "fri" })).toEqual([
        fridayChallenge.id,
        padel.id,
      ]);
      expect(await ids({ sport: "football", weekday: "sat" })).toEqual([
        saturdayChallenge.id,
      ]);
    });
  });
});

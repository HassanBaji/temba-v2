import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  challengeProposals,
  challenges,
  games,
  gameTeams,
} from "@repo/db/schema";

import {
  addOpenChallenge,
  addPendingProposal,
  makeTeam,
  makeUsers,
  makeVenue,
  withDb,
  type Fixture,
} from "#src/challenges/challenges.test-support";

import { listMine } from "./listMine";
import { postChallenge } from "./post";
import { proposeOnChallenge } from "./propose";

const now = new Date("2026-11-08T10:00:00Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

async function pair(fixture: Fixture, name: string, userIds: string[]) {
  return makeTeam(fixture.database, { name, sport: "padel", userIds });
}

/** A Challenge confirmed on a Proposal starting at `startsAt`, with its Game. */
async function confirmedChallenge(
  fixture: Fixture,
  args: {
    posterTeamId: string;
    proposingTeamId: string;
    userId: string;
    venueId: string;
    startsAt: Date;
  },
) {
  const [challenge] = await fixture.database
    .insert(challenges)
    .values({
      teamId: args.posterTeamId,
      postedBy: args.userId,
      sport: "padel",
      status: "confirmed",
      durationMinutes: 90,
      expiresAt: args.startsAt,
    })
    .returning();
  const [proposal] = await fixture.database
    .insert(challengeProposals)
    .values({
      challengeId: challenge!.id,
      teamId: args.proposingTeamId,
      proposedBy: args.userId,
      status: "confirmed",
      venueId: args.venueId,
      startsAt: args.startsAt,
      expiresAt: args.startsAt,
    })
    .returning();
  const [game] = await fixture.database
    .insert(games)
    .values({
      venueId: args.venueId,
      createdBy: args.userId,
      challengeId: challenge!.id,
      windowStart: args.startsAt,
      windowEnd: new Date(args.startsAt.getTime() + 90 * 60 * 1000),
    })
    .returning({ id: games.id });
  await fixture.database.insert(gameTeams).values([
    { gameId: game!.id, teamId: args.posterTeamId, sideIndex: 1 },
    { gameId: game!.id, teamId: args.proposingTeamId, sideIndex: 2 },
  ]);
  await fixture.database
    .update(challenges)
    .set({ confirmedProposalId: proposal!.id, gameId: game!.id })
    .where(eq(challenges.id, challenge!.id));
  return challenge!;
}

describe("challenges.listMine", () => {
  it("lists the open Challenges of the viewer's Teams and counts the board", async () => {
    await withDb(async ({ database, db }) => {
      const [ali, omar, rafi, saad, nobody] = await makeUsers(
        database,
        "Player",
        5,
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
      const ours = await postChallenge(db, {
        teamId: seef.id,
        userId: ali!,
        now,
      });
      await postChallenge(db, { teamId: riffa.id, userId: rafi!, now });

      const mine = await listMine(db, { userId: omar!, now });
      expect(mine.counts).toEqual({ open: 2, mine: 1 });
      expect(mine.posted).toEqual([
        expect.objectContaining({
          id: ours.id,
          team: expect.objectContaining({ displayName: "Seef Smashers" }),
          proposalCount: 0,
        }),
      ]);
      expect(mine.items.map((item) => item.key)).toEqual([`posted:${ours.id}`]);

      expect(await listMine(db, { userId: nobody!, now })).toEqual({
        counts: { open: 2, mine: 0 },
        posted: [],
        items: [],
      });
      const later = new Date(now.getTime() + 8 * DAY);
      expect(await listMine(db, { userId: omar!, now: later })).toEqual({
        counts: { open: 0, mine: 0 },
        posted: [],
        items: [],
      });
    });
  });

  it("orders waiting on you, then posted, then my pending, then accepted, then played, and leaves out what expired", async () => {
    await withDb(async (fixture) => {
      const { database, db } = fixture;
      const [me, mate, other, x1, x2, y1, y2, z1, z2, w1, w2] = await makeUsers(
        database,
        "Player",
        11,
      );
      const mine = await pair(fixture, "Me and Mate", [me!, mate!]);
      const second = await pair(fixture, "Me and Other", [me!, other!]);
      const xTeam = await pair(fixture, "X Pair", [x1!, x2!]);
      const yTeam = await pair(fixture, "Y Pair", [y1!, y2!]);
      const zTeam = await pair(fixture, "Z Pair", [z1!, z2!]);
      const wTeam = await pair(fixture, "W Pair", [w1!, w2!]);
      const venue = await makeVenue(database, {
        name: "Padel Central",
        city: "Manama",
        sport: "padel",
      });
      const inTwoDays = new Date(now.getTime() + 2 * DAY);

      const posted = await postChallenge(db, {
        teamId: mine.id,
        userId: me!,
        now: new Date(now.getTime() - DAY),
      });
      const waiting = await proposeOnChallenge(db, {
        challengeId: posted.id,
        teamId: xTeam.id,
        venueId: venue.id,
        startsAt: inTwoDays,
        userId: x1!,
        now,
      });
      const yChallenge = await postChallenge(db, {
        teamId: yTeam.id,
        userId: y1!,
        now: new Date(now.getTime() - DAY),
      });
      const pending = await proposeOnChallenge(db, {
        challengeId: yChallenge.id,
        teamId: second.id,
        venueId: venue.id,
        startsAt: inTwoDays,
        userId: other!,
        now,
      });
      const zChallenge = await postChallenge(db, {
        teamId: zTeam.id,
        userId: z1!,
        now: new Date(now.getTime() - 3 * DAY),
      });
      await addPendingProposal(database, {
        challengeId: zChallenge.id,
        teamId: second.id,
        proposedBy: me!,
        venueId: venue.id,
        expiresAt: new Date(now.getTime() - HOUR),
      });
      await addOpenChallenge(database, {
        teamId: second.id,
        postedBy: me!,
        sport: "padel",
        postedAt: new Date(now.getTime() - 8 * DAY),
      });
      const accepted = await confirmedChallenge(fixture, {
        posterTeamId: zTeam.id,
        proposingTeamId: second.id,
        userId: z1!,
        venueId: venue.id,
        startsAt: new Date(now.getTime() + 3 * DAY),
      });
      const played = await confirmedChallenge(fixture, {
        posterTeamId: mine.id,
        proposingTeamId: wTeam.id,
        userId: me!,
        venueId: venue.id,
        startsAt: new Date(now.getTime() - 2 * DAY),
      });

      const list = await listMine(db, { userId: me!, now });
      expect(list.items.map((item) => item.key)).toEqual([
        `waiting:${waiting.id}`,
        `posted:${posted.id}`,
        `pending:${pending.id}`,
        `accepted:${accepted.id}`,
        `played:${played.id}`,
      ]);
      expect(list.counts.mine).toBe(4);
      expect(list.items[0]).toMatchObject({
        kind: "waiting",
        challengeId: posted.id,
        posterTeam: { id: mine.id, displayName: "Me and Mate" },
        proposal: { team: { displayName: "X Pair" }, startsAt: inTwoDays },
      });
      expect(list.items[2]).toMatchObject({
        kind: "pending",
        posterTeam: { id: yTeam.id, displayName: "Y Pair" },
        proposal: { team: { id: second.id } },
      });
      expect(list.items[3]).toMatchObject({
        kind: "accepted",
        team: { id: second.id },
        opponent: { id: zTeam.id, displayName: "Z Pair" },
      });
      expect(list.items[4]).toMatchObject({
        kind: "played",
        team: { id: mine.id },
        opponent: { id: wTeam.id },
      });
    });
  });
});

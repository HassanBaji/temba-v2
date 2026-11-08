import { describe, expect, it } from "vitest";

import {
  makeTeam,
  makeUsers,
  withDb,
} from "#src/challenges/challenges.test-support";

import { listMine } from "./listMine";
import { postChallenge } from "./post";

const now = new Date("2026-11-08T10:00:00Z");

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

      expect(await listMine(db, { userId: nobody!, now })).toEqual({
        counts: { open: 2, mine: 0 },
        posted: [],
      });
      const later = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
      expect(await listMine(db, { userId: omar!, now: later })).toEqual({
        counts: { open: 0, mine: 0 },
        posted: [],
      });
    });
  });
});

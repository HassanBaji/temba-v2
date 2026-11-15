import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GroupSportEnum,
  games,
  groupMembers,
  groupSeasons,
  groups,
} from "@repo/db/schema";
import { createPgliteDb } from "@repo/db/testing";

import {
  insertUser,
  setUpMatch,
} from "#src/ratings/group-rated-match.test-support";
import { completeMatch } from "#src/routers/games/completeMatch";
import { myStandings } from "#src/routers/groups/myStandings";

const unrated = { rated: false, groupRated: false };

describe("groups.myStandings", () => {
  it("reads won, drawn, lost and place for the current Season of each of the caller's Groups", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const now = new Date();
      const first = await setUpMatch(db, unrated);
      await completeMatch(db, {
        gameId: first.gameId,
        matchId: first.matchId,
        userId: first.a.id,
      });
      const [season] = await db
        .insert(groupSeasons)
        .values({
          groupId: first.groupId,
          name: "Season 3",
          startsOn: new Date(now.getTime() - 30 * 86_400_000)
            .toISOString()
            .slice(0, 10),
          endsOn: new Date(now.getTime() + 30 * 86_400_000)
            .toISOString()
            .slice(0, 10),
          createdBy: first.a.id,
        })
        .returning({ id: groupSeasons.id });
      await db
        .update(games)
        .set({ seasonId: season!.id })
        .where(eq(games.id, first.gameId));
      const outsideSeason = await setUpMatch(db, unrated, {
        players: [first.a, first.b, first.c, first.d],
        groupId: first.groupId,
        venueId: first.venueId,
      });
      await completeMatch(db, {
        gameId: outsideSeason.gameId,
        matchId: outsideSeason.matchId,
        userId: first.a.id,
      });

      const rows = await myStandings(db as never, {
        userId: first.c.id,
        sport: "padel",
        now,
      });

      expect(rows).toEqual([
        {
          groupId: first.groupId,
          name: "Crew",
          imageUrl: null,
          seasonId: season!.id,
          seasonName: "Season 3",
          position: 3,
          memberCount: 4,
          won: 0,
          drawn: 0,
          lost: 1,
        },
      ]);
      const winner = await myStandings(db as never, {
        userId: first.a.id,
        sport: "padel",
        now,
      });
      expect(winner[0]).toMatchObject({ position: 1, won: 1, lost: 0 });
    } finally {
      await close();
    }
  });

  it("reads all-time for a Group with no Season, unranked before a result", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const played = await setUpMatch(db, unrated);
      const newcomer = await insertUser(db, "newcomer");
      await db
        .insert(groupMembers)
        .values({ groupId: played.groupId, userId: newcomer.id });
      await completeMatch(db, {
        gameId: played.gameId,
        matchId: played.matchId,
        userId: played.a.id,
      });

      const rows = await myStandings(db as never, {
        userId: newcomer.id,
        sport: "padel",
      });

      expect(rows[0]).toMatchObject({
        seasonId: null,
        seasonName: null,
        position: null,
        memberCount: 5,
        won: 0,
        lost: 0,
      });
    } finally {
      await close();
    }
  });

  it("lists only live Groups of the asked sport", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const me = await insertUser(db, "me");
      const made = await db
        .insert(groups)
        .values([
          { name: "Tuesday Night Padel", createdBy: me.id },
          { name: "Padel games", createdBy: me.id },
          {
            name: "Thursday Football",
            createdBy: me.id,
            sport: GroupSportEnum.FOOTBALL,
          },
          { name: "Old padel", createdBy: me.id, deletedAt: new Date() },
        ])
        .returning({ id: groups.id });
      await db
        .insert(groupMembers)
        .values(made.map((group) => ({ groupId: group.id, userId: me.id })));

      const padel = await myStandings(db as never, {
        userId: me.id,
        sport: "padel",
      });
      expect(padel.map((row) => row.name)).toEqual([
        "Padel games",
        "Tuesday Night Padel",
      ]);
      const football = await myStandings(db as never, {
        userId: me.id,
        sport: "football",
      });
      expect(football.map((row) => row.name)).toEqual(["Thursday Football"]);
    } finally {
      await close();
    }
  });
});

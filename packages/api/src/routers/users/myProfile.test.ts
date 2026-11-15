import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  groupLevelOverrides,
  groupMembers,
  groups,
  user,
} from "@repo/db/schema";
import { createPgliteDb } from "@repo/db/testing";

import {
  insertUser,
  setUpMatch,
} from "#src/ratings/group-rated-match.test-support";
import { writeLegacyGroupLevelsFor } from "#src/ratings/legacy-group-level.test-support";
import { completeMatch } from "#src/routers/games/completeMatch";
import { loadMyGroupLevels } from "#src/routers/ratings/myGroupLevels";
import {
  loadMyProfile,
  unbeatenRuns,
  winsToNextBand,
} from "#src/routers/users/myProfile";
import type { CountedMatch } from "#src/routers/users/playerProfile";
import { loadPlayerProfile } from "#src/routers/users/playerProfile";
import { writeFootballPreferences } from "#src/routers/users/setFootballPreferences";
import { writeProfileDetails } from "#src/routers/users/setProfileDetails";
import { muFromLevel } from "@repo/domain/level";

type Db = Parameters<typeof loadMyProfile>[0];

describe("users.myProfile", () => {
  it("reads General and one Group's scope from Group Levels written before they were retired", async () => {
    const { db, close } = await createPgliteDb();
    const database = db as unknown as Db;
    try {
      const first = await setUpMatch(db, { rated: true, groupRated: true });
      await writeLegacyGroupLevelsFor(db as never, first);
      await completeMatch(database as never, {
        gameId: first.gameId,
        matchId: first.matchId,
        userId: first.a.id,
      });
      const second = await setUpMatch(
        db,
        { rated: false, groupRated: true },
        {
          players: [first.a, first.b, first.c, first.d],
          groupId: first.groupId,
          venueId: first.venueId,
        },
      );
      await writeLegacyGroupLevelsFor(db as never, {
        ...second,
        groupId: first.groupId,
      });
      await completeMatch(database as never, {
        gameId: second.gameId,
        matchId: second.matchId,
        userId: first.a.id,
      });

      const general = await loadMyProfile(database, {
        userId: first.a.id,
        sport: "padel",
      });
      expect(general.group).toBeNull();
      expect(general.stats.played).toBe(2);
      expect(general.stats.won).toBe(2);
      expect(general.ratedMatchCount).toBe(1);
      expect(general.level?.history).toHaveLength(2);
      expect(general.lastTen).toHaveLength(2);
      expect(general.lastTen.filter((row) => row.delta !== null)).toHaveLength(
        1,
      );
      expect(general.partners[0]).toMatchObject({
        userId: first.b.id,
        won: 2,
        lost: 0,
      });
      expect(general.recent[0]?.opponents).toHaveLength(2);
      expect(general.stats.sets).toEqual({ won: 2, lost: 0 });

      const inGroup = await loadMyProfile(database, {
        userId: first.a.id,
        sport: "padel",
        groupId: first.groupId,
      });
      expect(inGroup.group?.id).toBe(first.groupId);
      expect(inGroup.ratedMatchCount).toBe(2);
      expect(inGroup.level?.history).toHaveLength(3);
      expect(inGroup.lastTen.every((row) => row.delta !== null)).toBe(true);
    } finally {
      await close();
    }
  });

  it("refuses a Group the User is not in", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const outsider = await insertUser(db, "outsider");
      const [group] = await db
        .insert(groups)
        .values({ name: "Other", createdBy: outsider.id })
        .returning();
      const viewer = await insertUser(db, "viewer");
      await expect(
        loadMyProfile(db as unknown as Db, {
          userId: viewer.id,
          sport: "padel",
          groupId: group?.id,
        }),
      ).rejects.toThrow("Group not found");
    } finally {
      await close();
    }
  });
});

describe("ratings.myGroupLevels", () => {
  it("lists Group Levels written before they were retired, with rank, count and who set them", async () => {
    const { db, close } = await createPgliteDb();
    const database = db as unknown as Db;
    try {
      const played = await setUpMatch(db, { rated: false, groupRated: true });
      await completeMatch(database as never, {
        gameId: played.gameId,
        matchId: played.matchId,
        userId: played.a.id,
      });
      await writeLegacyGroupLevelsFor(db as never, played);

      const levels = await loadMyGroupLevels(database as never, {
        userId: played.a.id,
        sport: "padel",
      });
      expect(levels).toHaveLength(1);
      expect(levels[0]).toMatchObject({
        groupId: played.groupId,
        ratedMatchCount: 1,
        rank: 1,
        rankedCount: 4,
        provisional: true,
        setBy: null,
        differenceFromGeneral: null,
      });

      await db.insert(groupLevelOverrides).values({
        userId: played.c.id,
        groupId: played.groupId,
        setByUserId: played.a.id,
        muBefore: muFromLevel(3),
        phiBefore: 250,
        sigmaBefore: 0.06,
        levelBandBefore: "C2",
        muAfter: muFromLevel(5),
        phiAfter: 100,
        sigmaAfter: 0.06,
        levelBandAfter: "B3",
      });
      const cLevels = await loadMyGroupLevels(database as never, {
        userId: played.c.id,
        sport: "padel",
      });
      expect(cLevels[0]).toMatchObject({ setBy: { name: "a" } });
    } finally {
      await close();
    }
  });
});

describe("winsToNextBand", () => {
  it("divides the gap by the recent win gains", () => {
    expect(winsToNextBand(3.21, "C2", [0.04, 0.04, 0.05])).toBe(7);
  });

  it("is null without a recent win", () => {
    expect(winsToNextBand(3.21, "C2", [-0.03])).toBeNull();
  });
});

function footballMatch(us: number, them: number): CountedMatch {
  return {
    userSlot: 1,
    sets: [{ slot1GamesWon: us, slot2GamesWon: them }],
  } as CountedMatch;
}

describe("unbeatenRuns", () => {
  it("counts the run going now and the longest run without a loss", () => {
    const newest = [
      footballMatch(2, 2),
      footballMatch(3, 1),
      footballMatch(0, 1),
      footballMatch(1, 0),
      footballMatch(1, 1),
      footballMatch(4, 0),
      footballMatch(0, 2),
    ];
    expect(unbeatenRuns(newest)).toEqual({ current: 2, best: 3 });
  });

  it("is zero when the newest Match was lost", () => {
    expect(unbeatenRuns([footballMatch(0, 1), footballMatch(2, 0)])).toEqual({
      current: 0,
      best: 1,
    });
  });
});

describe("Your details", () => {
  it("saves details and refuses someone under 16", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const me = await insertUser(db, "me");
      await writeProfileDetails(db as never, {
        userId: me.id,
        firstName: "Hassan",
        lastName: "Haji",
        gender: "male",
        birthDate: "1996-03-14",
        homeArea: "Seef",
        nationality: "BH",
      });
      const row = await db.query.user.findFirst({ where: eq(user.id, me.id) });
      expect(row).toMatchObject({
        name: "Hassan Haji",
        gender: "male",
        birthDate: "1996-03-14",
        homeArea: "Seef",
        nationality: "BH",
      });

      await expect(
        writeProfileDetails(db as never, {
          userId: me.id,
          firstName: "Hassan",
          lastName: "Haji",
          gender: null,
          birthDate: "2015-01-01",
          homeArea: null,
          nationality: null,
          now: new Date("2026-11-04T10:00:00Z"),
        }),
      ).rejects.toThrow("16 or older");
    } finally {
      await close();
    }
  });
});

describe("Football preferences", () => {
  it("writes role and position after onboarding", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const me = await insertUser(db, "me");
      await writeFootballPreferences(db as never, {
        userId: me.id,
        role: "outfield",
        position: "mid",
      });
      const row = await db.query.user.findFirst({ where: eq(user.id, me.id) });
      expect(row).toMatchObject({
        preferredFootballRole: "outfield",
        preferredFootballPosition: "mid",
      });
    } finally {
      await close();
    }
  });
});

describe("Match history visibility", () => {
  it("hides form and stats from a viewer outside the owner's Groups", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const played = await setUpMatch(db, { rated: true, groupRated: true });
      await completeMatch(db as never, {
        gameId: played.gameId,
        matchId: played.matchId,
        userId: played.a.id,
      });
      // b shares a Game and the Group with a; drop b from the Group so the
      // shared Game alone lets b open a's profile.
      await db.delete(groupMembers).where(eq(groupMembers.userId, played.b.id));
      await db
        .update(user)
        .set({ matchHistoryVisibility: "group_members" })
        .where(eq(user.id, played.a.id));

      const shown = await loadPlayerProfile(db as never, {
        viewerId: played.b.id,
        playerId: played.a.id,
      });
      expect(shown.historyHidden).toBe(true);
      expect(shown.lastMatches).toHaveLength(0);
      expect(shown.rating).not.toBeNull();

      await db
        .update(user)
        .set({ matchHistoryVisibility: "everyone" })
        .where(eq(user.id, played.a.id));
      const open = await loadPlayerProfile(db as never, {
        viewerId: played.b.id,
        playerId: played.a.id,
      });
      expect(open.historyHidden).toBe(false);
      expect(open.lastMatches).toHaveLength(1);
    } finally {
      await close();
    }
  });
});

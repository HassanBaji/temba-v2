import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameSportEnum,
  GroupSportEnum,
  MatchStatusEnum,
  gamePlayers,
  games,
  groupMembers,
  groups,
  levelOverrides,
  matches,
  ratings,
  user,
  venueVerifiers,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { listNotifications } from "#src/routers/notifications/list";
import {
  setLevelAsVerifier,
  setLevelAsVerifierInputSchema,
} from "#src/routers/ratings/setLevelAsVerifier";
import { loadPlayerProfile } from "#src/routers/users/playerProfile";
import { addVerifier } from "#src/routers/venues/addVerifier";
import { listVerifiers } from "#src/routers/venues/listVerifiers";
import { removeVerifier } from "#src/routers/venues/removeVerifier";
import { ovrFromMu } from "@repo/domain/football-ovr";
import { muFromLevel } from "@repo/domain/level";
import { notificationCopy } from "@repo/domain/notification-copy";

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({
      name,
      email: `${name.toLowerCase()}-${crypto.randomUUID()}@example.com`,
    })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertVenue(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(venues)
    .values({ name, city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

/** A Game at the Venue with the players seated and one Match in `status`. */
async function playAt(
  database: TestDatabase,
  args: {
    venueId: string;
    playerIds: string[];
    status?: MatchStatusEnum;
    cancelled?: boolean;
  },
) {
  const [creatorId] = args.playerIds;
  if (!creatorId) {
    throw new Error("A Game needs a player");
  }
  const [game] = await database
    .insert(games)
    .values({
      venueId: args.venueId,
      createdBy: creatorId,
      sport: GameSportEnum.PADEL,
      cancelledAt: args.cancelled ? new Date() : null,
    })
    .returning({ id: games.id });
  if (!game) {
    throw new Error("Failed to insert game");
  }
  await database
    .insert(gamePlayers)
    .values(args.playerIds.map((userId) => ({ gameId: game.id, userId })));
  await database.insert(matches).values({
    gameId: game.id,
    status: args.status ?? MatchStatusEnum.COMPLETED,
  });
  return game;
}

async function clubGroupMember(
  database: TestDatabase,
  args: { venueId: string; ownerId: string; memberId: string },
) {
  const [group] = await database
    .insert(groups)
    .values({
      name: "Club crew",
      createdBy: args.ownerId,
      venueId: args.venueId,
    })
    .returning({ id: groups.id });
  if (!group) {
    throw new Error("Failed to insert group");
  }
  await database.insert(groupMembers).values([
    { groupId: group.id, userId: args.ownerId },
    { groupId: group.id, userId: args.memberId },
  ]);
  return group;
}

async function setUp(database: TestDatabase) {
  const operator = await insertUser(database, "Operator");
  const verifier = await insertUser(database, "Yaser");
  const player = await insertUser(database, "Player");
  const venueA = await insertVenue(database, "Fantasy FC");
  const venueB = await insertVenue(database, "Other Club");
  await addVerifier(database, {
    venueId: venueA.id,
    userId: verifier.id,
    kind: "coach",
    grantedByUserId: operator.id,
  });
  return { operator, verifier, player, venueA, venueB };
}

describe("venues verifier doors", () => {
  it("grants, lists and removes a Verifier, and refuses a second grant", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { operator, verifier, venueA } = await setUp(db);
      expect(await listVerifiers(db, { venueId: venueA.id })).toMatchObject([
        { userId: verifier.id, name: "Yaser", kind: "coach" },
      ]);
      await expect(
        addVerifier(db, {
          venueId: venueA.id,
          userId: verifier.id,
          kind: "referee",
          grantedByUserId: operator.id,
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });

      await removeVerifier(db, { venueId: venueA.id, userId: verifier.id });
      expect(await listVerifiers(db, { venueId: venueA.id })).toEqual([]);
    } finally {
      await close();
    }
  });

  it("refuses an unknown Venue or User", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { operator, verifier, venueA } = await setUp(db);
      await expect(
        addVerifier(db, {
          venueId: crypto.randomUUID(),
          userId: verifier.id,
          kind: "coach",
          grantedByUserId: operator.id,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        addVerifier(db, {
          venueId: venueA.id,
          userId: crypto.randomUUID(),
          kind: "coach",
          grantedByUserId: operator.id,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        listVerifiers(db, { venueId: crypto.randomUUID() }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    } finally {
      await close();
    }
  });
});

describe("setLevelAsVerifier", () => {
  it("refuses a player who never played at the Verifier's Venue", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { verifier, player, venueA, venueB } = await setUp(db);
      await playAt(db, { venueId: venueB.id, playerIds: [player.id] });
      await playAt(db, {
        venueId: venueA.id,
        playerIds: [player.id],
        status: MatchStatusEnum.PENDING,
      });
      await playAt(db, {
        venueId: venueA.id,
        playerIds: [player.id],
        cancelled: true,
      });

      await expect(
        setLevelAsVerifier(db, {
          verifierUserId: verifier.id,
          targetUserId: player.id,
          sport: "padel",
          levelTenths: 45,
          reason: "new_to_group",
        }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message:
          "You can calibrate only a player who played at your venue or belongs to one of its club groups",
      });
      expect(await db.select().from(levelOverrides)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("refuses the Verifier's own Level, a User who is no Verifier, and a removed Verifier", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { verifier, player, venueA } = await setUp(db);
      await playAt(db, {
        venueId: venueA.id,
        playerIds: [player.id, verifier.id],
      });
      const stranger = await insertUser(db, "Stranger");

      await expect(
        setLevelAsVerifier(db, {
          verifierUserId: verifier.id,
          targetUserId: verifier.id,
          sport: "padel",
          levelTenths: 45,
          reason: "new_to_group",
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(
        setLevelAsVerifier(db, {
          verifierUserId: stranger.id,
          targetUserId: player.id,
          sport: "padel",
          levelTenths: 45,
          reason: "new_to_group",
        }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Only a verifier can calibrate a Level",
      });

      await removeVerifier(db, { venueId: venueA.id, userId: verifier.id });
      await expect(
        setLevelAsVerifier(db, {
          verifierUserId: verifier.id,
          targetUserId: player.id,
          sport: "padel",
          levelTenths: 45,
          reason: "new_to_group",
        }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Only a verifier can calibrate a Level",
      });
      expect(await db.select().from(levelOverrides)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("refuses input with no reason at the boundary", () => {
    const input = {
      userId: crypto.randomUUID(),
      sport: "padel",
      levelTenths: 45,
    };
    const parsed = setLevelAsVerifierInputSchema.safeParse(input);
    expect(
      parsed.success ? undefined : parsed.error.flatten().fieldErrors.reason,
    ).toBeDefined();
    expect(
      setLevelAsVerifierInputSchema.safeParse({
        ...input,
        reason: "new_to_group",
      }).success,
    ).toBe(true);
  });

  it("calibrates a padel Level of a player who played at the Venue and tells them who and where", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { verifier, player, venueA } = await setUp(db);
      await playAt(db, { venueId: venueA.id, playerIds: [player.id] });

      const result = await setLevelAsVerifier(db, {
        verifierUserId: verifier.id,
        targetUserId: player.id,
        sport: "padel",
        levelTenths: 45,
        reason: "plays_above_results",
        note: "Assessed over two sessions.",
      });
      expect(result.venue).toEqual({ id: venueA.id, name: "Fantasy FC" });

      const rating = await db.query.ratings.findFirst({
        where: and(
          eq(ratings.userId, player.id),
          eq(ratings.sport, GroupSportEnum.PADEL),
        ),
      });
      expect(rating?.mu).toBeCloseTo(muFromLevel(4.5));
      const [override] = await db
        .select()
        .from(levelOverrides)
        .where(eq(levelOverrides.userId, player.id));
      expect(override).toMatchObject({
        setByUserId: verifier.id,
        setByRole: "verifier",
        groupId: null,
        venueId: venueA.id,
        reason: "plays_above_results",
        note: "Assessed over two sessions.",
      });

      const { items } = await listNotifications(db, { userId: player.id });
      const item = items[0];
      expect(item?.type).toBe("level_set");
      expect(item?.levelSet?.venue).toEqual({
        id: venueA.id,
        name: "Fantasy FC",
      });
      const copy = item ? notificationCopy(item, "en") : null;
      expect(copy?.title.map((part) => part.text).join("")).toBe(
        "Yaser (Fantasy FC) calibrated your Level to B- 4.5",
      );
      expect(copy?.subline).toBe(
        "Plays above results: “Assessed over two sessions.”",
      );
    } finally {
      await close();
    }
  });

  it("calibrates football in OVR for a member of one of the Venue's Club Groups", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { verifier, player, venueA } = await setUp(db);
      const owner = await insertUser(db, "Owner");
      await clubGroupMember(db, {
        venueId: venueA.id,
        ownerId: owner.id,
        memberId: player.id,
      });

      const result = await setLevelAsVerifier(db, {
        verifierUserId: verifier.id,
        targetUserId: player.id,
        sport: "football",
        ovr: 71,
        reason: "plays_above_results",
      });
      expect(result.level.ovr).toBe("71");
      const rating = await db.query.ratings.findFirst({
        where: and(
          eq(ratings.userId, player.id),
          eq(ratings.sport, GroupSportEnum.FOOTBALL),
        ),
      });
      expect(Math.round(ovrFromMu(rating?.mu ?? 0))).toBe(71);

      await expect(
        setLevelAsVerifier(db, {
          verifierUserId: verifier.id,
          targetUserId: player.id,
          sport: "padel",
          ovr: 71,
          reason: "plays_above_results",
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    } finally {
      await close();
    }
  });

  it("names the Venue where the player qualifies when the Verifier holds two", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { operator, verifier, player, venueB } = await setUp(db);
      await db.insert(venueVerifiers).values({
        venueId: venueB.id,
        userId: verifier.id,
        kind: "referee",
        grantedByUserId: operator.id,
      });
      await playAt(db, { venueId: venueB.id, playerIds: [player.id] });

      const result = await setLevelAsVerifier(db, {
        verifierUserId: verifier.id,
        targetUserId: player.id,
        sport: "padel",
        levelTenths: 30,
        reason: "new_to_group",
      });
      expect(result.venue).toEqual({ id: venueB.id, name: "Other Club" });
    } finally {
      await close();
    }
  });
});

describe("users.playerProfile viewerMayCalibrate", () => {
  it("is true only for a Verifier who may calibrate the player", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { verifier, player, venueA, venueB } = await setUp(db);
      const other = await insertUser(db, "Other");
      await playAt(db, {
        venueId: venueA.id,
        playerIds: [player.id, verifier.id, other.id],
      });

      const asVerifier = await loadPlayerProfile(db, {
        viewerId: verifier.id,
        playerId: player.id,
      });
      expect(asVerifier.viewerMayCalibrate).toBe(true);

      const own = await loadPlayerProfile(db, {
        viewerId: verifier.id,
        playerId: verifier.id,
      });
      expect(own.viewerMayCalibrate).toBe(false);

      const asOther = await loadPlayerProfile(db, {
        viewerId: other.id,
        playerId: player.id,
      });
      expect(asOther.viewerMayCalibrate).toBe(false);

      await removeVerifier(db, { venueId: venueA.id, userId: verifier.id });
      await addVerifier(db, {
        venueId: venueB.id,
        userId: verifier.id,
        kind: "club_staff",
        grantedByUserId: null,
      });
      const elsewhere = await loadPlayerProfile(db, {
        viewerId: verifier.id,
        playerId: player.id,
      });
      expect(elsewhere.viewerMayCalibrate).toBe(false);
    } finally {
      await close();
    }
  });
});

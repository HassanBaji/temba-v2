import type { UserWebhookEvent } from "@clerk/backend/webhooks";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GamePositionEnum,
  GameRegistrationModeEnum,
  MatchStatusEnum,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  games,
  groupMembers,
  groups,
  matchSets,
  matches,
  notifications,
  ratings,
  user,
  venues,
} from "@repo/db/schema";

import {
  CLERK_PHONE_HELD_UNVERIFIED,
  upsertUserFromClerk,
} from "#src/auth/sync-clerk-user";
import { listMyMatchHistoryRows } from "#src/routers/games/listMyMatchHistory";
import { loadHome } from "#src/routers/users/home";
import { loadPlayerProfile } from "#src/routers/users/playerProfile";
import { loadProfileStats } from "#src/routers/users/profileStats";
import { createUnclaimedPlayer } from "#src/unclaimed-players/create-unclaimed-player";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

type ClerkUserPayload = Extract<
  UserWebhookEvent,
  { type: "user.created" | "user.updated" }
>["data"];

const CLERK_DEFAULT_IMAGE = "https://img.clerk.com/generated-default.png";
const CLERK_PHOTO = "https://img.clerk.com/chosen-photo.png";
const CLERK_PHOTO_REPLACED = "https://img.clerk.com/replaced-photo.png";

function clerkUser(overrides: {
  id?: string;
  has_image: boolean;
  image_url?: string;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  phoneVerified?: boolean;
}): ClerkUserPayload {
  const emailId = "idn_email_1";
  const phoneId = "idn_phone_1";
  const email =
    overrides.email === undefined ? "alex@example.com" : overrides.email;
  const hasEmail = email != null && email.length > 0;
  const hasPhone = overrides.phone != null && overrides.phone.length > 0;

  return {
    id: overrides.id ?? "user_clerk_alex",
    username: overrides.username === undefined ? "alex" : overrides.username,
    first_name:
      overrides.first_name === undefined ? "Alex" : overrides.first_name,
    last_name:
      overrides.last_name === undefined ? "River" : overrides.last_name,
    image_url:
      overrides.image_url ??
      (overrides.has_image ? CLERK_PHOTO : CLERK_DEFAULT_IMAGE),
    has_image: overrides.has_image,
    primary_email_address_id: hasEmail ? emailId : null,
    primary_phone_number_id: hasPhone ? phoneId : null,
    email_addresses: hasEmail
      ? [
          {
            id: emailId,
            email_address: email,
            verification: { status: "verified" },
          },
        ]
      : [],
    phone_numbers: hasPhone
      ? [
          {
            id: phoneId,
            phone_number: overrides.phone,
            verification: {
              status:
                overrides.phoneVerified === false ? "unverified" : "verified",
            },
          },
        ]
      : [],
  } as ClerkUserPayload;
}

async function storedUser(database: TestDatabase, clerkId: string) {
  const row = await database.query.user.findFirst({
    where: eq(user.clerkId, clerkId),
  });
  if (!row) {
    throw new Error("Expected a Temba User for Clerk id " + clerkId);
  }
  return row;
}

describe("Clerk user.created / user.updated upsert", () => {
  it("persists the image URL on create when has_image is true", async () => {
    const { db, close } = await createPgliteDb();
    try {
      await upsertUserFromClerk(
        db,
        clerkUser({ has_image: true, image_url: CLERK_PHOTO }),
      );

      const row = await storedUser(db, "user_clerk_alex");
      expect(row.image).toBe(CLERK_PHOTO);
      expect(row.name).toBe("Alex River");
      expect(row.email).toBe("alex@example.com");
      expect(row.username).toBe("alex");
    } finally {
      await close();
    }
  });

  it("persists null on create when has_image is false, even if Clerk sent a generated URL", async () => {
    const { db, close } = await createPgliteDb();
    try {
      await upsertUserFromClerk(
        db,
        clerkUser({
          has_image: false,
          image_url: CLERK_DEFAULT_IMAGE,
        }),
      );

      const row = await storedUser(db, "user_clerk_alex");
      expect(row.image).toBeNull();
    } finally {
      await close();
    }
  });

  it("replaces the stored URL on update when has_image is true", async () => {
    const { db, close } = await createPgliteDb();
    try {
      await upsertUserFromClerk(
        db,
        clerkUser({ has_image: true, image_url: CLERK_PHOTO }),
      );
      await upsertUserFromClerk(
        db,
        clerkUser({ has_image: true, image_url: CLERK_PHOTO_REPLACED }),
      );

      const row = await storedUser(db, "user_clerk_alex");
      expect(row.image).toBe(CLERK_PHOTO_REPLACED);
    } finally {
      await close();
    }
  });

  it("clears the stored image on update when has_image is false after Remove", async () => {
    const { db, close } = await createPgliteDb();
    try {
      await upsertUserFromClerk(
        db,
        clerkUser({ has_image: true, image_url: CLERK_PHOTO }),
      );
      await upsertUserFromClerk(
        db,
        clerkUser({
          has_image: false,
          image_url: CLERK_DEFAULT_IMAGE,
        }),
      );

      const row = await storedUser(db, "user_clerk_alex");
      expect(row.image).toBeNull();
    } finally {
      await close();
    }
  });

  it("still syncs name, email, username, and phone on the same update", async () => {
    const { db, close } = await createPgliteDb();
    try {
      await upsertUserFromClerk(
        db,
        clerkUser({
          has_image: true,
          phone: "+15551234567",
        }),
      );
      await upsertUserFromClerk(
        db,
        clerkUser({
          has_image: false,
          image_url: CLERK_DEFAULT_IMAGE,
          first_name: "Sam",
          last_name: "Lee",
          username: "samlee",
          email: "sam@example.com",
          phone: "+15557654321",
        }),
      );

      const row = await storedUser(db, "user_clerk_alex");
      expect(row.image).toBeNull();
      expect(row.name).toBe("Sam Lee");
      expect(row.email).toBe("sam@example.com");
      expect(row.username).toBe("samlee");
      expect(row.phoneNumber).toBe("+15557654321");
      expect(row.phoneNumberVerified).toBe(true);
    } finally {
      await close();
    }
  });

  it("leaves Preferred Position and onboarding completion untouched", async () => {
    const { db, close } = await createPgliteDb();
    try {
      await upsertUserFromClerk(db, clerkUser({ has_image: true }));

      const created = await storedUser(db, "user_clerk_alex");
      expect(created.preferredPosition).toBeNull();
      expect(created.onboardingCompletedAt).toBeNull();

      const completedAt = new Date("2025-03-04T05:06:07.000Z");
      await db
        .update(user)
        .set({ preferredPosition: "left", onboardingCompletedAt: completedAt })
        .where(eq(user.id, created.id));

      await upsertUserFromClerk(
        db,
        clerkUser({
          has_image: false,
          first_name: "Sam",
          last_name: "Lee",
        }),
      );

      const row = await storedUser(db, "user_clerk_alex");
      expect(row.name).toBe("Sam Lee");
      expect(row.preferredPosition).toBe("left");
      expect(row.onboardingCompletedAt?.getTime()).toBe(completedAt.getTime());
    } finally {
      await close();
    }
  });

  it("writes a phone-only user.created payload", async () => {
    const { db, close } = await createPgliteDb();
    try {
      await upsertUserFromClerk(
        db,
        clerkUser({
          has_image: false,
          email: null,
          phone: "+97336124408",
          username: "phoneonly",
          first_name: null,
          last_name: null,
        }),
      );

      const row = await storedUser(db, "user_clerk_alex");
      expect(row.email).toBeNull();
      expect(row.emailVerified).toBe(false);
      expect(row.phoneNumber).toBe("+97336124408");
      expect(row.phoneNumberVerified).toBe(true);
      expect(row.username).toBe("phoneonly");
      expect(row.name).toBe("phoneonly");
    } finally {
      await close();
    }
  });

  it("matches a phone-only user.updated on phone when clerkId is missing", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const [seeded] = await db
        .insert(user)
        .values({
          name: "Seeded",
          email: null,
          phoneNumber: "+97336124408",
          username: "seededphone",
        })
        .returning();
      if (!seeded) {
        throw new Error("Failed to seed phone-only User");
      }

      await upsertUserFromClerk(
        db,
        clerkUser({
          id: "user_clerk_phone",
          has_image: false,
          email: null,
          phone: "+97336124408",
          username: "seededphone",
          first_name: "Mikael",
          last_name: "Karlsson",
        }),
      );

      const matches = await db.query.user.findMany({
        where: eq(user.phoneNumber, "+97336124408"),
      });
      expect(matches).toHaveLength(1);
      expect(matches[0]?.id).toBe(seeded.id);
      expect(matches[0]?.clerkId).toBe("user_clerk_phone");
      expect(matches[0]?.name).toBe("Mikael Karlsson");
      expect(matches[0]?.email).toBeNull();
    } finally {
      await close();
    }
  });

  it("rejects a payload with neither email nor phone", async () => {
    const { db, close } = await createPgliteDb();
    try {
      await expect(
        upsertUserFromClerk(
          db,
          clerkUser({
            has_image: false,
            email: null,
            phone: null,
          }),
        ),
      ).rejects.toThrow(/email address or a phone number/i);
    } finally {
      await close();
    }
  });

  it("keeps email uniqueness and phone uniqueness", async () => {
    const { db, close } = await createPgliteDb();
    try {
      await upsertUserFromClerk(
        db,
        clerkUser({
          id: "user_one",
          has_image: false,
          email: "shared@example.com",
          phone: "+15550000001",
        }),
      );

      await expect(
        upsertUserFromClerk(
          db,
          clerkUser({
            id: "user_two",
            has_image: false,
            email: "shared@example.com",
            phone: "+15550000002",
            username: "other",
          }),
        ),
      ).rejects.toThrow(/Email already belongs/i);

      await expect(
        upsertUserFromClerk(
          db,
          clerkUser({
            id: "user_three",
            has_image: false,
            email: "other@example.com",
            phone: "+15550000001",
            username: "third",
          }),
        ),
      ).rejects.toThrow(/Phone number already belongs/i);
    } finally {
      await close();
    }
  });

  it("does not rewrite an existing email row when applying phone-only sync to a different user", async () => {
    const { db, close } = await createPgliteDb();
    try {
      await upsertUserFromClerk(
        db,
        clerkUser({
          id: "user_email_row",
          has_image: false,
          email: "keep@example.com",
          username: "keepemail",
        }),
      );

      await upsertUserFromClerk(
        db,
        clerkUser({
          id: "user_phone_row",
          has_image: false,
          email: null,
          phone: "+97339990000",
          username: "newphone",
          first_name: null,
          last_name: null,
        }),
      );

      const emailRow = await storedUser(db, "user_email_row");
      const phoneRow = await storedUser(db, "user_phone_row");
      expect(emailRow.email).toBe("keep@example.com");
      expect(emailRow.phoneNumber).toBeNull();
      expect(phoneRow.email).toBeNull();
      expect(phoneRow.phoneNumber).toBe("+97339990000");
    } finally {
      await close();
    }
  });

  it("rejects a database row with neither email nor phone", async () => {
    const { db, close } = await createPgliteDb();
    try {
      await expect(
        db.insert(user).values({ name: "Nobody" }).returning(),
      ).rejects.toThrow();
    } finally {
      await close();
    }
  });
});

const UNCLAIMED_PHONE = "+97336124408";
const MATCH_TIME = new Date("2024-01-10T12:00:00.000Z");

async function insertAccount(database: TestDatabase, clerkId: string) {
  const [row] = await database
    .insert(user)
    .values({ name: clerkId, email: `${clerkId}@example.com`, clerkId })
    .returning();
  if (!row) {
    throw new Error("Failed to insert account " + clerkId);
  }
  return row;
}

async function insertUnclaimed(database: TestDatabase, addedByUserId: string) {
  const { user: row } = await createUnclaimedPlayer(database, {
    phoneNumber: UNCLAIMED_PHONE,
    name: "Ali typed by Organizer",
    addedByUserId,
    startingLevel: { sport: "padel", level: "C+" },
  });
  return row;
}

async function insertGroupGame(
  database: TestDatabase,
  args: { createdBy: string; groupId: string },
) {
  const [venue] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Manama",
      country: "BH",
    })
    .returning({ id: venues.id });
  if (!venue) {
    throw new Error("Failed to insert venue");
  }
  const [game] = await database
    .insert(games)
    .values({
      name: "Thursday Padel",
      format: GameFormatEnum.FRIENDLY_GAME,
      registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
      venueId: venue.id,
      groupId: args.groupId,
      createdBy: args.createdBy,
      playersAllowed: 4,
      teamsAllowed: 2,
      windowStart: MATCH_TIME,
      windowEnd: new Date("2024-01-10T14:00:00.000Z"),
    })
    .returning();
  if (!game) {
    throw new Error("Failed to insert game");
  }
  return game;
}

async function seatOnTeam(
  database: TestDatabase,
  args: {
    gameId: string;
    gameTeamId: string;
    userId: string;
    position: (typeof GamePositionEnum)[keyof typeof GamePositionEnum];
  },
) {
  const [seat] = await database
    .insert(gamePlayers)
    .values({ gameId: args.gameId, userId: args.userId })
    .returning({ id: gamePlayers.id });
  if (!seat) {
    throw new Error("Failed to insert seat");
  }
  await database.insert(gameTeamPlayers).values({
    gameTeamId: args.gameTeamId,
    gamePlayerId: seat.id,
    position: args.position,
  });
}

async function playCompletedMatch(
  database: TestDatabase,
  args: {
    gameId: string;
    side1: [string, string];
    side2: [string, string];
  },
) {
  const [team1] = await database
    .insert(gameTeams)
    .values({ gameId: args.gameId, sideIndex: 1 })
    .returning({ id: gameTeams.id });
  const [team2] = await database
    .insert(gameTeams)
    .values({ gameId: args.gameId, sideIndex: 2 })
    .returning({ id: gameTeams.id });
  if (!team1 || !team2) {
    throw new Error("Failed to insert game teams");
  }
  for (const [team, side] of [
    [team1, args.side1],
    [team2, args.side2],
  ] as const) {
    await seatOnTeam(database, {
      gameId: args.gameId,
      gameTeamId: team.id,
      userId: side[0],
      position: GamePositionEnum.LEFT,
    });
    await seatOnTeam(database, {
      gameId: args.gameId,
      gameTeamId: team.id,
      userId: side[1],
      position: GamePositionEnum.RIGHT,
    });
  }
  const [match] = await database
    .insert(matches)
    .values({
      gameId: args.gameId,
      startTime: MATCH_TIME,
      slot1GameTeamId: team1.id,
      slot2GameTeamId: team2.id,
      status: MatchStatusEnum.COMPLETED,
    })
    .returning({ id: matches.id });
  if (!match) {
    throw new Error("Failed to insert match");
  }
  await database.insert(matchSets).values({
    matchId: match.id,
    setNumber: 1,
    slot1GamesWon: 6,
    slot2GamesWon: 4,
  });
}

async function seedUnclaimedHistory(database: TestDatabase) {
  const organizer = await insertAccount(database, "user_organizer");
  const partner = await insertAccount(database, "user_partner");
  const oppLeft = await insertAccount(database, "user_opp_left");
  const oppRight = await insertAccount(database, "user_opp_right");
  const unclaimed = await insertUnclaimed(database, organizer.id);

  const [group] = await database
    .insert(groups)
    .values({ name: "Night Crew", createdBy: organizer.id })
    .returning({ id: groups.id });
  if (!group) {
    throw new Error("Failed to insert group");
  }
  for (const member of [organizer, partner, oppLeft, oppRight, unclaimed]) {
    await database
      .insert(groupMembers)
      .values({ groupId: group.id, userId: member.id });
  }

  const played = await insertGroupGame(database, {
    createdBy: organizer.id,
    groupId: group.id,
  });
  await playCompletedMatch(database, {
    gameId: played.id,
    side1: [unclaimed.id, partner.id],
    side2: [oppLeft.id, oppRight.id],
  });
  const upcoming = await insertGroupGame(database, {
    createdBy: organizer.id,
    groupId: group.id,
  });
  await database
    .insert(gamePlayers)
    .values({ gameId: upcoming.id, userId: unclaimed.id });

  return { organizer, unclaimed, groupId: group.id };
}

function claimerPayload(overrides: { phoneVerified?: boolean } = {}) {
  return clerkUser({
    id: "user_clerk_claimer",
    has_image: true,
    first_name: "Ali",
    last_name: "Hassan",
    username: "alihassan",
    email: "ali@example.com",
    phone: UNCLAIMED_PHONE,
    ...overrides,
  });
}

async function historyLinkedRows(database: TestDatabase) {
  return database.query.notifications.findMany({
    where: eq(notifications.type, "history_linked"),
  });
}

describe("Claiming an Unclaimed player at sign-up", () => {
  it("claims the row for a verified phone: same id, account fields set, history intact", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { organizer, unclaimed, groupId } = await seedUnclaimedHistory(db);
      const ratingsBefore = await db.query.ratings.findMany({
        where: eq(ratings.userId, unclaimed.id),
      });

      const claimed = await upsertUserFromClerk(db, claimerPayload());

      expect(claimed.id).toBe(unclaimed.id);
      const row = await storedUser(db, "user_clerk_claimer");
      expect(row).toMatchObject({
        id: unclaimed.id,
        name: "Ali Hassan",
        email: "ali@example.com",
        username: "alihassan",
        image: CLERK_PHOTO,
        phoneNumber: UNCLAIMED_PHONE,
        phoneNumberVerified: true,
        addedByUserId: organizer.id,
      });
      expect(row.claimedAt).toBeInstanceOf(Date);
      expect(row.addedAt?.getTime()).toBe(unclaimed.addedAt?.getTime());

      const seats = await db.query.gamePlayers.findMany({
        where: eq(gamePlayers.userId, unclaimed.id),
      });
      expect(seats).toHaveLength(2);
      const memberships = await db.query.groupMembers.findMany({
        where: eq(groupMembers.userId, unclaimed.id),
      });
      expect(memberships.map((membership) => membership.groupId)).toEqual([
        groupId,
      ]);
      const ratingsAfter = await db.query.ratings.findMany({
        where: eq(ratings.userId, unclaimed.id),
      });
      expect(ratingsAfter).toEqual(ratingsBefore);
    } finally {
      await close();
    }
  });

  it("shows the claimed Games in Home, Last 10, All time, Match history and the claimer's Groups", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { unclaimed, groupId } = await seedUnclaimedHistory(db);

      const claimed = await upsertUserFromClerk(db, claimerPayload());

      const home = await loadHome(db, { userId: claimed.id });
      expect(home.gamesPlayed).toBe(1);
      expect(home.gamesWon).toBe(1);
      expect(home.groupsCount).toBe(1);
      expect(home.standing.map((row) => row.groupId)).toEqual([groupId]);

      const profile = await loadPlayerProfile(db, {
        viewerId: claimed.id,
        playerId: unclaimed.id,
      });
      expect(profile.lastMatches).toHaveLength(1);

      const allTime = await loadProfileStats(db, { userId: claimed.id });
      expect(allTime.matchesPlayed).toBe(1);
      expect(allTime.matchesWon).toBe(1);

      const history = await listMyMatchHistoryRows(db, claimed.id);
      expect(history).toHaveLength(1);
    } finally {
      await close();
    }
  });

  it("writes one history_linked Notification with the number of Games the row was seated on", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { unclaimed } = await seedUnclaimedHistory(db);

      await upsertUserFromClerk(db, claimerPayload());

      const rows = await historyLinkedRows(db);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        recipientUserId: unclaimed.id,
        audience: "player",
        gameCount: 2,
        actorUserId: null,
        gameId: null,
        groupId: null,
        readAt: null,
      });
    } finally {
      await close();
    }
  });

  it("writes it once per claim, not on a repeated user.created or a later user.updated", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { unclaimed } = await seedUnclaimedHistory(db);

      await upsertUserFromClerk(db, claimerPayload());
      const firstClaimedAt = (await storedUser(db, "user_clerk_claimer"))
        .claimedAt;
      await upsertUserFromClerk(db, claimerPayload());
      await upsertUserFromClerk(
        db,
        clerkUser({
          id: "user_clerk_claimer",
          has_image: false,
          first_name: "Ali",
          last_name: "H.",
          email: "ali@example.com",
          phone: UNCLAIMED_PHONE,
        }),
      );

      expect(await historyLinkedRows(db)).toHaveLength(1);
      const row = await storedUser(db, "user_clerk_claimer");
      expect(row.id).toBe(unclaimed.id);
      expect(row.name).toBe("Ali H.");
      expect(row.claimedAt?.getTime()).toBe(firstClaimedAt?.getTime());
    } finally {
      await close();
    }
  });

  it("claims a row with no seats without writing a Notification", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const organizer = await insertAccount(db, "user_organizer");
      const unclaimed = await insertUnclaimed(db, organizer.id);

      const claimed = await upsertUserFromClerk(db, claimerPayload());

      expect(claimed.id).toBe(unclaimed.id);
      expect(claimed.claimedAt).toBeInstanceOf(Date);
      expect(await historyLinkedRows(db)).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it("does not claim for an unverified phone: the account is created without the phone", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { unclaimed } = await seedUnclaimedHistory(db);

      const created = await upsertUserFromClerk(
        db,
        claimerPayload({ phoneVerified: false }),
      );

      expect(created.id).not.toBe(unclaimed.id);
      expect(created).toMatchObject({
        clerkId: "user_clerk_claimer",
        email: "ali@example.com",
        phoneNumber: null,
        phoneNumberVerified: false,
        claimedAt: null,
      });
      const untouched = await db.query.user.findFirst({
        where: eq(user.id, unclaimed.id),
      });
      expect(untouched).toMatchObject({
        clerkId: null,
        name: "Ali typed by Organizer",
        phoneNumber: UNCLAIMED_PHONE,
        claimedAt: null,
      });
      expect(await historyLinkedRows(db)).toHaveLength(0);
      expect(await loadHome(db, { userId: created.id })).toMatchObject({
        gamesPlayed: 0,
        groupsCount: 0,
      });
    } finally {
      await close();
    }
  });

  it("refuses a phone-only sign-up whose unverified phone an Unclaimed player holds", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const organizer = await insertAccount(db, "user_organizer");
      const unclaimed = await insertUnclaimed(db, organizer.id);

      await expect(
        upsertUserFromClerk(
          db,
          clerkUser({
            id: "user_clerk_claimer",
            has_image: false,
            email: null,
            phone: UNCLAIMED_PHONE,
            phoneVerified: false,
          }),
        ),
      ).rejects.toThrow(CLERK_PHONE_HELD_UNVERIFIED);

      const untouched = await db.query.user.findFirst({
        where: eq(user.id, unclaimed.id),
      });
      expect(untouched?.clerkId).toBeNull();
      expect(untouched?.claimedAt).toBeNull();
    } finally {
      await close();
    }
  });

  it("claims on the user.updated that follows once Clerk verifies the phone of a phone-only sign-up", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { unclaimed } = await seedUnclaimedHistory(db);
      const phoneOnly = {
        id: "user_clerk_claimer",
        has_image: false,
        email: null,
        phone: UNCLAIMED_PHONE,
      };

      await expect(
        upsertUserFromClerk(
          db,
          clerkUser({ ...phoneOnly, phoneVerified: false }),
        ),
      ).rejects.toThrow(CLERK_PHONE_HELD_UNVERIFIED);
      const claimed = await upsertUserFromClerk(db, clerkUser(phoneOnly));

      expect(claimed.id).toBe(unclaimed.id);
      expect(claimed.claimedAt).toBeInstanceOf(Date);
      expect(await historyLinkedRows(db)).toHaveLength(1);
    } finally {
      await close();
    }
  });

  it("links a legacy row without a clerkId only for a verified phone, and never as a claim", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const [legacy] = await db
        .insert(user)
        .values({ name: "Legacy", email: null, phoneNumber: UNCLAIMED_PHONE })
        .returning();
      if (!legacy) {
        throw new Error("Failed to seed legacy User");
      }
      await insertAccount(db, "user_organizer");
      const [group] = await db
        .insert(groups)
        .values({ name: "Old Crew", createdBy: legacy.id })
        .returning({ id: groups.id });
      if (!group) {
        throw new Error("Failed to insert group");
      }
      const game = await insertGroupGame(db, {
        createdBy: legacy.id,
        groupId: group.id,
      });
      await db
        .insert(gamePlayers)
        .values({ gameId: game.id, userId: legacy.id });

      const unverified = await upsertUserFromClerk(
        db,
        claimerPayload({ phoneVerified: false }),
      );
      expect(unverified.id).not.toBe(legacy.id);
      const stillLegacy = await db.query.user.findFirst({
        where: eq(user.id, legacy.id),
      });
      expect(stillLegacy?.clerkId).toBeNull();

      const linked = await upsertUserFromClerk(
        db,
        clerkUser({
          id: "user_clerk_legacy",
          has_image: false,
          email: null,
          phone: UNCLAIMED_PHONE,
          username: "legacy",
        }),
      );
      expect(linked.id).toBe(legacy.id);
      expect(linked.clerkId).toBe("user_clerk_legacy");
      expect(linked.claimedAt).toBeNull();
      expect(await historyLinkedRows(db)).toHaveLength(0);
    } finally {
      await close();
    }
  });
});

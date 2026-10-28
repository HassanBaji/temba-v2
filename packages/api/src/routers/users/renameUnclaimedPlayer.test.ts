import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  communities,
  communityMembers,
  CommunityRoleEnum,
  communitySports,
  gameWaitlist,
  groupMembers,
  groups,
  GroupSportEnum,
  user,
  venues,
} from "@repo/db/schema";

import {
  NOW,
  asDb,
  insertBooking,
  withBookableVenue,
} from "#src/bookings/booking.test-support";
import { createFriendlyGame } from "#src/games/create-friendly";
import { createBookingGame } from "#src/routers/bookings/createGame";
import { addPlayerByPhone as addPlayerToGame } from "#src/routers/games/addPlayerByPhone";
import { gameById } from "#src/routers/games/byId";
import { addPlayerByPhone as addPlayerToGroup } from "#src/routers/groups/addPlayerByPhone";
import { groupById } from "#src/routers/groups/byId";
import { createClubPrivate } from "#src/routers/groups/createClubPrivate";
import { createLoosePrivate } from "#src/routers/groups/createLoosePrivate";
import {
  ONLY_UNCLAIMED_RENAMABLE_MESSAGE,
  RENAME_NOT_ALLOWED_MESSAGE,
  renameUnclaimedPlayer,
  renameUnclaimedPlayerInput,
} from "#src/routers/users/renameUnclaimedPlayer";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const HOUR = 60 * 60 * 1000;

async function insertUser(
  database: TestDatabase,
  values: { name: string; phoneNumber?: string },
) {
  const [row] = await database
    .insert(user)
    .values({
      ...values,
      email: `${values.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      clerkId: `user_${crypto.randomUUID()}`,
    })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row.id;
}

function bahrain(nationalNumber: string) {
  return { countryIso: "BH", nationalNumber };
}

async function rejection(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(TRPCError);
  return error as TRPCError;
}

async function nameOf(database: TestDatabase, userId: string) {
  const row = await database.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { name: true },
  });
  return row?.name;
}

async function groupGame(database: TestDatabase, organizerName: string) {
  const organizer = await insertUser(database, { name: organizerName });
  const member = await insertUser(database, {
    name: `${organizerName} member`,
  });
  const [venue] = await database
    .insert(venues)
    .values({ name: `${organizerName} court`, city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  const [group] = await database
    .insert(groups)
    .values({ name: `${organizerName} padel`, createdBy: organizer })
    .returning({ id: groups.id });
  await database.insert(groupMembers).values([
    { groupId: group!.id, userId: organizer },
    { groupId: group!.id, userId: member },
  ]);
  const windowStart = new Date(Date.now() + 24 * HOUR);
  const created = await createFriendlyGame(database, {
    createdBy: organizer,
    groupId: group!.id,
    venueId: venue!.id,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 2 * HOUR),
  });
  return {
    organizer,
    member,
    groupId: group!.id,
    gameId: created.game.id,
  };
}

async function seatAli(
  database: TestDatabase,
  game: { gameId: string; organizer: string },
) {
  const added = await addPlayerToGame(database, {
    gameId: game.gameId,
    organizerUserId: game.organizer,
    ...bahrain("36124408"),
    name: "Ally",
    seat: { sideIndex: 2, position: "left" },
  });
  return added.userId;
}

describe("users.renameUnclaimedPlayer", () => {
  it("lets an Organizer of a Game the player is seated on fix the name, trimmed, shown on Game details", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const game = await groupGame(db, "Organizer");
      const ali = await seatAli(db, game);

      await expect(
        renameUnclaimedPlayer(db, {
          callerUserId: game.organizer,
          userId: ali,
          name: "  Ali Hassan  ",
        }),
      ).resolves.toEqual({ userId: ali, name: "Ali Hassan" });

      expect(await nameOf(db, ali)).toBe("Ali Hassan");
      const details = await gameById(db, {
        gameId: game.gameId,
        userId: game.member,
      });
      expect(details.sides[1]?.left).toMatchObject({
        userId: ali,
        name: "Ali Hassan",
        unclaimed: true,
      });
    } finally {
      await close();
    }
  });

  it("lets an Organizer of a Game the player is waitlisted on fix the name", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const first = await groupGame(db, "Organizer");
      const ali = await seatAli(db, first);
      const second = await groupGame(db, "Second organizer");
      await db
        .insert(gameWaitlist)
        .values({ gameId: second.gameId, userId: ali });

      await renameUnclaimedPlayer(db, {
        callerUserId: second.organizer,
        userId: ali,
        name: "Ali Hassan",
      });

      expect(await nameOf(db, ali)).toBe("Ali Hassan");
    } finally {
      await close();
    }
  });

  it("lets a Booking Game's holder fix the name and refuses anyone else", async () => {
    await withBookableVenue(async (database, fixture) => {
      const booking = await insertBooking(database, fixture);
      const { gameId } = await createBookingGame(asDb(database), {
        bookingId: booking.id,
        userId: fixture.customer,
        now: NOW,
      });
      const added = await addPlayerToGame(asDb(database), {
        gameId,
        organizerUserId: fixture.customer,
        ...bahrain("36124408"),
        name: "Ally",
        seat: { sideIndex: 2, position: "left" },
      });

      const refused = await rejection(
        renameUnclaimedPlayer(asDb(database), {
          callerUserId: fixture.other,
          userId: added.userId,
          name: "Ali Hassan",
        }),
      );
      expect(refused.code).toBe("FORBIDDEN");
      expect(refused.message).toBe(RENAME_NOT_ALLOWED_MESSAGE);

      await renameUnclaimedPlayer(asDb(database), {
        callerUserId: fixture.customer,
        userId: added.userId,
        name: "Ali Hassan",
      });
      const row = await database.query.user.findFirst({
        where: eq(user.id, added.userId),
        columns: { name: true },
      });
      expect(row?.name).toBe("Ali Hassan");
    });
  });

  it("lets a Group approver of a Group the player is in fix the name, shown on Group home", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, { name: "Creator" });
      const member = await insertUser(db, { name: "Member" });
      const group = await createLoosePrivate(db, {
        name: "Thursday padel",
        sport: "padel",
        userId: creator,
      });
      await db
        .insert(groupMembers)
        .values({ groupId: group.id, userId: member });
      const added = await addPlayerToGroup(db, {
        groupId: group.id,
        approverUserId: creator,
        ...bahrain("36124408"),
        name: "Ally",
      });

      await renameUnclaimedPlayer(db, {
        callerUserId: creator,
        userId: added.userId,
        name: "Ali Hassan",
      });

      const home = await groupById(db, { groupId: group.id, userId: member });
      expect(
        home.standing.leaderboard.find((row) => row.userId === added.userId),
      ).toMatchObject({ name: "Ali Hassan", unclaimed: true });
    } finally {
      await close();
    }
  });

  it("lets a Community Owner of a Club Group fix the name, and nobody while the Community is Soft-archived", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, { name: "Owner" });
      const [community] = await db
        .insert(communities)
        .values({ name: "Padel Club", type: "private", createdBy: owner })
        .returning({ id: communities.id });
      await db.insert(communitySports).values({
        communityId: community!.id,
        sport: GroupSportEnum.PADEL,
      });
      await db.insert(communityMembers).values({
        communityId: community!.id,
        userId: owner,
        role: CommunityRoleEnum.OWNER,
      });
      const group = await createClubPrivate(db, {
        communityId: community!.id,
        name: "Club squad",
        sport: "padel",
        userId: owner,
      });
      const added = await addPlayerToGroup(db, {
        groupId: group.id,
        approverUserId: owner,
        ...bahrain("36124408"),
        name: "Ally",
      });

      await renameUnclaimedPlayer(db, {
        callerUserId: owner,
        userId: added.userId,
        name: "Ali Hassan",
      });
      expect(await nameOf(db, added.userId)).toBe("Ali Hassan");

      await db
        .update(communities)
        .set({ archivedAt: new Date() })
        .where(eq(communities.id, community!.id));
      const refused = await rejection(
        renameUnclaimedPlayer(db, {
          callerUserId: owner,
          userId: added.userId,
          name: "Ali",
        }),
      );
      expect(refused.message).toBe(RENAME_NOT_ALLOWED_MESSAGE);
    } finally {
      await close();
    }
  });

  it("refuses an Organizer or Group approver who shares nothing with the player, and a plain member", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const game = await groupGame(db, "Organizer");
      const ali = await seatAli(db, game);
      const unrelated = await groupGame(db, "Unrelated organizer");
      const looseCreator = await insertUser(db, { name: "Loose creator" });
      await createLoosePrivate(db, {
        name: "Other padel",
        sport: "padel",
        userId: looseCreator,
      });

      for (const callerUserId of [
        unrelated.organizer,
        looseCreator,
        game.member,
      ]) {
        const refused = await rejection(
          renameUnclaimedPlayer(db, {
            callerUserId,
            userId: ali,
            name: "Ali Hassan",
          }),
        );
        expect(refused.code).toBe("FORBIDDEN");
        expect(refused.message).toBe(RENAME_NOT_ALLOWED_MESSAGE);
      }
      expect(await nameOf(db, ali)).toBe("Ally");
    } finally {
      await close();
    }
  });

  it("refuses a Group member who is not a Group approver", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, { name: "Creator" });
      const member = await insertUser(db, { name: "Member" });
      const group = await createLoosePrivate(db, {
        name: "Thursday padel",
        sport: "padel",
        userId: creator,
      });
      await db
        .insert(groupMembers)
        .values({ groupId: group.id, userId: member });
      const added = await addPlayerToGroup(db, {
        groupId: group.id,
        approverUserId: creator,
        ...bahrain("36124408"),
        name: "Ally",
      });

      const refused = await rejection(
        renameUnclaimedPlayer(db, {
          callerUserId: member,
          userId: added.userId,
          name: "Ali Hassan",
        }),
      );
      expect(refused.message).toBe(RENAME_NOT_ALLOWED_MESSAGE);
    } finally {
      await close();
    }
  });

  it("refuses an account holder", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const game = await groupGame(db, "Organizer");
      const ahmed = await insertUser(db, {
        name: "Ahmed Ali",
        phoneNumber: "+97336110001",
      });
      await addPlayerToGame(db, {
        gameId: game.gameId,
        organizerUserId: game.organizer,
        ...bahrain("36110001"),
        seat: { sideIndex: 2, position: "left" },
      });

      const refused = await rejection(
        renameUnclaimedPlayer(db, {
          callerUserId: game.organizer,
          userId: ahmed,
          name: "Someone else",
        }),
      );
      expect(refused.code).toBe("FORBIDDEN");
      expect(refused.message).toBe(ONLY_UNCLAIMED_RENAMABLE_MESSAGE);
      expect(await nameOf(db, ahmed)).toBe("Ahmed Ali");
    } finally {
      await close();
    }
  });

  it("refuses once the player is claimed", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const game = await groupGame(db, "Organizer");
      const ali = await seatAli(db, game);
      await db
        .update(user)
        .set({ clerkId: "user_claimed", claimedAt: new Date() })
        .where(eq(user.id, ali));

      const refused = await rejection(
        renameUnclaimedPlayer(db, {
          callerUserId: game.organizer,
          userId: ali,
          name: "Ali Hassan",
        }),
      );
      expect(refused.message).toBe(ONLY_UNCLAIMED_RENAMABLE_MESSAGE);
      expect(await nameOf(db, ali)).toBe("Ally");
    } finally {
      await close();
    }
  });

  it("refuses a blank name and an unknown player", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const game = await groupGame(db, "Organizer");
      const ali = await seatAli(db, game);

      const blank = await rejection(
        renameUnclaimedPlayer(db, {
          callerUserId: game.organizer,
          userId: ali,
          name: "   ",
        }),
      );
      expect(blank.code).toBe("BAD_REQUEST");

      const unknown = await rejection(
        renameUnclaimedPlayer(db, {
          callerUserId: game.organizer,
          userId: crypto.randomUUID(),
          name: "Ali Hassan",
        }),
      );
      expect(unknown.code).toBe("NOT_FOUND");
    } finally {
      await close();
    }
  });
});

describe("users.renameUnclaimedPlayer input", () => {
  const userId = crypto.randomUUID();

  it("trims the name and bounds it to 1–255 characters", () => {
    expect(
      renameUnclaimedPlayerInput.parse({ userId, name: "  Ali Hassan " }),
    ).toEqual({ userId, name: "Ali Hassan" });
    expect(
      renameUnclaimedPlayerInput.safeParse({ userId, name: "a".repeat(255) })
        .success,
    ).toBe(true);
    for (const name of ["", "   ", "a".repeat(256)]) {
      expect(
        renameUnclaimedPlayerInput.safeParse({ userId, name }).success,
      ).toBe(false);
    }
  });
});

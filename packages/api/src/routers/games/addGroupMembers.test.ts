import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  courts,
  gamePlayers,
  groupMembers,
  groups,
  notifications,
  user,
  venues,
} from "@repo/db/schema";

import { createFriendlyGame } from "#src/games/create-friendly";
import { addGroupMembers } from "#src/routers/games/addGroupMembers";
import { gameById } from "#src/routers/games/byId";
import { createGame } from "#src/routers/games/create";
import { listGroupMembersToAdd } from "#src/routers/games/listGroupMembersToAdd";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const HOUR = 60 * 60 * 1000;

async function insertUser(
  database: TestDatabase,
  name: string,
  extra: Partial<typeof user.$inferInsert> = {},
) {
  const [row] = await database
    .insert(user)
    .values({
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      clerkId: `user_${crypto.randomUUID()}`,
      ...extra,
    })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row.id;
}

async function seed(database: TestDatabase, sport: "padel" | "football") {
  const organizer = await insertUser(database, "Organizer");
  const hamad = await insertUser(database, "Hamad Al Sayed", {
    preferredFootballRole: "outfield",
    preferredFootballPosition: "mid",
  });
  const mohamed = await insertUser(database, "Mohamed Alawi", {
    preferredFootballRole: "keeper",
  });
  const sara = await insertUser(database, "Sara Unclaimed", {
    clerkId: null,
    email: null,
    phoneNumber: "+97336110002",
    addedAt: new Date(),
  });
  const outsider = await insertUser(database, "Outsider");
  const [venue] = await database
    .insert(venues)
    .values({ name: "Central", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  const [group] = await database
    .insert(groups)
    .values({ name: "Thursday Night", createdBy: organizer, sport })
    .returning({ id: groups.id });
  await database.insert(groupMembers).values(
    [organizer, hamad, mohamed, sara].map((userId) => ({
      groupId: group!.id,
      userId,
    })),
  );
  const windowStart = new Date(Date.now() + 24 * HOUR);
  const windowEnd = new Date(windowStart.getTime() + HOUR);
  let gameId: string;
  if (sport === "padel") {
    const created = await createFriendlyGame(database, {
      createdBy: organizer,
      groupId: group!.id,
      venueId: venue!.id,
      windowStart,
      windowEnd,
    });
    gameId = created.game.id;
  } else {
    const [pitch] = await database
      .insert(courts)
      .values({ venueId: venue!.id, name: "Pitch 1", sport: "football" })
      .returning({ id: courts.id });
    const created = await createGame(database, {
      createdBy: organizer,
      groupId: group!.id,
      isPublic: false,
      format: "friendly_game",
      registrationMode: "individual",
      venueId: venue!.id,
      courtId: pitch!.id,
      windowStart,
      windowEnd,
    });
    gameId = created.id;
  }
  return { organizer, hamad, mohamed, sara, outsider, gameId };
}

describe("games.listGroupMembersToAdd", () => {
  it("lists the Group's members with their profile, who is in, and the open spots", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db, "football");
      const listed = await listGroupMembersToAdd(db, {
        gameId: f.gameId,
        organizerUserId: f.organizer,
      });
      expect(listed?.groupName).toBe("Thursday Night");
      expect(listed?.openSpots).toBeGreaterThan(0);
      expect(
        listed?.members.map((member) => [
          member.name,
          member.footballRole,
          member.footballPosition,
          member.unclaimed,
        ]),
      ).toEqual([
        ["Hamad Al Sayed", "outfield", "mid", false],
        ["Mohamed Alawi", "keeper", null, false],
        ["Organizer", null, null, false],
        ["Sara Unclaimed", null, null, true],
      ]);
    } finally {
      await close();
    }
  });

  it("is for the Organizer only", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db, "padel");
      await expect(
        listGroupMembersToAdd(db, {
          gameId: f.gameId,
          organizerUserId: f.hamad,
        }),
      ).rejects.toThrow("Only an organizer can do that");
    } finally {
      await close();
    }
  });
});

describe("games.addGroupMembers", () => {
  it("seats the first member where the Organizer tapped and the rest on vacant Positions", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db, "padel");
      const result = await addGroupMembers(db, {
        gameId: f.gameId,
        organizerUserId: f.organizer,
        players: [{ userId: f.hamad }, { userId: f.sara }],
        seat: { sideIndex: 2, position: "right" },
      });
      expect(result.added.map((entry) => entry.name)).toEqual([
        "Hamad Al Sayed",
        "Sara Unclaimed",
      ]);

      const details = await gameById(db, {
        gameId: f.gameId,
        userId: f.organizer,
      });
      expect(details.sides[1]?.right?.userId).toBe(f.hamad);
      const seatedIds = details.sides.flatMap((side) => [
        side.left?.userId,
        side.right?.userId,
      ]);
      expect(seatedIds).toContain(f.sara);

      const listed = await listGroupMembersToAdd(db, {
        gameId: f.gameId,
        organizerUserId: f.organizer,
      });
      expect(
        listed?.members
          .filter((member) => member.status === "in_game")
          .map((member) => member.userId)
          .sort(),
      ).toEqual(seatedIds.filter(Boolean).sort());

      const sent = await db.query.notifications.findMany({
        where: eq(notifications.type, "game_seated_by_organizer"),
        columns: { recipientUserId: true },
      });
      expect(sent.map((row) => row.recipientUserId)).toEqual([f.hamad]);
    } finally {
      await close();
    }
  });

  it("stores each member's football role and position", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db, "football");
      await addGroupMembers(db, {
        gameId: f.gameId,
        organizerUserId: f.organizer,
        players: [
          { userId: f.mohamed, football: { role: "keeper", position: null } },
          { userId: f.hamad, football: { role: "outfield", position: "fwd" } },
          { userId: f.sara },
        ],
      });
      const rows = await db.query.gamePlayers.findMany({
        where: eq(gamePlayers.gameId, f.gameId),
        columns: { userId: true, footballRole: true, footballPosition: true },
      });
      const byId = new Map(rows.map((row) => [row.userId, row]));
      expect(byId.get(f.mohamed)).toMatchObject({
        footballRole: "keeper",
        footballPosition: null,
      });
      expect(byId.get(f.hamad)).toMatchObject({
        footballRole: "outfield",
        footballPosition: "fwd",
      });
      expect(byId.get(f.sara)).toMatchObject({
        footballRole: "outfield",
        footballPosition: null,
      });
    } finally {
      await close();
    }
  });

  it("refuses someone outside the Group and adds nobody", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db, "padel");
      await expect(
        addGroupMembers(db, {
          gameId: f.gameId,
          organizerUserId: f.organizer,
          players: [{ userId: f.hamad }, { userId: f.outsider }],
        }),
      ).rejects.toThrow("Only members of this Group can be added from it");
      const hamadRow = await db.query.gamePlayers.findFirst({
        where: and(
          eq(gamePlayers.gameId, f.gameId),
          eq(gamePlayers.userId, f.hamad),
        ),
      });
      expect(hamadRow).toBeUndefined();
    } finally {
      await close();
    }
  });

  it("refuses a member already on the Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db, "padel");
      await addGroupMembers(db, {
        gameId: f.gameId,
        organizerUserId: f.organizer,
        players: [{ userId: f.hamad }],
      });
      await expect(
        addGroupMembers(db, {
          gameId: f.gameId,
          organizerUserId: f.organizer,
          players: [{ userId: f.hamad }],
        }),
      ).rejects.toThrow("Hamad Al Sayed is already on this Game");
    } finally {
      await close();
    }
  });

  it("refuses more members than the Game has room for", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db, "padel");
      const extra = await Promise.all(
        ["One", "Two", "Three"].map((name) => insertUser(db, `Extra ${name}`)),
      );
      const group = await db.query.groupMembers.findFirst({
        where: eq(groupMembers.userId, f.hamad),
        columns: { groupId: true },
      });
      await db
        .insert(groupMembers)
        .values(extra.map((userId) => ({ groupId: group!.groupId, userId })));
      await expect(
        addGroupMembers(db, {
          gameId: f.gameId,
          organizerUserId: f.organizer,
          players: [f.hamad, f.mohamed, ...extra].map((userId) => ({
            userId,
          })),
        }),
      ).rejects.toThrow("This Game is full");
      const rows = await db.query.gamePlayers.findMany({
        where: eq(gamePlayers.gameId, f.gameId),
        columns: { userId: true },
      });
      expect(rows.map((row) => row.userId)).not.toContain(f.hamad);
    } finally {
      await close();
    }
  });
});

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { communities, games, groups, user, venues } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { createCaller } from "#src/root";
import { createTRPCContext } from "#src/trpc";
import { createGame } from "#src/routers/games/create";
import { listForOperator } from "#src/routers/groups/listForOperator";
import { setVerified } from "#src/routers/groups/setVerified";
import { commit } from "#src/soft-archive";

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: "Test User", email })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertGroup(
  database: TestDatabase,
  args: { name: string; createdBy: string; communityId?: string },
) {
  const [row] = await database
    .insert(groups)
    .values({
      name: args.name,
      createdBy: args.createdBy,
      communityId: args.communityId,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row;
}

function callerFor(metadata: Record<string, unknown> | undefined) {
  return createCaller(() =>
    createTRPCContext({
      db: {} as Parameters<typeof createTRPCContext>[0]["db"],
      userId: "user_clerk",
      getPublicMetadata: async () => metadata,
      headers: new Headers(),
      webOrigin: "https://temba.example",
    }),
  );
}

describe("Operator Group doors", () => {
  it.each([undefined, {}, { operator: false }])(
    "refuse callers who are not Operators (%j)",
    async (metadata) => {
      const caller = callerFor(metadata);
      await expect(
        caller.groups.setVerified({
          groupId: crypto.randomUUID(),
          verified: true,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.groups.listForOperator({})).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    },
  );
});

describe("setVerified", () => {
  it("records who verified and when, and clears both on removal", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "creator@example.com");
      const operator = await insertUser(db, "operator@example.com");
      const group = await insertGroup(db, {
        name: "Crew",
        createdBy: creator.id,
      });

      const verified = await setVerified(db, {
        groupId: group.id,
        verified: true,
        operatorUserId: operator.id,
      });
      expect(verified.verifiedAt).toBeInstanceOf(Date);
      const afterVerify = await db.query.groups.findFirst({
        where: eq(groups.id, group.id),
      });
      expect(afterVerify?.verifiedAt).not.toBeNull();
      expect(afterVerify?.verifiedBy).toBe(operator.id);

      await setVerified(db, {
        groupId: group.id,
        verified: false,
        operatorUserId: operator.id,
      });
      const afterRemove = await db.query.groups.findFirst({
        where: eq(groups.id, group.id),
      });
      expect(afterRemove?.verifiedAt).toBeNull();
      expect(afterRemove?.verifiedBy).toBeNull();
    } finally {
      await close();
    }
  });

  it("is idempotent", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "creator@example.com");
      const first = await insertUser(db, "first@example.com");
      const second = await insertUser(db, "second@example.com");
      const group = await insertGroup(db, {
        name: "Crew",
        createdBy: creator.id,
      });

      await setVerified(db, {
        groupId: group.id,
        verified: false,
        operatorUserId: first.id,
      });
      const unchanged = await db.query.groups.findFirst({
        where: eq(groups.id, group.id),
      });
      expect(unchanged?.verifiedAt).toBeNull();
      expect(unchanged?.verifiedBy).toBeNull();

      await setVerified(db, {
        groupId: group.id,
        verified: true,
        operatorUserId: first.id,
      });
      const once = await db.query.groups.findFirst({
        where: eq(groups.id, group.id),
      });
      await setVerified(db, {
        groupId: group.id,
        verified: true,
        operatorUserId: second.id,
      });
      const twice = await db.query.groups.findFirst({
        where: eq(groups.id, group.id),
      });
      expect(twice?.verifiedAt).toEqual(once?.verifiedAt);
      expect(twice?.verifiedBy).toBe(first.id);
    } finally {
      await close();
    }
  });

  it("refuses an unknown Group", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const operator = await insertUser(db, "operator@example.com");
      await expect(
        setVerified(db, {
          groupId: crypto.randomUUID(),
          verified: true,
          operatorUserId: operator.id,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    } finally {
      await close();
    }
  });

  it("leaves existing Games unchanged and makes only new Games Unrated", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "creator@example.com");
      const operator = await insertUser(db, "operator@example.com");
      const [venue] = await db
        .insert(venues)
        .values({ name: "Club", city: "Lisbon", country: "PT" })
        .returning({ id: venues.id });
      if (!venue) {
        throw new Error("Failed to insert venue");
      }
      const group = await insertGroup(db, {
        name: "Crew",
        createdBy: creator.id,
      });
      await setVerified(db, {
        groupId: group.id,
        verified: true,
        operatorUserId: operator.id,
      });

      const gameInput = (day: number) => ({
        createdBy: creator.id,
        groupId: group.id,
        venueId: venue.id,
        isPublic: false,
        format: "friendly_game" as const,
        registrationMode: "individual" as const,
        windowStart: new Date(`2026-09-${day}T10:00:00`),
        windowEnd: new Date(`2026-09-${day}T12:00:00`),
      });
      const before = await createGame(db, gameInput(20));

      await setVerified(db, {
        groupId: group.id,
        verified: false,
        operatorUserId: operator.id,
      });
      const after = await createGame(db, gameInput(21));

      const rated = async (id: string) =>
        (await db.query.games.findFirst({ where: eq(games.id, id) }))?.rated;
      expect(await rated(before.id)).toBe(true);
      expect(await rated(after.id)).toBe(false);
    } finally {
      await close();
    }
  });
});

describe("listForOperator", () => {
  it("searches all Groups by name and pages the result", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "creator@example.com");
      for (const name of ["Alpha", "Bravo", "Alpine"]) {
        await insertGroup(db, { name, createdBy: creator.id });
      }

      const found = await listForOperator(db, { query: "alp" });
      expect(found.items.map((row) => row.name)).toEqual(["Alpha", "Alpine"]);

      const firstPage = await listForOperator(db, { limit: 2 });
      expect(firstPage.items.map((row) => row.name)).toEqual([
        "Alpha",
        "Alpine",
      ]);
      expect(firstPage.nextCursor).toBe(2);
      const secondPage = await listForOperator(db, {
        limit: 2,
        cursor: firstPage.nextCursor,
      });
      expect(secondPage.items.map((row) => row.name)).toEqual(["Bravo"]);
      expect(secondPage.nextCursor).toBeUndefined();
    } finally {
      await close();
    }
  });

  it("carries the verification source", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "creator@example.com");
      const operator = await insertUser(db, "operator@example.com");
      const plain = await insertGroup(db, {
        name: "Plain",
        createdBy: creator.id,
      });
      const verified = await insertGroup(db, {
        name: "Verified",
        createdBy: creator.id,
      });
      await setVerified(db, {
        groupId: verified.id,
        verified: true,
        operatorUserId: operator.id,
      });

      const { items } = await listForOperator(db, {});
      const byId = new Map(items.map((row) => [row.id, row]));
      expect(byId.get(plain.id)?.verificationSource).toBe("none");
      expect(byId.get(verified.id)?.verificationSource).toBe("operator");
    } finally {
      await close();
    }
  });

  it("finds Groups in Soft-archived Communities", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner@example.com");
      const [community] = await db
        .insert(communities)
        .values({ name: "Old Club", type: "private", createdBy: owner.id })
        .returning({ id: communities.id });
      if (!community) {
        throw new Error("Failed to insert community");
      }
      const group = await insertGroup(db, {
        name: "Archived Crew",
        createdBy: owner.id,
        communityId: community.id,
      });
      const archived = await commit(
        db,
        { communityId: community.id },
        "archived",
      );
      expect(archived.ok).toBe(true);

      const { items } = await listForOperator(db, { query: "Archived" });
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        id: group.id,
        communityName: "Old Club",
        communityArchived: true,
      });
    } finally {
      await close();
    }
  });
});

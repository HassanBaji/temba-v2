import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { user } from "@repo/db/schema";

import { searchLookupUsers } from "#src/invites/search-lookup-users";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

describe("Lookup invite search with email-less Users", () => {
  it("finds an email-less User by username and by phone, not by email", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const [phoneOnly] = await db
        .insert(user)
        .values({
          name: "Mikael Karlsson",
          email: null,
          username: "mikael",
          phoneNumber: "+97336124408",
        })
        .returning();
      const [withEmail] = await db
        .insert(user)
        .values({
          name: "Alex River",
          email: "alex@example.com",
          username: "alex",
          phoneNumber: "+15551234567",
        })
        .returning();
      if (!phoneOnly || !withEmail) {
        throw new Error("Failed to insert Users");
      }

      const byUsername = await searchLookupUsers(db, {
        query: "mikael",
        excludeUserIds: [],
      });
      expect(byUsername.map((row) => row.id)).toEqual([phoneOnly.id]);
      expect(byUsername[0]?.email).toBeNull();
      expect(byUsername[0]?.phoneNumber).toBeNull();

      const byPhone = await searchLookupUsers(db, {
        query: "+97336124408",
        excludeUserIds: [],
      });
      expect(byPhone.map((row) => row.id)).toEqual([phoneOnly.id]);
      expect(byPhone[0]?.phoneNumber).toBe("+97336124408");
      expect(byPhone[0]?.email).toBeNull();

      const byEmail = await searchLookupUsers(db, {
        query: "nobody@example.com",
        excludeUserIds: [],
      });
      expect(byEmail).toEqual([]);

      const byExistingEmail = await searchLookupUsers(db, {
        query: "alex@example.com",
        excludeUserIds: [],
      });
      expect(byExistingEmail.map((row) => row.id)).toEqual([withEmail.id]);
      expect(byExistingEmail[0]?.email).toBe("alex@example.com");

      const stillStored = await db.query.user.findFirst({
        where: eq(user.id, phoneOnly.id),
      });
      expect(stillStored?.email).toBeNull();
    } finally {
      await close();
    }
  });
});

describe("Lookup invite search with Unclaimed players", () => {
  it("never returns an Unclaimed player, even by exact phone", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const [organizer] = await db
        .insert(user)
        .values({
          name: "Ali Organizer",
          email: "ali-organizer@example.com",
          clerkId: "user_ali_organizer",
        })
        .returning();
      const [unclaimed] = await db
        .insert(user)
        .values({
          name: "Ali Unclaimed",
          phoneNumber: "+97336124408",
          addedByUserId: organizer!.id,
          addedAt: new Date(),
        })
        .returning();
      const [legacy] = await db
        .insert(user)
        .values({ name: "Ali Legacy", phoneNumber: "+97336124409" })
        .returning();

      const byName = await searchLookupUsers(db, {
        query: "Ali",
        excludeUserIds: [],
      });
      expect(byName.map((row) => row.id).sort()).toEqual(
        [organizer!.id, legacy!.id].sort(),
      );

      expect(
        await searchLookupUsers(db, {
          query: "+97336124408",
          excludeUserIds: [],
        }),
      ).toEqual([]);

      expect(
        await searchLookupUsers(db, {
          query: "Ali",
          excludeUserIds: [],
          includeUserIds: [unclaimed!.id],
        }),
      ).toEqual([]);

      const boosted = await searchLookupUsers(db, {
        query: "Ali",
        excludeUserIds: [],
        boostUserIds: [unclaimed!.id],
        boostCue: "Group member",
      });
      expect(boosted.map((row) => row.id)).not.toContain(unclaimed!.id);
    } finally {
      await close();
    }
  });
});

describe("Lookup invite search never gives out contact details", () => {
  async function seed(db: TestDatabase) {
    const [nora] = await db
      .insert(user)
      .values({
        name: "Nora Newman",
        email: "nora@example.com",
        username: "nora_n",
        phoneNumber: "+97336124408",
      })
      .returning();
    const [omar] = await db
      .insert(user)
      .values({
        name: "Omar Haddad",
        email: "omar@example.com",
        username: "omar",
        phoneNumber: "+973 3900 1123",
      })
      .returning();
    if (!nora || !omar) {
      throw new Error("Failed to insert Users");
    }
    return { nora, omar };
  }

  it("matches nothing for an empty or one-letter query, or for wildcards", async () => {
    const { db, close } = await createPgliteDb();
    try {
      await seed(db);
      for (const query of ["", " ", "o", "%%", "__", "%", "\\\\"]) {
        expect(
          await searchLookupUsers(db, { query, excludeUserIds: [] }),
        ).toEqual([]);
      }
    } finally {
      await close();
    }
  });

  it("matches an email or phone only in full and returns only what was typed", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { nora, omar } = await seed(db);
      for (const query of [
        "@",
        "@example.com",
        "nora@",
        "example.com",
        "3612440",
        "+9733612",
        "39001",
      ]) {
        expect(
          await searchLookupUsers(db, { query, excludeUserIds: [] }),
        ).toEqual([]);
      }

      const byEmail = await searchLookupUsers(db, {
        query: " NORA@Example.com ",
        excludeUserIds: [],
      });
      expect(byEmail).toEqual([
        expect.objectContaining({
          id: nora.id,
          email: "nora@example.com",
          phoneNumber: null,
        }),
      ]);

      for (const query of ["+973 3612 4408", "36124408", "0097336124408"]) {
        expect(
          await searchLookupUsers(db, { query, excludeUserIds: [] }),
        ).toEqual([
          expect.objectContaining({
            id: nora.id,
            email: null,
            phoneNumber: "+97336124408",
          }),
        ]);
      }
      expect(
        await searchLookupUsers(db, { query: "39001123", excludeUserIds: [] }),
      ).toEqual([
        expect.objectContaining({ id: omar.id, phoneNumber: "+973 3900 1123" }),
      ]);

      const byName = await searchLookupUsers(db, {
        query: "ora_",
        excludeUserIds: [],
      });
      expect(byName).toEqual([
        expect.objectContaining({
          id: nora.id,
          email: null,
          phoneNumber: null,
        }),
      ]);
    } finally {
      await close();
    }
  });

  it("matches by name only inside the name scope, and by contact anywhere", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { nora, omar } = await seed(db);
      const ids = async (query: string, nameScopeUserIds: string[]) =>
        (
          await searchLookupUsers(db, {
            query,
            excludeUserIds: [],
            nameScopeUserIds,
          })
        ).map((row) => row.id);

      expect(await ids("nora", [])).toEqual([]);
      expect(await ids("nora", [omar.id])).toEqual([]);
      expect(await ids("ma", [omar.id])).toEqual([omar.id]);
      expect(await ids("ma", [omar.id, nora.id])).toEqual([nora.id, omar.id]);
      expect(await ids("nora@example.com", [])).toEqual([nora.id]);
      expect(await ids("+97336124408", [omar.id])).toEqual([nora.id]);
    } finally {
      await close();
    }
  });
});

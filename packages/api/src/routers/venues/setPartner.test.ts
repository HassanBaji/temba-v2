import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { user, venueManagers, venues } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { createCaller } from "#src/root";
import { createTRPCContext } from "#src/trpc";
import { venueById } from "#src/routers/venues/byId";
import { listVenues } from "#src/routers/venues/list";
import { setPartner } from "#src/routers/venues/setPartner";

async function insertUser(
  database: TestDatabase,
  name: string,
  clerkId?: string,
) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${name.toLowerCase()}@example.com`, clerkId })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertVenue(
  database: TestDatabase,
  args: { name: string; archivedAt?: Date },
) {
  const [row] = await database
    .insert(venues)
    .values({
      name: args.name,
      city: "Manama",
      country: "BH",
      archivedAt: args.archivedAt,
    })
    .returning({ id: venues.id });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

async function partnerColumns(database: TestDatabase, venueId: string) {
  const [row] = await database
    .select({ partnerAt: venues.partnerAt, partnerBy: venues.partnerBy })
    .from(venues)
    .where(eq(venues.id, venueId));
  return row;
}

function callerFor(
  database: TestDatabase,
  clerkId: string,
  metadata: Record<string, unknown> | undefined,
) {
  return createCaller(() =>
    createTRPCContext({
      db: database as unknown as Parameters<typeof createTRPCContext>[0]["db"],
      userId: clerkId,
      getPublicMetadata: async () => metadata,
      headers: new Headers(),
      webOrigin: "https://temba.example",
      locale: "en",
    }),
  );
}

describe("venues.setPartner", () => {
  it("refuses a Venue manager and a plain User", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const venue = await insertVenue(db, { name: "Club A" });
      const manager = await insertUser(db, "Manager", "clerk_manager");
      await insertUser(db, "Player", "clerk_player");
      await db
        .insert(venueManagers)
        .values({ venueId: venue.id, userId: manager.id });

      for (const [clerkId, metadata] of [
        ["clerk_manager", {}],
        ["clerk_player", undefined],
        ["clerk_player", { operator: false }],
      ] as const) {
        await expect(
          callerFor(db, clerkId, metadata).venues.setPartner({
            venueId: venue.id,
            partner: true,
          }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
      }

      expect(await partnerColumns(db, venue.id)).toEqual({
        partnerAt: null,
        partnerBy: null,
      });
    } finally {
      await close();
    }
  });

  it("records who marked the Venue and when, and clears both when turned off", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const venue = await insertVenue(db, { name: "Club A" });
      const operator = await insertUser(db, "Operator");

      await expect(
        setPartner(db, {
          venueId: venue.id,
          partner: true,
          operatorUserId: operator.id,
        }),
      ).resolves.toEqual({ id: venue.id, isPartner: true });
      const marked = await partnerColumns(db, venue.id);
      expect(marked?.partnerAt).toBeInstanceOf(Date);
      expect(marked?.partnerBy).toBe(operator.id);

      expect((await venueById(db, { venueId: venue.id })).isPartner).toBe(true);
      expect(
        (await listVenues(db)).find((row) => row.id === venue.id)?.isPartner,
      ).toBe(true);

      await expect(
        setPartner(db, {
          venueId: venue.id,
          partner: false,
          operatorUserId: operator.id,
        }),
      ).resolves.toEqual({ id: venue.id, isPartner: false });
      expect(await partnerColumns(db, venue.id)).toEqual({
        partnerAt: null,
        partnerBy: null,
      });
      expect((await venueById(db, { venueId: venue.id })).isPartner).toBe(
        false,
      );
    } finally {
      await close();
    }
  });

  it("keeps the first mark when set again", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const venue = await insertVenue(db, { name: "Club A" });
      const first = await insertUser(db, "First");
      const second = await insertUser(db, "Second");

      await setPartner(db, {
        venueId: venue.id,
        partner: true,
        operatorUserId: first.id,
      });
      const before = await partnerColumns(db, venue.id);
      await setPartner(db, {
        venueId: venue.id,
        partner: true,
        operatorUserId: second.id,
      });
      expect(await partnerColumns(db, venue.id)).toEqual(before);
    } finally {
      await close();
    }
  });

  it("refuses to make an archived Venue a partner, but lets it lose the mark", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const operator = await insertUser(db, "Operator");
      const archived = await insertVenue(db, {
        name: "Closed Club",
        archivedAt: new Date("2026-01-01T00:00:00Z"),
      });

      await expect(
        setPartner(db, {
          venueId: archived.id,
          partner: true,
          operatorUserId: operator.id,
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "An archived Venue cannot be a partner Venue",
      });
      expect(await partnerColumns(db, archived.id)).toEqual({
        partnerAt: null,
        partnerBy: null,
      });

      const live = await insertVenue(db, { name: "Club B" });
      await setPartner(db, {
        venueId: live.id,
        partner: true,
        operatorUserId: operator.id,
      });
      await db
        .update(venues)
        .set({ archivedAt: new Date() })
        .where(eq(venues.id, live.id));
      await expect(
        setPartner(db, {
          venueId: live.id,
          partner: false,
          operatorUserId: operator.id,
        }),
      ).resolves.toEqual({ id: live.id, isPartner: false });
    } finally {
      await close();
    }
  });

  it("is NOT_FOUND for an unknown Venue", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const operator = await insertUser(db, "Operator");
      await expect(
        setPartner(db, {
          venueId: crypto.randomUUID(),
          partner: true,
          operatorUserId: operator.id,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    } finally {
      await close();
    }
  });
});

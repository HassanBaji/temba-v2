import { venues } from "@repo/db/schema";
import { describe, expect, it } from "vitest";

import { commit, consult } from "#src/soft-archive";
import { liveVenuesWhere } from "#src/soft-archive/adapter";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

async function insertVenue(
  database: TestDatabase,
  name: string,
  archivedAt: Date | null = null,
) {
  const [row] = await database
    .insert(venues)
    .values({
      name,
      city: "Lisbon",
      country: "PT",
      archivedAt,
    })
    .returning({
      id: venues.id,
      archivedAt: venues.archivedAt,
    });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

describe("Soft-archive Venue", () => {
  it("commits archive and unarchive and answers freeze kinds", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const venue = await insertVenue(db, "Padel Club");

      const live = await consult(db, { venueId: venue.id });
      expect(live.ok && live.phase === "live").toBe(true);
      if (!live.ok) {
        return;
      }
      expect(live.freeze("join")).toBe(false);
      expect(live.freeze("catalog")).toBe(false);
      expect(live.freeze("host")).toBe(false);

      const archived = await commit(db, { venueId: venue.id }, "archived");
      expect(archived.ok && archived.phase === "archived").toBe(true);

      const frozen = await consult(db, { venueId: venue.id });
      expect(frozen.ok).toBe(true);
      if (!frozen.ok) {
        return;
      }
      expect(frozen.phase).toBe("archived");
      expect(frozen.archivedAt).toBeInstanceOf(Date);
      expect(frozen.freeze("join")).toBe(true);
      expect(frozen.freeze("catalog")).toBe(true);
      expect(frozen.freeze("host")).toBe(true);

      const snapshot = consult({ archivedAt: frozen.archivedAt });
      expect(snapshot.phase).toBe("archived");
      expect(snapshot.freeze("join")).toBe(true);
      expect(consult({ archivedAt: null }).freeze("host")).toBe(false);

      const restored = await commit(db, { venueId: venue.id }, "live");
      expect(restored).toMatchObject({
        ok: true,
        phase: "live",
        archivedAt: null,
      });
    } finally {
      await close();
    }
  });

  it("hides Soft-archived Venues from the live catalog WHERE helper", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const live = await insertVenue(db, "Live Court");
      const hidden = await insertVenue(db, "Hidden Court");
      await commit(db, { venueId: hidden.id }, "archived");

      const rows = await db.query.venues.findMany({
        where: liveVenuesWhere(),
        columns: { id: true },
      });
      const ids = rows.map((row) => row.id);
      expect(ids).toContain(live.id);
      expect(ids).not.toContain(hidden.id);
    } finally {
      await close();
    }
  });

  it("returns domain outcomes for missing and no-op Venue commits", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const venue = await insertVenue(db, "Outcome Court");

      await expect(
        consult(db, {
          venueId: "00000000-0000-4000-8000-000000000099",
        }),
      ).resolves.toEqual({ ok: false, reason: "not_found" });

      await expect(
        commit(
          db,
          { venueId: "00000000-0000-4000-8000-000000000099" },
          "archived",
        ),
      ).resolves.toEqual({ ok: false, reason: "not_found" });

      await expect(commit(db, { venueId: venue.id }, "live")).resolves.toEqual({
        ok: false,
        reason: "already_live",
      });

      await commit(db, { venueId: venue.id }, "archived");
      await expect(
        commit(db, { venueId: venue.id }, "archived"),
      ).resolves.toEqual({ ok: false, reason: "already_archived" });
    } finally {
      await close();
    }
  });
});

import { describe, expect, it } from "vitest";

import { courts, user, venueManagers, venues } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { PRICE_PER_PLAYER_MAX_FILS } from "@repo/domain/price-per-player";

import { managedVenueById } from "#src/routers/venues/managedById";
import { setPricingRules } from "#src/routers/venues/setPricingRules";
import { updateBookingSettings } from "#src/routers/venues/updateBookingSettings";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

async function seed(database: TestDatabase) {
  const [manager] = await database
    .insert(user)
    .values({ name: "Manager", email: "manager@example.com" })
    .returning({ id: user.id });
  const [other] = await database
    .insert(user)
    .values({ name: "Other", email: "other@example.com" })
    .returning({ id: user.id });
  const [mine] = await database
    .insert(venues)
    .values({ name: "Mine", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  const [theirs] = await database
    .insert(venues)
    .values({ name: "Theirs", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  if (!manager || !other || !mine || !theirs) {
    throw new Error("seed failed");
  }
  await database
    .insert(venueManagers)
    .values({ venueId: mine.id, userId: manager.id });
  const [court1, court2] = await database
    .insert(courts)
    .values([
      { venueId: mine.id, name: "Court 1" },
      { venueId: mine.id, name: "Court 2" },
    ])
    .returning({ id: courts.id });
  const [theirCourt] = await database
    .insert(courts)
    .values({ venueId: theirs.id, name: "Court X" })
    .returning({ id: courts.id });
  if (!court1 || !court2 || !theirCourt) {
    throw new Error("seed failed");
  }
  return {
    mine: mine.id,
    court1: court1.id,
    court2: court2.id,
    theirCourt: theirCourt.id,
    manager: { userId: manager.id, publicMetadata: undefined },
    stranger: { userId: other.id, publicMetadata: undefined },
    operator: { userId: other.id, publicMetadata: { operator: true } },
  };
}

async function withDb(
  run: (
    database: TestDatabase,
    s: Awaited<ReturnType<typeof seed>>,
  ) => Promise<void>,
) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db, await seed(db));
  } finally {
    await close();
  }
}

const rejects = (promise: Promise<unknown>, message: string | RegExp) =>
  expect(promise).rejects.toThrow(message);

const base = {
  weekdays: ALL_DAYS,
  startMinutes: 0,
  endMinutes: 1440,
  hourlyRateFils: 10_000,
};

describe("setPricingRules", () => {
  it("replaces the whole set and managedById returns it", () =>
    withDb(async (db, s) => {
      const first = await setPricingRules(db, {
        venueId: s.mine,
        rules: [
          { ...base, label: " Base " },
          {
            ...base,
            courtId: s.court1,
            weekdays: [5, 1, 1],
            startMinutes: 1020,
            endMinutes: 1320,
            hourlyRateFils: 16_000,
          },
        ],
        actor: s.manager,
      });
      expect(first).toHaveLength(2);
      expect(first.find((rule) => rule.courtId === s.court1)?.weekdays).toEqual(
        [1, 5],
      );
      expect(first.find((rule) => rule.courtId === null)?.label).toBe("Base");

      const keep = first.find((rule) => rule.courtId === null)!;
      const second = await setPricingRules(db, {
        venueId: s.mine,
        rules: [{ ...base, id: keep.id, hourlyRateFils: 12_000 }],
        actor: s.manager,
      });
      expect(second).toHaveLength(1);
      expect(second[0]).toMatchObject({ id: keep.id, hourlyRateFils: 12_000 });

      const managed = await managedVenueById(db, {
        venueId: s.mine,
        ...s.manager,
      });
      expect(managed.pricingRules).toHaveLength(1);

      expect(
        await setPricingRules(db, {
          venueId: s.mine,
          rules: [],
          actor: s.manager,
        }),
      ).toEqual([]);
    }));

  it("refuses overlapping rules on the same scope", () =>
    withDb(async (db, s) => {
      await rejects(
        setPricingRules(db, {
          venueId: s.mine,
          rules: [
            { ...base, endMinutes: 900 },
            { ...base, startMinutes: 840, weekdays: [3] },
          ],
          actor: s.manager,
        }),
        /must not overlap/,
      );
      await rejects(
        setPricingRules(db, {
          venueId: s.mine,
          rules: [
            { ...base, courtId: s.court1, endMinutes: 900 },
            { ...base, courtId: s.court1, startMinutes: 840, weekdays: [3] },
          ],
          actor: s.manager,
        }),
        /must not overlap/,
      );
    }));

  it("refuses an overnight rule that runs into the next day's rule", () =>
    withDb(async (db, s) => {
      await rejects(
        setPricingRules(db, {
          venueId: s.mine,
          rules: [
            { ...base, weekdays: [6], startMinutes: 1320, endMinutes: 1560 },
            { ...base, weekdays: [0], startMinutes: 0, endMinutes: 240 },
          ],
          actor: s.manager,
        }),
        /must not overlap/,
      );
      await setPricingRules(db, {
        venueId: s.mine,
        rules: [
          { ...base, weekdays: [6], startMinutes: 1320, endMinutes: 1560 },
          { ...base, weekdays: [0], startMinutes: 360, endMinutes: 1440 },
        ],
        actor: s.manager,
      });
    }));

  it("refuses a rule that overlaps itself across days", () =>
    withDb(async (db, s) => {
      await rejects(
        setPricingRules(db, {
          venueId: s.mine,
          rules: [{ ...base, endMinutes: 1800 }],
          actor: s.manager,
        }),
        /must not overlap/,
      );
    }));

  it("allows the same weekday and time on different Courts and a Court override of the Venue rule", () =>
    withDb(async (db, s) => {
      const saved = await setPricingRules(db, {
        venueId: s.mine,
        rules: [
          base,
          { ...base, courtId: s.court1, hourlyRateFils: 20_000 },
          { ...base, courtId: s.court2, hourlyRateFils: 30_000 },
        ],
        actor: s.manager,
      });
      expect(saved).toHaveLength(3);
    }));

  it("refuses negative rates and rates above the cap", () =>
    withDb(async (db, s) => {
      await rejects(
        setPricingRules(db, {
          venueId: s.mine,
          rules: [{ ...base, hourlyRateFils: -1 }],
          actor: s.manager,
        }),
        /cannot be negative/,
      );
      await rejects(
        setPricingRules(db, {
          venueId: s.mine,
          rules: [{ ...base, hourlyRateFils: PRICE_PER_PLAYER_MAX_FILS + 1 }],
          actor: s.manager,
        }),
        /too large/,
      );
      await setPricingRules(db, {
        venueId: s.mine,
        rules: [{ ...base, hourlyRateFils: PRICE_PER_PLAYER_MAX_FILS }],
        actor: s.manager,
      });
    }));

  it.each([
    ["no weekdays", { weekdays: [] }, /at least one weekday/],
    ["weekday out of range", { weekdays: [7] }, /at least one weekday/],
    [
      "end before start",
      { startMinutes: 600, endMinutes: 600 },
      /end after it starts/,
    ],
    ["past 06:00 next day", { endMinutes: 1830 }, /06:00 the next day/],
    ["off the grid", { startMinutes: 10 }, /30-minute grid/],
  ])("refuses %s", (_name, patch, message) =>
    withDb(async (db, s) => {
      await rejects(
        setPricingRules(db, {
          venueId: s.mine,
          rules: [{ ...base, ...patch }],
          actor: s.manager,
        }),
        message,
      );
    }),
  );

  it("refuses a Court from another Venue", () =>
    withDb(async (db, s) => {
      await rejects(
        setPricingRules(db, {
          venueId: s.mine,
          rules: [{ ...base, courtId: s.theirCourt }],
          actor: s.manager,
        }),
        /not in this Venue/,
      );
    }));

  it("is limited to managers of the Venue and Operators", () =>
    withDb(async (db, s) => {
      await rejects(
        setPricingRules(db, {
          venueId: s.mine,
          rules: [base],
          actor: s.stranger,
        }),
        /Only Venue managers/,
      );
      await setPricingRules(db, {
        venueId: s.mine,
        rules: [base],
        actor: s.operator,
      });
    }));

  it("blocks changing the slot grid while a rule is off the new grid", () =>
    withDb(async (db, s) => {
      await setPricingRules(db, {
        venueId: s.mine,
        rules: [{ ...base, startMinutes: 30 }],
        actor: s.manager,
      });
      await rejects(
        updateBookingSettings(db, {
          venueId: s.mine,
          slotMinutes: 60,
          durationOptionsMinutes: [60],
          actor: s.manager,
        }),
        /Pricing rules are not on the 60-minute grid/,
      );
    }));
});

import { describe, expect, it } from "vitest";

import {
  courts,
  user,
  venueClosures,
  venueManagers,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import {
  CANCELLATION_POLICY_PRESETS,
  type CancellationPolicy,
} from "@repo/validators/cancellation-policy";

import { addClosure } from "#src/routers/venues/addClosure";
import { managedVenueById } from "#src/routers/venues/managedById";
import { removeClosure } from "#src/routers/venues/removeClosure";
import { setOpeningHours } from "#src/routers/venues/setOpeningHours";
import { updateBookingSettings } from "#src/routers/venues/updateBookingSettings";
import { updateCancellationPolicy } from "#src/routers/venues/updateCancellationPolicy";

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
  const [theirCourt] = await database
    .insert(courts)
    .values({ venueId: theirs.id, name: "Court X" })
    .returning({ id: courts.id });
  if (!theirCourt) {
    throw new Error("seed failed");
  }
  return {
    mine: mine.id,
    theirs: theirs.id,
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

describe("setOpeningHours", () => {
  it("replaces a weekday's windows sorted, and an empty array closes the day", () =>
    withDb(async (db, s) => {
      const saved = await setOpeningHours(db, {
        venueId: s.mine,
        weekday: 1,
        windows: [
          { opensAtMinutes: 840, closesAtMinutes: 1320 },
          { opensAtMinutes: 480, closesAtMinutes: 720 },
        ],
        actor: s.manager,
      });
      expect(saved.map((w) => [w.opensAtMinutes, w.closesAtMinutes])).toEqual([
        [480, 720],
        [840, 1320],
      ]);
      await setOpeningHours(db, {
        venueId: s.mine,
        weekday: 2,
        windows: [{ opensAtMinutes: 0, closesAtMinutes: 1800 }],
        actor: s.manager,
      });
      const replaced = await setOpeningHours(db, {
        venueId: s.mine,
        weekday: 1,
        windows: [{ opensAtMinutes: 600, closesAtMinutes: 900 }],
        actor: s.manager,
      });
      expect(replaced).toHaveLength(1);
      expect(
        await setOpeningHours(db, {
          venueId: s.mine,
          weekday: 1,
          windows: [],
          actor: s.manager,
        }),
      ).toEqual([]);
      const managed = await managedVenueById(db, {
        venueId: s.mine,
        ...s.manager,
      });
      expect(managed.openingHours.map((w) => w.weekday)).toEqual([2]);
    }));

  it.each([
    [
      "overlap",
      [
        { opensAtMinutes: 480, closesAtMinutes: 720 },
        { opensAtMinutes: 690, closesAtMinutes: 900 },
      ],
      /must not overlap/,
    ],
    [
      "off-grid opens",
      [{ opensAtMinutes: 485, closesAtMinutes: 720 }],
      /30-minute grid/,
    ],
    [
      "off-grid closes",
      [{ opensAtMinutes: 480, closesAtMinutes: 725 }],
      /30-minute grid/,
    ],
    [
      "closes equals opens",
      [{ opensAtMinutes: 480, closesAtMinutes: 480 }],
      /after opening/,
    ],
    [
      "closes before opens",
      [{ opensAtMinutes: 600, closesAtMinutes: 480 }],
      /after opening/,
    ],
    [
      "closes past 1800",
      [{ opensAtMinutes: 600, closesAtMinutes: 1830 }],
      /06:00/,
    ],
  ])("refuses %s", (_name, windows, message) =>
    withDb(async (db, s) => {
      await rejects(
        setOpeningHours(db, {
          venueId: s.mine,
          weekday: 3,
          windows,
          actor: s.manager,
        }),
        message,
      );
    }),
  );

  it("accepts touching windows and a window to 1800", () =>
    withDb(async (db, s) => {
      const saved = await setOpeningHours(db, {
        venueId: s.mine,
        weekday: 5,
        windows: [
          { opensAtMinutes: 480, closesAtMinutes: 720 },
          { opensAtMinutes: 720, closesAtMinutes: 1800 },
        ],
        actor: s.manager,
      });
      expect(saved).toHaveLength(2);
    }));

  it("uses the Venue's slot grid", () =>
    withDb(async (db, s) => {
      await updateBookingSettings(db, {
        venueId: s.mine,
        slotMinutes: 60,
        durationOptionsMinutes: [60, 120],
        actor: s.manager,
      });
      await rejects(
        setOpeningHours(db, {
          venueId: s.mine,
          weekday: 0,
          windows: [{ opensAtMinutes: 510, closesAtMinutes: 720 }],
          actor: s.manager,
        }),
        /60-minute grid/,
      );
    }));

  it("refuses strangers and other Venues' managers, allows Operators", () =>
    withDb(async (db, s) => {
      const windows = [{ opensAtMinutes: 480, closesAtMinutes: 720 }];
      await rejects(
        setOpeningHours(db, {
          venueId: s.mine,
          weekday: 0,
          windows,
          actor: s.stranger,
        }),
        /Only Venue managers/,
      );
      await rejects(
        setOpeningHours(db, {
          venueId: s.theirs,
          weekday: 0,
          windows,
          actor: s.manager,
        }),
        /Only Venue managers/,
      );
      await expect(
        setOpeningHours(db, {
          venueId: s.mine,
          weekday: 0,
          windows,
          actor: s.operator,
        }),
      ).resolves.toHaveLength(1);
    }));

  it("refuses an invalid weekday and an unknown Venue", () =>
    withDb(async (db, s) => {
      await rejects(
        setOpeningHours(db, {
          venueId: s.mine,
          weekday: 7,
          windows: [],
          actor: s.operator,
        }),
        /Weekday/,
      );
      await rejects(
        setOpeningHours(db, {
          venueId: "00000000-0000-4000-8000-000000000000",
          weekday: 1,
          windows: [],
          actor: s.operator,
        }),
        /Venue not found/,
      );
    }));
});

describe("Closures", () => {
  const startsAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 4 * 60 * 60 * 1000);

  it("adds a whole-Venue Closure with no affected Bookings yet, lists it and removes it", () =>
    withDb(async (db, s) => {
      const created = await addClosure(db, {
        venueId: s.mine,
        startsAt,
        endsAt,
        reason: "Resurfacing",
        actor: s.manager,
      });
      expect(created.courtId).toBeNull();
      expect(created.affectedBookingIds).toEqual([]);
      const managed = await managedVenueById(db, {
        venueId: s.mine,
        ...s.manager,
      });
      expect(managed.closures.map((c) => c.id)).toEqual([created.id]);
      await expect(
        removeClosure(db, { closureId: created.id, actor: s.manager }),
      ).resolves.toEqual({ ok: true });
      expect(await db.select().from(venueClosures)).toHaveLength(0);
      await expect(
        removeClosure(db, { closureId: created.id, actor: s.manager }),
      ).resolves.toEqual({ ok: true });
    }));

  it("adds a per-Court Closure and refuses a Court on another Venue", () =>
    withDb(async (db, s) => {
      const [court] = await db
        .insert(courts)
        .values({ venueId: s.mine, name: "Court 1" })
        .returning({ id: courts.id });
      const created = await addClosure(db, {
        venueId: s.mine,
        courtId: court!.id,
        startsAt,
        endsAt,
        actor: s.manager,
      });
      expect(created.courtId).toBe(court!.id);
      await rejects(
        addClosure(db, {
          venueId: s.mine,
          courtId: s.theirCourt,
          startsAt,
          endsAt,
          actor: s.manager,
        }),
        /does not belong to this Venue/,
      );
    }));

  it("refuses a Closure that ends before it starts", () =>
    withDb(async (db, s) => {
      await rejects(
        addClosure(db, {
          venueId: s.mine,
          startsAt: endsAt,
          endsAt: startsAt,
          actor: s.manager,
        }),
        /must end after/,
      );
      await rejects(
        addClosure(db, {
          venueId: s.mine,
          startsAt,
          endsAt: startsAt,
          actor: s.manager,
        }),
        /must end after/,
      );
    }));

  it("keeps managers to their own Venue", () =>
    withDb(async (db, s) => {
      await rejects(
        addClosure(db, {
          venueId: s.mine,
          startsAt,
          endsAt,
          actor: s.stranger,
        }),
        /Only Venue managers/,
      );
      const created = await addClosure(db, {
        venueId: s.mine,
        startsAt,
        endsAt,
        actor: s.manager,
      });
      await rejects(
        removeClosure(db, { closureId: created.id, actor: s.stranger }),
        /Only Venue managers/,
      );
    }));
});

describe("updateBookingSettings", () => {
  it("refuses accepting bookings with no Court, then allows it with one", () =>
    withDb(async (db, s) => {
      await rejects(
        updateBookingSettings(db, {
          venueId: s.mine,
          acceptingBookings: true,
          actor: s.manager,
        }),
        /Add a Court/,
      );
      await db.insert(courts).values({ venueId: s.mine, name: "Court 1" });
      const updated = await updateBookingSettings(db, {
        venueId: s.mine,
        acceptingBookings: true,
        actor: s.manager,
      });
      expect(updated.acceptingBookings).toBe(true);
      const off = await updateBookingSettings(db, {
        venueId: s.mine,
        acceptingBookings: false,
        actor: s.manager,
      });
      expect(off.acceptingBookings).toBe(false);
    }));

  it("refuses accepting bookings on a Soft-archived Venue", () =>
    withDb(async (db, s) => {
      await db.insert(courts).values({ venueId: s.mine, name: "Court 1" });
      await db.update(venues).set({ archivedAt: new Date() });
      await rejects(
        updateBookingSettings(db, {
          venueId: s.mine,
          acceptingBookings: true,
          actor: s.manager,
        }),
        /archived/,
      );
    }));

  it("refuses a slot change while hours are off the new grid, and allows it once they fit", () =>
    withDb(async (db, s) => {
      await setOpeningHours(db, {
        venueId: s.mine,
        weekday: 1,
        windows: [{ opensAtMinutes: 510, closesAtMinutes: 720 }],
        actor: s.manager,
      });
      await rejects(
        updateBookingSettings(db, {
          venueId: s.mine,
          slotMinutes: 60,
          durationOptionsMinutes: [60],
          actor: s.manager,
        }),
        /Opening hours are not on the 60-minute grid/,
      );
      await setOpeningHours(db, {
        venueId: s.mine,
        weekday: 1,
        windows: [{ opensAtMinutes: 540, closesAtMinutes: 720 }],
        actor: s.manager,
      });
      const updated = await updateBookingSettings(db, {
        venueId: s.mine,
        slotMinutes: 60,
        durationOptionsMinutes: [60],
        actor: s.manager,
      });
      expect(updated.slotMinutes).toBe(60);
    }));

  it("refuses a slot change that leaves existing durations off the grid", () =>
    withDb(async (db, s) => {
      await rejects(
        updateBookingSettings(db, {
          venueId: s.mine,
          slotMinutes: 60,
          actor: s.manager,
        }),
        /multiples of 60/,
      );
    }));

  it.each([
    ["below 30", [20], /between 30 and 240/],
    ["above 240", [60, 300], /between 30 and 240/],
    ["not multiples of the slot", [45], /multiples of 30/],
    ["empty", [], /at least one/],
  ])("refuses durations %s", (_name, durations, message) =>
    withDb(async (db, s) => {
      await rejects(
        updateBookingSettings(db, {
          venueId: s.mine,
          durationOptionsMinutes: durations,
          actor: s.manager,
        }),
        message,
      );
    }),
  );

  it("sorts and de-duplicates durations and saves ranges and text", () =>
    withDb(async (db, s) => {
      const updated = await updateBookingSettings(db, {
        venueId: s.mine,
        durationOptionsMinutes: [120, 60, 60, 90],
        bookingHorizonDays: 30,
        minLeadMinutes: 0,
        description: "Indoor courts",
        bookingNotes: null,
        actor: s.manager,
      });
      expect(updated).toMatchObject({
        durationOptionsMinutes: [60, 90, 120],
        bookingHorizonDays: 30,
        minLeadMinutes: 0,
        description: "Indoor courts",
        bookingNotes: null,
      });
    }));

  it.each([
    [{ slotMinutes: 45 }, /30 or 60/],
    [{ bookingHorizonDays: 0 }, /between 1 and 90/],
    [{ bookingHorizonDays: 91 }, /between 1 and 90/],
    [{ minLeadMinutes: -1 }, /between 0 and 1440/],
    [{ minLeadMinutes: 1441 }, /between 0 and 1440/],
  ])("refuses out-of-range %j", (input, message) =>
    withDb(async (db, s) => {
      await rejects(
        updateBookingSettings(db, {
          venueId: s.mine,
          ...input,
          actor: s.manager,
        }),
        message,
      );
    }),
  );

  it("refuses strangers", () =>
    withDb(async (db, s) => {
      await rejects(
        updateBookingSettings(db, {
          venueId: s.mine,
          bookingHorizonDays: 7,
          actor: s.stranger,
        }),
        /Only Venue managers/,
      );
    }));
});

describe("updateCancellationPolicy", () => {
  it.each(CANCELLATION_POLICY_PRESETS)(
    "saves and returns the $label preset",
    (preset) =>
      withDb(async (db, s) => {
        const updated = await updateCancellationPolicy(db, {
          venueId: s.mine,
          policy: preset.policy,
          actor: s.manager,
        });
        expect(updated.cancellationPolicy).toEqual(preset.policy);
        const managed = await managedVenueById(db, {
          venueId: s.mine,
          ...s.manager,
        });
        expect(managed.cancellationPolicy).toEqual(preset.policy);
      }),
  );

  it("defaults a new Venue to the 24 h policy", () =>
    withDb(async (db, s) => {
      const managed = await managedVenueById(db, {
        venueId: s.mine,
        ...s.manager,
      });
      expect(managed.cancellationPolicy).toEqual(
        CANCELLATION_POLICY_PRESETS[0].policy,
      );
    }));

  it("refuses an invalid policy with a message", () =>
    withDb(async (db, s) => {
      const bad: CancellationPolicy = {
        tiers: [
          { hoursBefore: 12, refundPercent: 100 },
          { hoursBefore: 24, refundPercent: 50 },
        ],
        lateRefundPercent: 0,
        customerCancelUntilMinutes: 0,
      };
      await rejects(
        updateCancellationPolicy(db, {
          venueId: s.mine,
          policy: bad,
          actor: s.manager,
        }),
        /Tiers must run/,
      );
    }));

  it("refuses strangers", () =>
    withDb(async (db, s) => {
      await rejects(
        updateCancellationPolicy(db, {
          venueId: s.mine,
          policy: CANCELLATION_POLICY_PRESETS[2].policy,
          actor: s.stranger,
        }),
        /Only Venue managers/,
      );
    }));
});

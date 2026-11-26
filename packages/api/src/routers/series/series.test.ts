import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
  GameFormatEnum,
  GroupMemberRoleEnum,
  games,
  groupMembers,
  groupSeries,
  groups,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { messagesFor } from "@repo/i18n/messages";

import { SERIES_RUNNING_MAX } from "@repo/domain/series";

import { createSeries } from "#src/routers/series/create";
import { endSeries } from "#src/routers/series/end";
import { requireSeries } from "#src/series/series-link";

const NOW = new Date("2026-11-21T10:00:00Z");
const errors = messagesFor("en").series.errors;

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: email.split("@")[0] ?? "User", email })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertVenue(database: TestDatabase) {
  const [row] = await database
    .insert(venues)
    .values({ name: "Seef Padel", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

type Verification = "operator" | "club" | "none";

async function setUp(database: TestDatabase, verification: Verification) {
  const owner = await insertUser(database, "owner@example.com");
  const organizer = await insertUser(database, "organizer@example.com");
  const member = await insertUser(database, "member@example.com");
  const venue = await insertVenue(database);
  const [group] = await database
    .insert(groups)
    .values({
      name: "Tuesday Night Padel",
      createdBy: owner.id,
      sport: "padel",
      verifiedAt: verification === "operator" ? NOW : null,
      venueId: verification === "club" ? venue.id : null,
    })
    .returning({ id: groups.id });
  if (!group) {
    throw new Error("Failed to insert group");
  }
  await database.insert(groupMembers).values([
    { groupId: group.id, userId: owner.id },
    {
      groupId: group.id,
      userId: organizer.id,
      role: GroupMemberRoleEnum.ORGANIZER,
    },
    { groupId: group.id, userId: member.id },
  ]);
  return { owner, organizer, member, venue, group };
}

async function rejection(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(TRPCError);
  return error as TRPCError;
}

/** What the error formatter sends as `zodError.fieldErrors.name`. */
function nameFieldErrors(error: TRPCError) {
  return error.cause instanceof ZodError
    ? error.cause.flatten().fieldErrors.name
    : undefined;
}

function seriesArgs(groupId: string, userId: string, name = "Sunday Social") {
  return {
    groupId,
    userId,
    name,
    emblem: "cup" as const,
    colour: "gold" as const,
    now: NOW,
  };
}

async function attachGame(
  database: TestDatabase,
  args: {
    seriesId: string;
    groupId: string;
    venueId: string;
    createdBy: string;
    cancelledAt?: Date;
  },
) {
  await database.insert(games).values({
    name: "Sunday Social",
    format: GameFormatEnum.FRIENDLY_GAME,
    venueId: args.venueId,
    groupId: args.groupId,
    createdBy: args.createdBy,
    seriesId: args.seriesId,
    windowStart: NOW,
    cancelledAt: args.cancelledAt ?? null,
  });
}

describe("series.create", () => {
  it("lets the Group creator and an Appointed Organizer create, and refuses a member", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, organizer, member, group } = await setUp(db, "operator");

      const byOwner = await createSeries(db, {
        ...seriesArgs(group.id, owner.id, "  Sunday Social  "),
        emblem: "crown",
        colour: "teal",
      });
      const byOrganizer = await createSeries(
        db,
        seriesArgs(group.id, organizer.id, "Friday Classic"),
      );

      const rows = await db.query.groupSeries.findMany({
        where: eq(groupSeries.groupId, group.id),
      });
      expect(rows).toHaveLength(2);
      expect(rows.find((row) => row.id === byOwner.id)).toMatchObject({
        name: "Sunday Social",
        emblem: "crown",
        colour: "teal",
        createdBy: owner.id,
        endedAt: null,
      });
      expect(rows.find((row) => row.id === byOrganizer.id)).toMatchObject({
        name: "Friday Classic",
        createdBy: organizer.id,
      });

      const refused = await rejection(
        createSeries(db, seriesArgs(group.id, member.id, "Members' Cup")),
      );
      expect(refused.code).toBe("FORBIDDEN");
      expect(refused.message).toBe(messagesFor("en").group.errors.approverOnly);
    } finally {
      await close();
    }
  });

  it("lets a Club Group create", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, group } = await setUp(db, "club");
      const created = await createSeries(db, seriesArgs(group.id, owner.id));
      expect(created.id).toEqual(expect.any(String));
    } finally {
      await close();
    }
  });

  it("refuses a Group that is not Verified", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, group } = await setUp(db, "none");
      const refused = await rejection(
        createSeries(db, seriesArgs(group.id, owner.id)),
      );
      expect(refused.code).toBe("FORBIDDEN");
      expect(refused.message).toBe(errors.verifiedOnly);
    } finally {
      await close();
    }
  });

  it("refuses a running Series' name without case, and frees it once ended", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, group } = await setUp(db, "operator");
      const first = await createSeries(db, seriesArgs(group.id, owner.id));

      const taken = await rejection(
        createSeries(db, seriesArgs(group.id, owner.id, "sunday social")),
      );
      expect(taken.code).toBe("BAD_REQUEST");
      expect(taken.message).toBe(errors.nameTaken);
      expect(nameFieldErrors(taken)).toEqual([errors.nameTaken]);

      await db
        .update(groupSeries)
        .set({ endedAt: NOW, endedBy: owner.id })
        .where(eq(groupSeries.id, first.id));

      const again = await createSeries(
        db,
        seriesArgs(group.id, owner.id, "sunday social"),
      );
      expect(again.id).not.toBe(first.id);
    } finally {
      await close();
    }
  });

  it("refuses an empty name and one over the limit", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, group } = await setUp(db, "operator");
      const empty = await rejection(
        createSeries(db, seriesArgs(group.id, owner.id, "   ")),
      );
      expect(empty.message).toBe(errors.nameRequired);
      expect(nameFieldErrors(empty)).toEqual([errors.nameRequired]);
      const long = await rejection(
        createSeries(db, seriesArgs(group.id, owner.id, "a".repeat(41))),
      );
      expect(long.message).toBe(errors.nameTooLong(40));
      expect(nameFieldErrors(long)).toEqual([errors.nameTooLong(40)]);
    } finally {
      await close();
    }
  });

  it("refuses an eleventh running Series, and answers in Arabic", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, group } = await setUp(db, "operator");
      for (let index = 1; index <= SERIES_RUNNING_MAX; index += 1) {
        await createSeries(
          db,
          seriesArgs(group.id, owner.id, `Series ${index}`),
        );
      }

      const tooMany = await rejection(
        createSeries(db, seriesArgs(group.id, owner.id, "Series 11")),
      );
      expect(tooMany.code).toBe("BAD_REQUEST");
      expect(tooMany.message).toBe(errors.tooMany(SERIES_RUNNING_MAX));
      expect(nameFieldErrors(tooMany)).toBeUndefined();

      const inArabic = await rejection(
        createSeries(db, {
          ...seriesArgs(group.id, owner.id, "Series 11"),
          locale: "ar",
        }),
      );
      expect(inArabic.message).toBe(
        messagesFor("ar").series.errors.tooMany(SERIES_RUNNING_MAX),
      );
    } finally {
      await close();
    }
  });
});

describe("series.end", () => {
  it("ends a Series a Game points at, and refuses ending it twice", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, organizer, venue, group } = await setUp(db, "operator");
      const { id } = await createSeries(db, seriesArgs(group.id, owner.id));
      await attachGame(db, {
        seriesId: id,
        groupId: group.id,
        venueId: venue.id,
        createdBy: owner.id,
      });

      const result = await endSeries(db, {
        id,
        userId: organizer.id,
        now: NOW,
      });
      expect(result).toEqual({ ended: true });
      const row = await db.query.groupSeries.findFirst({
        where: eq(groupSeries.id, id),
      });
      expect(row).toMatchObject({ endedAt: NOW, endedBy: organizer.id });

      const twice = await rejection(
        endSeries(db, { id, userId: owner.id, now: NOW }),
      );
      expect(twice.code).toBe("BAD_REQUEST");
      expect(twice.message).toBe(errors.alreadyEnded);
    } finally {
      await close();
    }
  });

  it("keeps a Series whose only Game was cancelled", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, venue, group } = await setUp(db, "operator");
      const { id } = await createSeries(db, seriesArgs(group.id, owner.id));
      await attachGame(db, {
        seriesId: id,
        groupId: group.id,
        venueId: venue.id,
        createdBy: owner.id,
        cancelledAt: NOW,
      });

      expect(await endSeries(db, { id, userId: owner.id, now: NOW })).toEqual({
        ended: true,
      });
    } finally {
      await close();
    }
  });

  it("deletes a Series no Game ever pointed at", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, group } = await setUp(db, "operator");
      const { id } = await createSeries(db, seriesArgs(group.id, owner.id));

      expect(await endSeries(db, { id, userId: owner.id, now: NOW })).toEqual({
        deleted: true,
      });
      expect(
        await db.query.groupSeries.findFirst({ where: eq(groupSeries.id, id) }),
      ).toBeUndefined();
    } finally {
      await close();
    }
  });

  it("refuses a plain member", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, member, group } = await setUp(db, "operator");
      const { id } = await createSeries(db, seriesArgs(group.id, owner.id));

      const refused = await rejection(
        endSeries(db, { id, userId: member.id, now: NOW }),
      );
      expect(refused.code).toBe("FORBIDDEN");
      expect(
        await db.query.groupSeries.findFirst({ where: eq(groupSeries.id, id) }),
      ).toMatchObject({ endedAt: null });
    } finally {
      await close();
    }
  });

  it("ends a Series of a Group that is no longer Verified", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, venue, group } = await setUp(db, "operator");
      const { id } = await createSeries(db, seriesArgs(group.id, owner.id));
      await attachGame(db, {
        seriesId: id,
        groupId: group.id,
        venueId: venue.id,
        createdBy: owner.id,
      });
      await db
        .update(groups)
        .set({ verifiedAt: null })
        .where(eq(groups.id, group.id));

      expect(await endSeries(db, { id, userId: owner.id, now: NOW })).toEqual({
        ended: true,
      });
    } finally {
      await close();
    }
  });
});

describe("requireSeries", () => {
  it("finds a Series with its Group, and not one of a deleted Group", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, group } = await setUp(db, "operator");
      const { id } = await createSeries(db, seriesArgs(group.id, owner.id));

      const found = await requireSeries(db, id, "en");
      expect(found.group.id).toBe(group.id);

      await db
        .update(groups)
        .set({ deletedAt: NOW, deletedBy: owner.id })
        .where(eq(groups.id, group.id));

      const missing = await rejection(requireSeries(db, id, "en"));
      expect(missing.code).toBe("NOT_FOUND");
      expect(missing.message).toBe(errors.notFound);

      const ending = await rejection(
        endSeries(db, { id, userId: owner.id, now: NOW }),
      );
      expect(ending.code).toBe("NOT_FOUND");
    } finally {
      await close();
    }
  });

  it("does not find a Series that does not exist", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const missing = await rejection(
        requireSeries(db, "00000000-0000-4000-8000-000000000000", "en"),
      );
      expect(missing.code).toBe("NOT_FOUND");
    } finally {
      await close();
    }
  });
});

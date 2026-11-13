import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GroupMemberRoleEnum,
  groupMembers,
  groupTierEvents,
  groupTierPoints,
  groups,
  notifications,
  user,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { tierAdjustSheet } from "@repo/domain/tier-adjust";
import { tierTable, type TierStanding } from "@repo/domain/tier-bands";

import { loadNotificationItems } from "#src/notifications/load-notification-items";
import { adjustTierPoints } from "#src/routers/groups/adjustTierPoints";
import { groupById } from "#src/routers/groups/byId";

type ApiDb = Parameters<typeof adjustTierPoints>[0];

function apiDb(database: TestDatabase) {
  return database as unknown as ApiDb;
}

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({
      name,
      email: `${name.replace(/\s+/g, ".")}-${crypto.randomUUID()}@example.com`,
      clerkId: `user_${crypto.randomUUID()}`,
    })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row.id;
}

/** Thursday Football as the Members design draws it: eleven ranked and two Provisional. */
const THURSDAY: [string, number, number][] = [
  ["Hussain A", 1412, 10],
  ["Ali M", 1356, 10],
  ["Yousif K", 1301, 10],
  ["Mahmood S", 1248, 10],
  ["Jassim H", 1214, 10],
  ["You", 1201, 10],
  ["Salman R", 1187, 10],
  ["Ahmed N", 1160, 10],
  ["Bo Fareed", 1122, 10],
  ["Noor S", 1098, 10],
  ["Omar T", 1064, 10],
  ["Khalid R", 1200, 3],
  ["Majed J", 1200, 1],
];

async function seedThursday(
  database: TestDatabase,
  options: { sport?: "football" | "padel"; verified?: boolean } = {},
) {
  const ids: Record<string, string> = {};
  for (const [name] of THURSDAY) {
    ids[name] = await insertUser(database, name);
  }
  const owner = ids["Hussain A"]!;
  const [group] = await database
    .insert(groups)
    .values({
      name: "Thursday Football",
      createdBy: owner,
      sport: options.sport ?? "football",
      verifiedAt: options.verified ? new Date() : null,
    })
    .returning({ id: groups.id });
  const groupId = group!.id;
  const joined = new Date("2026-09-01T00:00:00Z");
  await database.insert(groupMembers).values(
    THURSDAY.map(([name], index) => ({
      groupId,
      userId: ids[name]!,
      role:
        name === "Yousif K"
          ? GroupMemberRoleEnum.ORGANIZER
          : GroupMemberRoleEnum.MEMBER,
      createdAt: new Date(joined.getTime() + index * 60_000),
    })),
  );
  const standings: TierStanding[] = THURSDAY.map(([name, points, games]) => ({
    userId: ids[name]!,
    points,
    gamesCounted: games,
    adjusted: false,
    joinedAt: null,
  }));
  const bandOf = new Map(
    tierTable(standings).rows.map((row) => [row.userId, row.band]),
  );
  await database.insert(groupTierPoints).values(
    standings.map((standing) => ({
      groupId,
      userId: standing.userId,
      points: standing.points,
      gamesCounted: standing.gamesCounted,
      band: bandOf.get(standing.userId) ?? null,
    })),
  );
  return { groupId, ids, owner };
}

async function rejection(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(TRPCError);
  return error as TRPCError;
}

async function notificationsOf(database: TestDatabase, userId: string) {
  return database
    .select({
      type: notifications.type,
      actorUserId: notifications.actorUserId,
    })
    .from(notifications)
    .where(eq(notifications.recipientUserId, userId));
}

async function pointsRow(
  database: TestDatabase,
  groupId: string,
  userId: string,
) {
  return database.query.groupTierPoints.findFirst({
    where: and(
      eq(groupTierPoints.groupId, groupId),
      eq(groupTierPoints.userId, userId),
    ),
  });
}

describe("groups.adjustTierPoints", () => {
  it("refuses a member who is not an Organizer, the Organizer's own points and a missing reason", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { groupId, ids, owner } = await seedThursday(db);
      const database = apiDb(db);
      const mahmood = ids["Mahmood S"]!;

      const notOrganizer = await rejection(
        adjustTierPoints(database, {
          groupId,
          organizerUserId: ids["Ali M"]!,
          userId: mahmood,
          points: 1300,
          reason: "correcting_a_mistake",
        }),
      );
      expect(notOrganizer.code).toBe("FORBIDDEN");

      const own = await rejection(
        adjustTierPoints(database, {
          groupId,
          organizerUserId: owner,
          userId: owner,
          points: 1500,
          reason: "correcting_a_mistake",
        }),
      );
      expect(own.code).toBe("BAD_REQUEST");
      expect(own.message).toBe("You can’t adjust your own tier points.");

      const appointedOwn = await rejection(
        adjustTierPoints(database, {
          groupId,
          organizerUserId: ids["Yousif K"]!,
          userId: ids["Yousif K"]!,
          points: 1350,
          reason: "correcting_a_mistake",
        }),
      );
      expect(appointedOwn.code).toBe("BAD_REQUEST");

      const noReason = await rejection(
        adjustTierPoints(database, {
          groupId,
          organizerUserId: owner,
          userId: mahmood,
          points: 1300,
          reason: undefined as never,
        }),
      );
      expect(noReason.code).toBe("BAD_REQUEST");
      expect(noReason.message).toBe("Pick a reason. The player will see it.");

      expect((await pointsRow(db, groupId, mahmood))?.points).toBe(1248);
      expect(
        await db
          .select()
          .from(groupTierEvents)
          .where(eq(groupTierEvents.kind, "adjustment")),
      ).toEqual([]);
    } finally {
      await close();
    }
  });

  it("refuses more than 400, no move, and a Group with no tier", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { groupId, ids, owner } = await seedThursday(db);
      const database = apiDb(db);
      const args = {
        groupId,
        organizerUserId: owner,
        userId: ids["Mahmood S"]!,
        reason: "correcting_a_mistake" as const,
      };
      expect(
        (await rejection(adjustTierPoints(database, { ...args, points: 1649 })))
          .code,
      ).toBe("BAD_REQUEST");
      expect(
        (await rejection(adjustTierPoints(database, { ...args, points: 1248 })))
          .code,
      ).toBe("BAD_REQUEST");
      await expect(
        adjustTierPoints(database, { ...args, points: 1648 }),
      ).resolves.toMatchObject({ delta: 400 });

      for (const options of [{ verified: true }, { sport: "padel" as const }]) {
        const other = await seedThursday(db, options);
        const error = await rejection(
          adjustTierPoints(database, {
            groupId: other.groupId,
            organizerUserId: other.owner,
            userId: other.ids["Mahmood S"]!,
            points: 1300,
            reason: "correcting_a_mistake",
          }),
        );
        expect(error.code).toBe("PRECONDITION_FAILED");
      }
    } finally {
      await close();
    }
  });

  it("ranks a Provisional member it adjusts", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { groupId, ids, owner } = await seedThursday(db);
      const khalid = ids["Khalid R"]!;
      const now = new Date("2026-11-11T18:00:00Z");

      const result = await adjustTierPoints(apiDb(db), {
        groupId,
        organizerUserId: owner,
        userId: khalid,
        points: 1250,
        reason: "new_to_group",
        note: "  Plays Div 1 on Mondays  ",
        now,
      });
      expect(result).toMatchObject({
        provisional: false,
        place: 4,
        band: "kanaad",
        rankedCount: 12,
      });

      const row = await pointsRow(db, groupId, khalid);
      expect(row).toMatchObject({
        points: 1250,
        gamesCounted: 3,
        confirmedAt: now,
        band: "kanaad",
      });

      const view = await groupById(db, { groupId, userId: ids["Ali M"]! });
      const tier = view.standing.leaderboard.find(
        (entry) => entry.userId === khalid,
      )?.tier;
      expect(tier).toMatchObject({
        provisional: false,
        place: 4,
        band: "kanaad",
        points: 1250,
      });

      const [event] = await db
        .select()
        .from(groupTierEvents)
        .where(
          and(
            eq(groupTierEvents.userId, khalid),
            eq(groupTierEvents.kind, "adjustment"),
          ),
        );
      expect(event).toMatchObject({
        groupId,
        delta: 50,
        pointsBefore: 1200,
        pointsAfter: 1250,
        bandBefore: null,
        bandAfter: "kanaad",
        placeAfter: 4,
        rankedCount: 12,
        setByUserId: owner,
        reason: "new_to_group",
        note: "Plays Div 1 on Mondays",
        matchId: null,
      });
    } finally {
      await close();
    }
  });

  it("makes a Kanaad who passes the second Hamour a Hamour and the passed player a Kanaad, one Notification each", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { groupId, ids, owner } = await seedThursday(db);
      const mahmood = ids["Mahmood S"]!;
      const yousif = ids["Yousif K"]!;
      const ali = ids["Ali M"]!;

      const result = await adjustTierPoints(apiDb(db), {
        groupId,
        organizerUserId: owner,
        userId: mahmood,
        points: 1310,
        reason: "plays_above_results",
      });
      expect(result).toMatchObject({ place: 3, band: "hamour", delta: 62 });

      expect((await pointsRow(db, groupId, mahmood))?.band).toBe("hamour");
      expect((await pointsRow(db, groupId, yousif))?.band).toBe("kanaad");

      const bandChanges = await db
        .select({
          userId: groupTierEvents.userId,
          bandBefore: groupTierEvents.bandBefore,
          bandAfter: groupTierEvents.bandAfter,
        })
        .from(groupTierEvents)
        .where(eq(groupTierEvents.kind, "band_change"));
      expect(bandChanges).toHaveLength(2);
      expect(bandChanges).toEqual(
        expect.arrayContaining([
          { userId: mahmood, bandBefore: "kanaad", bandAfter: "hamour" },
          { userId: yousif, bandBefore: "hamour", bandAfter: "kanaad" },
        ]),
      );

      expect(await notificationsOf(db, mahmood)).toEqual([
        { type: "tier_points_adjusted", actorUserId: owner },
      ]);
      expect(await notificationsOf(db, yousif)).toEqual([
        { type: "tier_band_changed", actorUserId: owner },
      ]);
      expect(await notificationsOf(db, ali)).toEqual([]);
      expect(await notificationsOf(db, owner)).toEqual([]);

      const [adjusted] = await loadNotificationItems(db, {
        where: eq(notifications.recipientUserId, mahmood),
        limit: 10,
      });
      expect(adjusted?.item.tier).toEqual({
        bandAfter: "hamour",
        pointsBefore: 1248,
        pointsAfter: 1310,
        delta: 62,
        ratingHundredths: null,
        reason: "plays_above_results",
        note: null,
      });
      const [passed] = await loadNotificationItems(db, {
        where: eq(notifications.recipientUserId, yousif),
        limit: 10,
      });
      expect(passed?.item.tier?.bandAfter).toBe("kanaad");
    } finally {
      await close();
    }
  });

  it("stores the place and band the Organizer's preview showed", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { groupId, ids, owner } = await seedThursday(db);
      const cases: [string, number][] = [
        ["Mahmood S", 62],
        ["Jassim H", -54],
        ["Majed J", 400],
        ["Noor S", 140],
        ["Ali M", -200],
      ];
      for (const [name, delta] of cases) {
        const view = await groupById(db, { groupId, userId: owner });
        const userId = ids[name]!;
        const sheet = tierAdjustSheet({
          members: view.standing.leaderboard.map((entry) => ({
            userId: entry.userId,
            name: entry.name ?? "",
            joinedAt: entry.joinedAt,
            tier: entry.tier,
          })),
          userId,
          delta,
          reason: "correcting_a_mistake",
          groupName: view.name ?? "",
          locale: "en",
        });
        expect(sheet?.delta).toBe(delta);

        const result = await adjustTierPoints(apiDb(db), {
          groupId,
          organizerUserId: owner,
          userId,
          points: sheet!.points,
          reason: "correcting_a_mistake",
        });
        expect({ place: result.place, band: result.band }).toEqual({
          place: Number(sheet!.placeLabel?.slice(1)),
          band: sheet!.band,
        });

        const after = await groupById(db, { groupId, userId: owner });
        expect(
          after.standing.leaderboard.find((entry) => entry.userId === userId)
            ?.tier,
        ).toMatchObject({ place: result.place, band: result.band });
      }
    } finally {
      await close();
    }
  });
});

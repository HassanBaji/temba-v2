import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  groupMembers,
  GroupMemberRoleEnum,
  groups,
  user,
} from "@repo/db/schema";

import { groupById } from "#src/routers/groups/byId";
import { createLoosePrivate } from "#src/routers/groups/createLoosePrivate";
import {
  leaveGroup,
  OWNER_CANNOT_LEAVE_MESSAGE,
} from "#src/routers/groups/leave";
import {
  ALREADY_OWNER_MESSAGE,
  NOT_A_MEMBER_MESSAGE,
  transferOwnership,
  UNCLAIMED_OWNER_MESSAGE,
} from "#src/routers/groups/transferOwnership";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

async function insertUser(
  database: TestDatabase,
  name: string,
  options?: { unclaimed?: boolean },
) {
  const [row] = await database
    .insert(user)
    .values({
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      clerkId: options?.unclaimed ? null : `user_${crypto.randomUUID()}`,
      addedAt: options?.unclaimed ? new Date() : null,
      phoneNumber: options?.unclaimed ? "+97336110001" : null,
    })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row.id;
}

async function rejection(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(TRPCError);
  return error as TRPCError;
}

async function seed(database: TestDatabase) {
  const owner = await insertUser(database, "Owner");
  const member = await insertUser(database, "Member");
  const ghost = await insertUser(database, "Ghost", { unclaimed: true });
  const outsider = await insertUser(database, "Outsider");
  const group = await createLoosePrivate(database, {
    name: "Thursday padel",
    sport: "padel",
    userId: owner,
  });
  await database.insert(groupMembers).values([
    { groupId: group.id, userId: member },
    { groupId: group.id, userId: ghost },
  ]);
  return { owner, member, ghost, outsider, group };
}

describe("transferOwnership", () => {
  it("hands the Group to a member and keeps the old owner as an Organizer", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);

      const result = await transferOwnership(db, {
        groupId: f.group.id,
        userId: f.owner,
        newOwnerUserId: f.member,
      });
      expect(result).toEqual({
        ok: true,
        groupId: f.group.id,
        previousOwnerId: f.owner,
        newOwnerId: f.member,
      });

      const row = await db.query.groups.findFirst({
        where: eq(groups.id, f.group.id),
      });
      expect(row?.createdBy).toBe(f.member);
      const previous = await db.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.groupId, f.group.id),
          eq(groupMembers.userId, f.owner),
        ),
      });
      expect(previous?.role).toBe(GroupMemberRoleEnum.ORGANIZER);

      const asNewOwner = await groupById(db, {
        groupId: f.group.id,
        userId: f.member,
      });
      expect(asNewOwner).toMatchObject({
        isOwner: true,
        canEdit: true,
        canDelete: true,
      });
      const asPrevious = await groupById(db, {
        groupId: f.group.id,
        userId: f.owner,
      });
      expect(asPrevious).toMatchObject({
        isOwner: false,
        canEdit: false,
        canAppointOrganizers: true,
      });
      expect(
        asPrevious.standing.leaderboard.find(
          (entry) => entry.userId === f.owner,
        )?.isAppointedOrganizer,
      ).toBe(true);
    } finally {
      await close();
    }
  });

  it("refuses a non-member, an Unclaimed player and the owner themself", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      expect(
        (
          await rejection(
            transferOwnership(db, {
              groupId: f.group.id,
              userId: f.owner,
              newOwnerUserId: f.outsider,
            }),
          )
        ).message,
      ).toBe(NOT_A_MEMBER_MESSAGE);
      expect(
        (
          await rejection(
            transferOwnership(db, {
              groupId: f.group.id,
              userId: f.owner,
              newOwnerUserId: f.ghost,
            }),
          )
        ).message,
      ).toBe(UNCLAIMED_OWNER_MESSAGE);
      expect(
        (
          await rejection(
            transferOwnership(db, {
              groupId: f.group.id,
              userId: f.owner,
              newOwnerUserId: f.owner,
            }),
          )
        ).message,
      ).toBe(ALREADY_OWNER_MESSAGE);
    } finally {
      await close();
    }
  });

  it("never leaves the Group owned by someone who left while it was handed to them", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);

      const results = await Promise.allSettled([
        transferOwnership(db, {
          groupId: f.group.id,
          userId: f.owner,
          newOwnerUserId: f.member,
        }),
        leaveGroup(db, { groupId: f.group.id, userId: f.member }),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);

      const group = await db.query.groups.findFirst({
        where: eq(groups.id, f.group.id),
        columns: { createdBy: true },
      });
      const ownerMembership = await db.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.groupId, f.group.id),
          eq(groupMembers.userId, group!.createdBy),
        ),
      });
      expect(ownerMembership).toBeTruthy();
    } finally {
      await close();
    }
  });

  it("only the owner may transfer", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      const error = await rejection(
        transferOwnership(db, {
          groupId: f.group.id,
          userId: f.member,
          newOwnerUserId: f.member,
        }),
      );
      expect(error.code).toBe("FORBIDDEN");
    } finally {
      await close();
    }
  });
});

describe("leaveGroup for the owner", () => {
  it("asks the owner of a Loose Group to transfer first, then lets them go", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      const error = await rejection(
        leaveGroup(db, { groupId: f.group.id, userId: f.owner }),
      );
      expect(error.message).toBe(OWNER_CANNOT_LEAVE_MESSAGE);

      await transferOwnership(db, {
        groupId: f.group.id,
        userId: f.owner,
        newOwnerUserId: f.member,
      });
      await expect(
        leaveGroup(db, { groupId: f.group.id, userId: f.owner }),
      ).resolves.toMatchObject({ ok: true });
    } finally {
      await close();
    }
  });
});

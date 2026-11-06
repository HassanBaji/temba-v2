import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  groupMembers,
  GroupMemberRoleEnum,
  groups,
  user,
  venueManagers,
  venues,
} from "@repo/db/schema";

import { groupById } from "#src/routers/groups/byId";
import { createInviteLink } from "#src/routers/groups/createInviteLink";
import { createLoosePrivate } from "#src/routers/groups/createLoosePrivate";
import { listLookupInvites } from "#src/routers/groups/listLookupInvites";
import { sendLookupInvite } from "#src/routers/groups/sendLookupInvite";
import { setOrganizer } from "#src/routers/groups/setOrganizer";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const ORIGIN = "https://temba.test";

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      clerkId: `user_${crypto.randomUUID()}`,
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

async function seedLoose(database: TestDatabase) {
  const creator = await insertUser(database, "Creator");
  const organizer = await insertUser(database, "Organizer");
  const member = await insertUser(database, "Member");
  const outsider = await insertUser(database, "Outsider");
  const group = await createLoosePrivate(database, {
    name: "Thursday padel",
    sport: "padel",
    userId: creator,
  });
  await database.insert(groupMembers).values([
    {
      groupId: group.id,
      userId: organizer,
      role: GroupMemberRoleEnum.ORGANIZER,
    },
    { groupId: group.id, userId: member },
  ]);
  return { creator, organizer, member, outsider, groupId: group.id };
}

/** A Club Group: a Loose Group linked to a Venue, with an Appointed Organizer. */
async function seedClub(database: TestDatabase) {
  const manager = await insertUser(database, "Manager");
  const creator = await insertUser(database, "Club creator");
  const organizer = await insertUser(database, "Club organizer");
  const member = await insertUser(database, "Club member");
  const outsider = await insertUser(database, "Outsider");
  const [venue] = await database
    .insert(venues)
    .values({ name: "Padel Club", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  if (!venue) {
    throw new Error("Failed to insert venue");
  }
  await database
    .insert(venueManagers)
    .values({ venueId: venue.id, userId: manager });
  const group = await createLoosePrivate(database, {
    name: "Club squad",
    sport: "padel",
    userId: creator,
  });
  await database
    .update(groups)
    .set({ venueId: venue.id })
    .where(eq(groups.id, group.id));
  await database.insert(groupMembers).values([
    {
      groupId: group.id,
      userId: organizer,
      role: GroupMemberRoleEnum.ORGANIZER,
    },
    { groupId: group.id, userId: member },
  ]);
  return {
    manager,
    creator,
    organizer,
    member,
    outsider,
    venueId: venue.id,
    groupId: group.id,
  };
}

describe("Appointed Organizer invite doors", () => {
  it("on a Loose Group sends Lookup invites, mints Invite links and appoints others", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedLoose(db);

      const home = await groupById(db, {
        groupId: f.groupId,
        userId: f.organizer,
      });
      expect(home).toMatchObject({
        canManageLookupInvites: true,
        canManageInviteLinks: true,
        canAddPlayers: true,
        canRemovePlayers: true,
        canAppointOrganizers: true,
        canDelete: false,
      });

      const sent = await sendLookupInvite(db, {
        groupId: f.groupId,
        userId: f.organizer,
        userIds: [f.outsider],
      });
      expect(sent.sent).toHaveLength(1);
      expect(sent.refused).toEqual([]);
      expect(
        (
          await listLookupInvites(db, {
            groupId: f.groupId,
            userId: f.organizer,
          })
        ).map((invite) => invite.user.id),
      ).toEqual([f.outsider]);

      const link = await createInviteLink(db, {
        groupId: f.groupId,
        userId: f.organizer,
        origin: ORIGIN,
      });
      expect(link.inviteUrl.startsWith(ORIGIN)).toBe(true);

      await expect(
        setOrganizer(db, {
          groupId: f.groupId,
          approverUserId: f.organizer,
          userId: f.member,
          organizer: true,
        }),
      ).resolves.toMatchObject({ ok: true, organizer: true });

      const asMember = await rejection(
        sendLookupInvite(db, {
          groupId: f.groupId,
          userId: f.outsider,
          userIds: [f.member],
        }),
      );
      expect(asMember.code).toBe("FORBIDDEN");
    } finally {
      await close();
    }
  });

  it("on a Club Group has the same doors: invites anyone, mints Invite links, and the Venue manager has none", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedClub(db);

      const home = await groupById(db, {
        groupId: f.groupId,
        userId: f.organizer,
      });
      expect(home).toMatchObject({
        canManageLookupInvites: true,
        canManageInviteLinks: true,
        canAddPlayers: true,
        canRemovePlayers: true,
        canAppointOrganizers: true,
        canDelete: false,
        isLoose: false,
      });

      const sent = await sendLookupInvite(db, {
        groupId: f.groupId,
        userId: f.organizer,
        userIds: [f.outsider, f.member],
      });
      expect(sent.sent.map((invite) => invite.userId)).toEqual([f.outsider]);
      expect(sent.refused).toEqual([
        {
          name: "Club member",
          message: "User is already a member of this Group",
        },
      ]);

      const link = await createInviteLink(db, {
        groupId: f.groupId,
        userId: f.organizer,
        origin: ORIGIN,
      });
      expect(link.inviteUrl.startsWith(ORIGIN)).toBe(true);

      const asManager = await rejection(
        sendLookupInvite(db, {
          groupId: f.groupId,
          userId: f.manager,
          userIds: [f.outsider],
        }),
      );
      expect(asManager.code).toBe("FORBIDDEN");
      const managerLink = await rejection(
        createInviteLink(db, {
          groupId: f.groupId,
          userId: f.manager,
          origin: ORIGIN,
        }),
      );
      expect(managerLink.code).toBe("FORBIDDEN");
      const asMember = await rejection(
        createInviteLink(db, {
          groupId: f.groupId,
          userId: f.member,
          origin: ORIGIN,
        }),
      );
      expect(asMember.code).toBe("FORBIDDEN");
      expect(
        (await groupById(db, { groupId: f.groupId, userId: f.member }))
          .canManageInviteLinks,
      ).toBe(false);
    } finally {
      await close();
    }
  });
});

import type { UserWebhookEvent } from "@clerk/backend/webhooks";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { groupMembers, groups, user } from "@repo/db/schema";

import { anonymiseUserFromClerk } from "#src/auth/delete-clerk-user";
import { upsertUserFromClerk } from "#src/auth/sync-clerk-user";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";
import { createPgliteDb } from "@repo/db/testing";

type ClerkUserPayload = Extract<
  UserWebhookEvent,
  { type: "user.created" | "user.updated" }
>["data"];

function payload(id: string): ClerkUserPayload {
  return {
    id,
    username: "dana",
    first_name: "Dana",
    last_name: "Rowe",
    image_url: "https://img.clerk.com/photo.png",
    has_image: true,
    primary_email_address_id: "idn_email",
    primary_phone_number_id: "idn_phone",
    email_addresses: [
      {
        id: "idn_email",
        email_address: "dana@example.com",
        verification: { status: "verified" },
      },
    ],
    phone_numbers: [
      {
        id: "idn_phone",
        phone_number: "+97336000002",
        verification: { status: "verified" },
      },
    ],
    updated_at: 1_000,
  } as ClerkUserPayload;
}

describe("anonymiseUserFromClerk", () => {
  it("clears what identifies the person and keeps the row other records reference", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const created = await upsertUserFromClerk(db, payload("user_dana"));
      await db
        .update(user)
        .set({ addedAt: new Date(), homeArea: "Seef", nationality: "BH" })
        .where(eq(user.id, created.id));
      const [group] = await db
        .insert(groups)
        .values({ name: "Friday Night", createdBy: created.id })
        .returning({ id: groups.id });
      await db
        .insert(groupMembers)
        .values({ groupId: group!.id, userId: created.id });

      expect(await anonymiseUserFromClerk(db, "user_dana")).toBe(created.id);

      const row = await db.query.user.findFirst({
        where: eq(user.id, created.id),
      });
      expect(row).toMatchObject({
        clerkId: null,
        deletedClerkId: "user_dana",
        name: "Deleted player",
        firstName: null,
        lastName: null,
        email: null,
        username: null,
        phoneNumber: null,
        image: null,
        homeArea: null,
        nationality: null,
        emailNotifications: false,
      });
      expect(row?.deletedAt).toBeInstanceOf(Date);
      expect(row && isUnclaimed(row)).toBe(false);
      expect(
        await db.query.groupMembers.findMany({
          where: eq(groupMembers.userId, created.id),
        }),
      ).toHaveLength(1);
    } finally {
      await close();
    }
  });

  it("returns null for a Clerk id it does not know", async () => {
    const { db, close } = await createPgliteDb();
    try {
      expect(await anonymiseUserFromClerk(db, "user_unknown")).toBeNull();
    } finally {
      await close();
    }
  });

  it("is not undone by a user.updated delivered after it", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const created = await upsertUserFromClerk(db, payload("user_dana"));
      await anonymiseUserFromClerk(db, "user_dana");

      const late = await upsertUserFromClerk(db, {
        ...payload("user_dana"),
        updated_at: 2_000,
      });

      expect(late.id).toBe(created.id);
      const rows = await db.query.user.findMany();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ clerkId: null, email: null });
    } finally {
      await close();
    }
  });
});

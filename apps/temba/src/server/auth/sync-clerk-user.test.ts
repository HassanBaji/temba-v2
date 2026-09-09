import type { UserWebhookEvent } from "@clerk/nextjs/webhooks";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { user } from "@repo/db/schema";

import { upsertUserFromClerk } from "~/server/auth/sync-clerk-user";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

type ClerkUserPayload = Extract<
  UserWebhookEvent,
  { type: "user.created" | "user.updated" }
>["data"];

const CLERK_DEFAULT_IMAGE = "https://img.clerk.com/generated-default.png";
const CLERK_PHOTO = "https://img.clerk.com/chosen-photo.png";
const CLERK_PHOTO_REPLACED = "https://img.clerk.com/replaced-photo.png";

function clerkUser(overrides: {
  id?: string;
  has_image: boolean;
  image_url?: string;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
}): ClerkUserPayload {
  const emailId = "idn_email_1";
  const phoneId = "idn_phone_1";
  const email =
    overrides.email === undefined ? "alex@example.com" : overrides.email;
  const hasEmail = email != null && email.length > 0;
  const hasPhone = overrides.phone != null && overrides.phone.length > 0;

  return {
    id: overrides.id ?? "user_clerk_alex",
    username: overrides.username === undefined ? "alex" : overrides.username,
    first_name:
      overrides.first_name === undefined ? "Alex" : overrides.first_name,
    last_name:
      overrides.last_name === undefined ? "River" : overrides.last_name,
    image_url:
      overrides.image_url ??
      (overrides.has_image ? CLERK_PHOTO : CLERK_DEFAULT_IMAGE),
    has_image: overrides.has_image,
    primary_email_address_id: hasEmail ? emailId : null,
    primary_phone_number_id: hasPhone ? phoneId : null,
    email_addresses: hasEmail
      ? [
          {
            id: emailId,
            email_address: email,
            verification: { status: "verified" },
          },
        ]
      : [],
    phone_numbers: hasPhone
      ? [
          {
            id: phoneId,
            phone_number: overrides.phone,
            verification: { status: "verified" },
          },
        ]
      : [],
  } as ClerkUserPayload;
}

async function storedUser(database: TestDatabase, clerkId: string) {
  const row = await database.query.user.findFirst({
    where: eq(user.clerkId, clerkId),
  });
  if (!row) {
    throw new Error("Expected a Temba User for Clerk id " + clerkId);
  }
  return row;
}

describe("Clerk user.created / user.updated upsert", () => {
  it("persists the image URL on create when has_image is true", async () => {
    const { db, close } = await createPgliteDb();
    try {
      await upsertUserFromClerk(
        db,
        clerkUser({ has_image: true, image_url: CLERK_PHOTO }),
      );

      const row = await storedUser(db, "user_clerk_alex");
      expect(row.image).toBe(CLERK_PHOTO);
      expect(row.name).toBe("Alex River");
      expect(row.email).toBe("alex@example.com");
      expect(row.username).toBe("alex");
    } finally {
      await close();
    }
  });

  it("persists null on create when has_image is false, even if Clerk sent a generated URL", async () => {
    const { db, close } = await createPgliteDb();
    try {
      await upsertUserFromClerk(
        db,
        clerkUser({
          has_image: false,
          image_url: CLERK_DEFAULT_IMAGE,
        }),
      );

      const row = await storedUser(db, "user_clerk_alex");
      expect(row.image).toBeNull();
    } finally {
      await close();
    }
  });

  it("replaces the stored URL on update when has_image is true", async () => {
    const { db, close } = await createPgliteDb();
    try {
      await upsertUserFromClerk(
        db,
        clerkUser({ has_image: true, image_url: CLERK_PHOTO }),
      );
      await upsertUserFromClerk(
        db,
        clerkUser({ has_image: true, image_url: CLERK_PHOTO_REPLACED }),
      );

      const row = await storedUser(db, "user_clerk_alex");
      expect(row.image).toBe(CLERK_PHOTO_REPLACED);
    } finally {
      await close();
    }
  });

  it("clears the stored image on update when has_image is false after Remove", async () => {
    const { db, close } = await createPgliteDb();
    try {
      await upsertUserFromClerk(
        db,
        clerkUser({ has_image: true, image_url: CLERK_PHOTO }),
      );
      await upsertUserFromClerk(
        db,
        clerkUser({
          has_image: false,
          image_url: CLERK_DEFAULT_IMAGE,
        }),
      );

      const row = await storedUser(db, "user_clerk_alex");
      expect(row.image).toBeNull();
    } finally {
      await close();
    }
  });

  it("still syncs name, email, username, and phone on the same update", async () => {
    const { db, close } = await createPgliteDb();
    try {
      await upsertUserFromClerk(
        db,
        clerkUser({
          has_image: true,
          phone: "+15551234567",
        }),
      );
      await upsertUserFromClerk(
        db,
        clerkUser({
          has_image: false,
          image_url: CLERK_DEFAULT_IMAGE,
          first_name: "Sam",
          last_name: "Lee",
          username: "samlee",
          email: "sam@example.com",
          phone: "+15557654321",
        }),
      );

      const row = await storedUser(db, "user_clerk_alex");
      expect(row.image).toBeNull();
      expect(row.name).toBe("Sam Lee");
      expect(row.email).toBe("sam@example.com");
      expect(row.username).toBe("samlee");
      expect(row.phoneNumber).toBe("+15557654321");
      expect(row.phoneNumberVerified).toBe(true);
    } finally {
      await close();
    }
  });

  it("leaves Preferred Position and onboarding completion untouched", async () => {
    const { db, close } = await createPgliteDb();
    try {
      await upsertUserFromClerk(db, clerkUser({ has_image: true }));

      const created = await storedUser(db, "user_clerk_alex");
      expect(created.preferredPosition).toBeNull();
      expect(created.onboardingCompletedAt).toBeNull();

      const completedAt = new Date("2025-03-04T05:06:07.000Z");
      await db
        .update(user)
        .set({ preferredPosition: "left", onboardingCompletedAt: completedAt })
        .where(eq(user.id, created.id));

      await upsertUserFromClerk(
        db,
        clerkUser({
          has_image: false,
          first_name: "Sam",
          last_name: "Lee",
        }),
      );

      const row = await storedUser(db, "user_clerk_alex");
      expect(row.name).toBe("Sam Lee");
      expect(row.preferredPosition).toBe("left");
      expect(row.onboardingCompletedAt?.getTime()).toBe(completedAt.getTime());
    } finally {
      await close();
    }
  });

  it("writes a phone-only user.created payload", async () => {
    const { db, close } = await createPgliteDb();
    try {
      await upsertUserFromClerk(
        db,
        clerkUser({
          has_image: false,
          email: null,
          phone: "+97336124408",
          username: "phoneonly",
          first_name: null,
          last_name: null,
        }),
      );

      const row = await storedUser(db, "user_clerk_alex");
      expect(row.email).toBeNull();
      expect(row.emailVerified).toBe(false);
      expect(row.phoneNumber).toBe("+97336124408");
      expect(row.phoneNumberVerified).toBe(true);
      expect(row.username).toBe("phoneonly");
      expect(row.name).toBe("phoneonly");
    } finally {
      await close();
    }
  });

  it("matches a phone-only user.updated on phone when clerkId is missing", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const [seeded] = await db
        .insert(user)
        .values({
          name: "Seeded",
          email: null,
          phoneNumber: "+97336124408",
          username: "seededphone",
        })
        .returning();
      if (!seeded) {
        throw new Error("Failed to seed phone-only User");
      }

      await upsertUserFromClerk(
        db,
        clerkUser({
          id: "user_clerk_phone",
          has_image: false,
          email: null,
          phone: "+97336124408",
          username: "seededphone",
          first_name: "Mikael",
          last_name: "Karlsson",
        }),
      );

      const matches = await db.query.user.findMany({
        where: eq(user.phoneNumber, "+97336124408"),
      });
      expect(matches).toHaveLength(1);
      expect(matches[0]?.id).toBe(seeded.id);
      expect(matches[0]?.clerkId).toBe("user_clerk_phone");
      expect(matches[0]?.name).toBe("Mikael Karlsson");
      expect(matches[0]?.email).toBeNull();
    } finally {
      await close();
    }
  });

  it("rejects a payload with neither email nor phone", async () => {
    const { db, close } = await createPgliteDb();
    try {
      await expect(
        upsertUserFromClerk(
          db,
          clerkUser({
            has_image: false,
            email: null,
            phone: null,
          }),
        ),
      ).rejects.toThrow(/email address or a phone number/i);
    } finally {
      await close();
    }
  });

  it("keeps email uniqueness and phone uniqueness", async () => {
    const { db, close } = await createPgliteDb();
    try {
      await upsertUserFromClerk(
        db,
        clerkUser({
          id: "user_one",
          has_image: false,
          email: "shared@example.com",
          phone: "+15550000001",
        }),
      );

      await expect(
        upsertUserFromClerk(
          db,
          clerkUser({
            id: "user_two",
            has_image: false,
            email: "shared@example.com",
            phone: "+15550000002",
            username: "other",
          }),
        ),
      ).rejects.toThrow(/Email already belongs/i);

      await expect(
        upsertUserFromClerk(
          db,
          clerkUser({
            id: "user_three",
            has_image: false,
            email: "other@example.com",
            phone: "+15550000001",
            username: "third",
          }),
        ),
      ).rejects.toThrow(/Phone number already belongs/i);
    } finally {
      await close();
    }
  });

  it("does not rewrite an existing email row when applying phone-only sync to a different user", async () => {
    const { db, close } = await createPgliteDb();
    try {
      await upsertUserFromClerk(
        db,
        clerkUser({
          id: "user_email_row",
          has_image: false,
          email: "keep@example.com",
          username: "keepemail",
        }),
      );

      await upsertUserFromClerk(
        db,
        clerkUser({
          id: "user_phone_row",
          has_image: false,
          email: null,
          phone: "+97339990000",
          username: "newphone",
          first_name: null,
          last_name: null,
        }),
      );

      const emailRow = await storedUser(db, "user_email_row");
      const phoneRow = await storedUser(db, "user_phone_row");
      expect(emailRow.email).toBe("keep@example.com");
      expect(emailRow.phoneNumber).toBeNull();
      expect(phoneRow.email).toBeNull();
      expect(phoneRow.phoneNumber).toBe("+97339990000");
    } finally {
      await close();
    }
  });

  it("rejects a database row with neither email nor phone", async () => {
    const { db, close } = await createPgliteDb();
    try {
      await expect(
        db.insert(user).values({ name: "Nobody" }).returning(),
      ).rejects.toThrow();
    } finally {
      await close();
    }
  });
});

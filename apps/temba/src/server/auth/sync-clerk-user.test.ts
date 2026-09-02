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
  email?: string;
  phone?: string | null;
}): ClerkUserPayload {
  const emailId = "idn_email_1";
  const phoneId = "idn_phone_1";
  const email = overrides.email ?? "alex@example.com";
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
    primary_email_address_id: emailId,
    primary_phone_number_id: hasPhone ? phoneId : null,
    email_addresses: [
      {
        id: emailId,
        email_address: email,
        verification: { status: "verified" },
      },
    ],
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
});

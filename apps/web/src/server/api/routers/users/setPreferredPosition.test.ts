import { user } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  preferredPositionSchema,
  writePreferredPosition,
} from "~/server/api/routers/users/setPreferredPosition";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

async function insertUser(database: TestDatabase, clerkId: string) {
  const [row] = await database
    .insert(user)
    .values({
      name: clerkId,
      email: `${clerkId}@example.com`,
      clerkId,
    })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function storedPosition(database: TestDatabase, userId: string) {
  const row = await database.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { preferredPosition: true },
  });
  return row?.preferredPosition ?? null;
}

describe("writePreferredPosition", () => {
  it("writes each of left, right, and either", async () => {
    const { db, close } = await createPgliteDb();
    try {
      for (const position of ["left", "right", "either"] as const) {
        const appUser = await insertUser(db, `preferred_${position}`);
        const result = await writePreferredPosition(db, {
          userId: appUser.id,
          preferredPosition: position,
        });

        expect(result.preferredPosition).toBe(position);
        expect(await storedPosition(db, appUser.id)).toBe(position);
      }
    } finally {
      await close();
    }
  });

  it("is re-callable — a Preferred Position is a default, not a once-only answer", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const appUser = await insertUser(db, "preferred_re_editable");

      await writePreferredPosition(db, {
        userId: appUser.id,
        preferredPosition: "left",
      });
      await writePreferredPosition(db, {
        userId: appUser.id,
        preferredPosition: "right",
      });
      const last = await writePreferredPosition(db, {
        userId: appUser.id,
        preferredPosition: "either",
      });

      expect(last.preferredPosition).toBe("either");
      expect(await storedPosition(db, appUser.id)).toBe("either");
    } finally {
      await close();
    }
  });

  it("leaves onboarding completion alone", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const appUser = await insertUser(db, "preferred_no_completion");
      await writePreferredPosition(db, {
        userId: appUser.id,
        preferredPosition: "left",
      });

      const row = await db.query.user.findFirst({
        where: eq(user.id, appUser.id),
        columns: { onboardingCompletedAt: true },
      });
      expect(row?.onboardingCompletedAt).toBeNull();
    } finally {
      await close();
    }
  });
});

describe("setPreferredPosition input", () => {
  it("accepts the three answers and rejects anything else", () => {
    expect(preferredPositionSchema.safeParse("left").success).toBe(true);
    expect(preferredPositionSchema.safeParse("right").success).toBe(true);
    expect(preferredPositionSchema.safeParse("either").success).toBe(true);
    expect(preferredPositionSchema.safeParse("both").success).toBe(false);
    expect(preferredPositionSchema.safeParse("").success).toBe(false);
    expect(preferredPositionSchema.safeParse(null).success).toBe(false);
  });
});

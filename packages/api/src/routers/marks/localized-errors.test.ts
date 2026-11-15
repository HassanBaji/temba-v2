import { randomUUID } from "node:crypto";

import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import { createPgliteDb } from "@repo/db/testing";
import { messagesFor } from "@repo/i18n/messages";

import { cabinet } from "#src/routers/marks/cabinet";

const ar = messagesFor("ar");

async function refusal(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    if (error instanceof TRPCError) {
      return { code: error.code, message: error.message };
    }
    throw error;
  }
  throw new Error("Expected a refusal");
}

describe("marks refusals in Arabic", () => {
  it("names the missing player in Arabic", async () => {
    const { db, close } = await createPgliteDb();
    try {
      expect(
        await refusal(
          cabinet(db, {
            viewerId: randomUUID(),
            playerId: randomUUID(),
            locale: "ar",
          }),
        ),
      ).toEqual({
        code: "NOT_FOUND",
        message: ar.profile.errors.playerNotFound,
      });
    } finally {
      await close();
    }
  });
});

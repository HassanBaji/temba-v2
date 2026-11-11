import { randomUUID } from "node:crypto";

import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import { createPgliteDb } from "@repo/db/testing";
import { messagesFor } from "@repo/i18n/messages";

import { venueById } from "#src/routers/venues/byId";

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

describe("venues refusals in Arabic", () => {
  it("names the missing Venue in Arabic", async () => {
    const { db, close } = await createPgliteDb();
    try {
      expect(
        await refusal(venueById(db, { venueId: randomUUID(), locale: "ar" })),
      ).toEqual({ code: "NOT_FOUND", message: ar.venue.errors.notFound });
    } finally {
      await close();
    }
  });
});

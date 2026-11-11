import { randomUUID } from "node:crypto";

import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import { createPgliteDb } from "@repo/db/testing";
import { messagesFor } from "@repo/i18n/messages";

import { dissolve } from "#src/routers/teams/dissolve";

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

describe("teams refusals in Arabic", () => {
  it("names the missing Team in Arabic", async () => {
    const { db, close } = await createPgliteDb();
    try {
      expect(
        await refusal(
          dissolve(db, {
            teamId: randomUUID(),
            userId: randomUUID(),
            locale: "ar",
          }),
        ),
      ).toEqual({ code: "NOT_FOUND", message: ar.team.notFound.title });
    } finally {
      await close();
    }
  });
});

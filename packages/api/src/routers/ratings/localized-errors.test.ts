import { randomUUID } from "node:crypto";

import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import { createPgliteDb } from "@repo/db/testing";
import { messagesFor } from "@repo/i18n/messages";

import { setLevelAsOperator } from "#src/routers/ratings/setLevelAsOperator";

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

describe("ratings refusals in Arabic", () => {
  it("refuses an Operator setting an unknown player's Level in Arabic", async () => {
    const { db, close } = await createPgliteDb();
    try {
      expect(
        await refusal(
          setLevelAsOperator(db, {
            operatorUserId: randomUUID(),
            targetUserId: randomUUID(),
            sport: "padel",
            levelTenths: 30,
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

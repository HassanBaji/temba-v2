import { randomUUID } from "node:crypto";

import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import { createPgliteDb } from "@repo/db/testing";
import { messagesFor } from "@repo/i18n/messages";

import { leaveGroup } from "#src/routers/groups/leave";

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

describe("groups refusals in Arabic", () => {
  it("names the missing Group in Arabic", async () => {
    const { db, close } = await createPgliteDb();
    try {
      expect(
        await refusal(
          leaveGroup(db, {
            groupId: randomUUID(),
            userId: randomUUID(),
            locale: "ar",
          }),
        ),
      ).toEqual({ code: "NOT_FOUND", message: ar.group.errors.notFound });
    } finally {
      await close();
    }
  });
});

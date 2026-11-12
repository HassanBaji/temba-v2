import { randomUUID } from "node:crypto";

import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import { user } from "@repo/db/schema";
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
  it("refuses an Operator setting their own Level in Arabic", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const operatorUserId = randomUUID();
      expect(
        await refusal(
          setLevelAsOperator(db, {
            operatorUserId,
            targetUserId: operatorUserId,
            sport: "padel",
            levelTenths: 30,
            locale: "ar",
          }),
        ),
      ).toEqual({ code: "BAD_REQUEST", message: ar.level.errors.ownLevel });
    } finally {
      await close();
    }
  });

  it("refuses an Operator's save with no reason in Arabic", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const [operator, player] = await db
        .insert(user)
        .values([
          { name: "Operator", email: `operator-${randomUUID()}@example.com` },
          { name: "Player", email: `player-${randomUUID()}@example.com` },
        ])
        .returning({ id: user.id });
      if (!operator || !player) {
        throw new Error("Failed to insert users");
      }
      expect(
        await refusal(
          setLevelAsOperator(db, {
            operatorUserId: operator.id,
            targetUserId: player.id,
            sport: "football",
            ovr: 71,
            locale: "ar",
          }),
        ),
      ).toEqual({
        code: "BAD_REQUEST",
        message: ar.level.errors.reasonRequired,
      });
    } finally {
      await close();
    }
  });
});

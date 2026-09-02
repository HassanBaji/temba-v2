import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { user } from "@repo/db";

import { assertUserPassesJoinGate, requireGame } from "~/server/games/access";
import { admit } from "~/server/games/admit";
import { assertCanRegisterWithPartner } from "~/server/games/helpers/assert-can-register-with-partner";
import { throwIfAdmitRefused } from "~/server/games/helpers/throw-if-admit-refused";
import { userAlreadyOnGame } from "~/server/games/helpers/user-already-on-game";
import { userAlreadyWaitlisted } from "~/server/games/helpers/user-already-waitlisted";
import {
  assertFullyVacantSide,
  firstFullyVacantSideIndex,
  remainingCapacity,
} from "~/server/games/seats";
import { enqueueWaitlistUser } from "~/server/games/waitlist";
import { userAllowedByLevelRange } from "~/server/games/user-allowed-by-level-range";
import { type db } from "~/server/db";
import type { SeatPosition } from "~/server/games/utils";
import {
  LEVEL_RANGE_OUTSIDE_MESSAGE,
  LEVEL_RANGE_PARTNER_MESSAGE,
} from "~/lib/level-range";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function registerWithPartner(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    partnerUserId: string;
    sideIndex?: number;
    position?: SeatPosition;
  },
) {
  const game = await requireGame(database, args.gameId);
  const now = new Date();
  await assertCanRegisterWithPartner(database, game, args.userId, now);

  const partner = await database.query.user.findFirst({
    where: eq(user.id, args.partnerUserId),
    columns: { id: true },
  });
  if (!partner) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "User not found",
    });
  }
  if (partner.id === args.userId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You cannot register with yourself",
    });
  }
  await assertUserPassesJoinGate(database, game, partner.id);

  if (await userAlreadyOnGame(database, game.id, partner.id)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "That User is already registered on this Game",
    });
  }
  if (await userAlreadyWaitlisted(database, game.id, partner.id)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "That User is already on the waitlist",
    });
  }

  if (!(await userAllowedByLevelRange(database, game, args.userId))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: LEVEL_RANGE_OUTSIDE_MESSAGE,
    });
  }
  if (!(await userAllowedByLevelRange(database, game, partner.id))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: LEVEL_RANGE_PARTNER_MESSAGE,
    });
  }

  const remaining = await remainingCapacity(database, game);

  if (remaining <= 0) {
    await database.transaction(async (tx) => {
      await enqueueWaitlistUser(tx, game.id, args.userId);
      await enqueueWaitlistUser(tx, game.id, partner.id);
    });
    return { ok: true as const, waitlisted: true as const };
  }
  if (remaining < 2) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Not enough seats; pick a seat",
    });
  }

  const vacantSide = await firstFullyVacantSideIndex(database, game);
  if (vacantSide == null) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No fully vacant side; pick a seat",
    });
  }
  if (args.sideIndex == null || args.position == null) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Pick a vacant side and your Position",
    });
  }
  const sideIndex = args.sideIndex;
  const position = args.position;
  await assertFullyVacantSide(database, game, sideIndex);

  await database.transaction(async (tx) => {
    throwIfAdmitRefused(
      await admit(tx, {
        game,
        door: "register",
        party: {
          kind: "pair",
          userIds: [args.userId, partner.id],
          sideIndex,
          callerPosition: position,
        },
        now,
      }),
      "pair",
    );
  });

  return { ok: true as const, waitlisted: false as const };
}

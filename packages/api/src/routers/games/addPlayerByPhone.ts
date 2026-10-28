import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { ASSIGNABLE_DISPLAY_LEVEL_BANDS } from "@repo/domain/level-bands";
import type { PadelLevelChoice } from "@repo/domain/onboarding-answers";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { admit } from "#src/games/admit";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import { assertOrganizerAddFormat } from "#src/games/assert-organizer-add-format";
import { throwIfAdmitRefused } from "#src/games/helpers/throw-if-admit-refused";
import { userAlreadyOnGame } from "#src/games/helpers/user-already-on-game";
import { userAlreadyWaitlisted } from "#src/games/helpers/user-already-waitlisted";
import type { SeatPosition } from "#src/games/utils";
import { gameNotificationsSuppressed } from "#src/notifications/game-notifications-suppressed";
import { notify } from "#src/notifications/notify";
import { createUnclaimedPlayer } from "#src/unclaimed-players/create-unclaimed-player";
import { requireE164 } from "#src/unclaimed-players/require-e164";
import { resolvePhonePlayer } from "#src/unclaimed-players/resolve-phone-player";

type DbClient = typeof db;

export async function addPlayerByPhone(
  database: DbClient,
  args: {
    gameId: string;
    organizerUserId: string;
    countryIso: string;
    nationalNumber: string;
    name?: string;
    level?: PadelLevelChoice | "not_sure";
    seat: { sideIndex: number; position: SeatPosition };
  },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.organizerUserId);
  assertOrganizerAddFormat(game);
  const phoneNumber = requireE164(args.countryIso, args.nationalNumber);
  const name = args.name?.trim();

  return database.transaction(async (tx) => {
    const resolved = await resolvePhonePlayer(tx, phoneNumber);
    let player;
    if (resolved.kind === "new") {
      if (!name) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Enter their name",
        });
      }
      ({ user: player } = await createUnclaimedPlayer(tx, {
        phoneNumber,
        name,
        addedByUserId: args.organizerUserId,
        startingLevel: { sport: "padel", level: args.level ?? "not_sure" },
      }));
    } else {
      player = resolved.user;
    }

    if (await userAlreadyOnGame(tx, game.id, player.id)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `${player.name} is already on this Game`,
      });
    }
    if (await userAlreadyWaitlisted(tx, game.id, player.id)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `${player.name} is on the waitlist`,
      });
    }

    const admitted = await admit(tx, {
      game,
      door: "organizer_add",
      party: { kind: "user", userId: player.id, seat: args.seat },
      addedByUserId: args.organizerUserId,
    });
    if (!admitted.ok && admitted.reason === "full") {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This Game is full",
      });
    }
    throwIfAdmitRefused(admitted);

    if (
      resolved.kind === "account" &&
      !(await gameNotificationsSuppressed(tx, game))
    ) {
      await notify(tx, {
        type: "game_seated_by_organizer",
        recipients: [{ userId: player.id, audience: "player" }],
        excludeUserIds: [args.organizerUserId],
        actorUserId: args.organizerUserId,
        groupId: game.groupId,
        gameId: game.id,
      });
    }

    return {
      userId: player.id,
      kind: resolved.kind,
      name: player.name,
    };
  });
}

export const addPlayerByPhoneProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      countryIso: z.string().trim().min(1).max(8),
      nationalNumber: z.string().trim().min(1).max(32),
      name: z.string().trim().min(1).max(100).optional(),
      level: z
        .union([z.enum(ASSIGNABLE_DISPLAY_LEVEL_BANDS), z.literal("not_sure")])
        .default("not_sure"),
      seat: z.object({
        sideIndex: z.number().int().min(1),
        position: z.enum(["left", "right"]),
      }),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return addPlayerByPhone(ctx.db, {
      ...input,
      organizerUserId: appUser.id,
    });
  });

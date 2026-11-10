import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { groupMembers, user } from "@repo/db";

import { isFootballGame } from "@repo/domain/game-shape";
import {
  footballPositionSchema,
  footballRoleSchema,
} from "@repo/validators/football";
import { messagesFor } from "@repo/i18n/messages";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  assertGameOrganizer,
  requireGame,
  requireNotChallengeGame,
} from "#src/games/access";
import { assertOrganizerAddFormat } from "#src/games/assert-organizer-add-format";
import {
  type FootballPlacement,
  type OrganizerAddPlacement,
  organizerAddPlayer,
} from "#src/games/organizer-add-player";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";

type DbClient = typeof db;

const MAX_MEMBERS_PER_ADD = 50;

function refuse(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

/**
 * Adds Group members to the Group's Game in one go. The first member takes
 * the seat or side the Organizer picked, if any; the rest fill the first
 * vacant Positions.
 */
export async function addGroupMembers(
  database: DbClient,
  args: {
    gameId: string;
    organizerUserId: string;
    players: { userId: string; football?: FootballPlacement }[];
    locale?: Locale;
  } & OrganizerAddPlacement,
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  requireNotChallengeGame(game, locale);
  await assertGameOrganizer(database, game, args.organizerUserId, locale);
  assertOrganizerAddFormat(game, locale);
  if (!game.groupId) {
    refuse(messagesFor(locale).game.errors.gameHasNoGroup);
  }
  const groupId = game.groupId;
  const football = isFootballGame(game);
  if (!football && args.players.some((player) => player.football)) {
    refuse(messagesFor(locale).football.errors.roleOnFootball);
  }
  const userIds = args.players.map((player) => player.userId);
  if (new Set(userIds).size !== userIds.length) {
    refuse(messagesFor(locale).game.errors.pickEachMemberOnce);
  }

  return database.transaction(async (tx) => {
    const rows = await tx
      .select({
        id: user.id,
        name: user.name,
        clerkId: user.clerkId,
        addedAt: user.addedAt,
      })
      .from(groupMembers)
      .innerJoin(user, eq(user.id, groupMembers.userId))
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          inArray(groupMembers.userId, userIds),
        ),
      );
    const byId = new Map(rows.map((row) => [row.id, row]));

    const added: { userId: string; name: string }[] = [];
    for (const [index, entry] of args.players.entries()) {
      const player = byId.get(entry.userId);
      if (!player) {
        refuse(messagesFor(locale).game.errors.groupMembersOnly);
      }
      await organizerAddPlayer(tx, {
        game,
        player,
        organizerUserId: args.organizerUserId,
        placement: index === 0 ? args : {},
        fillVacant: true,
        football: football
          ? (entry.football ?? { role: "outfield", position: null })
          : null,
        notifyPlayer: !isUnclaimed(player),
        locale,
      });
      added.push({ userId: player.id, name: player.name });
    }
    return { added };
  });
}

export const addGroupMembersProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      players: z
        .array(
          z.object({
            userId: z.string().uuid(),
            football: z
              .object({
                role: footballRoleSchema,
                position: footballPositionSchema.nullable(),
              })
              .optional(),
          }),
        )
        .min(1)
        .max(MAX_MEMBERS_PER_ADD),
      seat: z
        .object({
          sideIndex: z.number().int().min(1),
          position: z.enum(["left", "right"]),
        })
        .optional(),
      side: z.object({ sideIndex: z.number().int().min(1) }).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return addGroupMembers(ctx.db, {
      ...input,
      organizerUserId: appUser.id,
      locale: ctx.locale,
    });
  });

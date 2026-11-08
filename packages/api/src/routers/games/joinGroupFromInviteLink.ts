import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  gameInviteLinks,
  groupJoinRequests,
  GroupJoinRequestStatusEnum,
  groupMembers,
  type GroupJoinRequestHeldSeat,
} from "@repo/db";

import {
  type FootballPosition,
  type FootballRole,
} from "@repo/domain/football-lineup";
import { isFootballGame } from "@repo/domain/game-shape";
import { isSeatHoldLive, seatHoldExpiry } from "@repo/domain/invites";
import {
  footballPositionSchema,
  footballRoleSchema,
} from "@repo/validators/football";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireGame, type GameRow } from "#src/games/access";
import { assertKeeperSeatOpen } from "#src/games/football-lineup";
import {
  gameInviteGroupJoinMode,
  loadGameInviteLinkGroup,
} from "#src/games/invite-link-group";
import { assertGameInviteDoorsOpen } from "#src/games/invites";
import { markPendingGroupJoinRequestApproved } from "#src/groups/helpers/mark-pending-group-join-request-approved";
import { previewLink } from "#src/invites/doors";
import { notifyGroupJoined } from "#src/notifications/notify-group-joined";
import { notifyGroupJoinRequested } from "#src/notifications/notify-requests";

type DbClient = typeof db;

export type JoinGroupFromInviteLinkArgs = {
  token: string;
  userId: string;
  /** Ask the Group to keep a seat on this Game while it decides (ADR-0057). */
  holdSeat?: boolean;
  sideIndex?: number;
  position?: "left" | "right";
  football?: { role: FootballRole; position: FootballPosition };
  locale?: Locale;
  now?: Date;
};

function heldSeatOf(
  game: GameRow,
  args: JoinGroupFromInviteLinkArgs,
): GroupJoinRequestHeldSeat | null {
  if (args.football && isFootballGame(game)) {
    return { kind: "football", ...args.football };
  }
  if (args.sideIndex != null && args.position) {
    return {
      kind: "position",
      sideIndex: args.sideIndex,
      position: args.position,
    };
  }
  return null;
}

/**
 * A hold asks for a seat the Group approvers grant; the Level range is theirs
 * to waive at that moment, so it does not refuse the request here.
 */
async function assertSeatHoldAllowed(
  database: DbClient,
  game: GameRow,
  args: JoinGroupFromInviteLinkArgs,
) {
  await assertGameInviteDoorsOpen(database, game);
  if (args.football?.role === "keeper") {
    await assertKeeperSeatOpen(database, game.id);
  }
}

/**
 * The Group half of a Game Invite link on its own: join the Group without
 * taking the seat, or, where the Group's Organizers decide, send the join
 * request with or without a Seat hold. Either request names the Game it came
 * through, so it waits in that Game's Requests queue.
 */
export async function joinGroupFromInviteLink(
  database: DbClient,
  args: JoinGroupFromInviteLinkArgs,
) {
  const now = args.now ?? new Date();
  const previewed = await previewLink(database, "game", args.token);
  const link = await database.query.gameInviteLinks.findFirst({
    where: eq(gameInviteLinks.token, args.token),
  });
  if (previewed.status !== "ready" || !link) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Invite link is invalid or expired",
    });
  }
  const game = await requireGame(database, link.gameId);
  if (!game.groupId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Game has no Group to join",
    });
  }
  const group = await loadGameInviteLinkGroup(database, game.groupId);
  if (!group) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
  }
  const { mode, pending } = await gameInviteGroupJoinMode(
    database,
    group,
    args.userId,
  );

  if (mode === "member") {
    return { outcome: "already_member" as const, groupId: group.id };
  }
  if (mode === "blocked") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can't join this Group",
    });
  }

  if (mode === "join") {
    if (args.holdSeat) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "This Group lets anyone with the link in; take the seat instead",
      });
    }
    await database.transaction(async (tx) => {
      await tx
        .insert(groupMembers)
        .values({ groupId: group.id, userId: args.userId });
      await notifyGroupJoined(tx, { group, joinerUserId: args.userId });
      await markPendingGroupJoinRequestApproved(tx, {
        groupId: group.id,
        userId: args.userId,
        decidedBy: args.userId,
      });
    });
    return { outcome: "joined" as const, groupId: group.id };
  }

  const hold = {
    heldGameId: game.id,
    seatHeldUntil: args.holdSeat ? seatHoldExpiry(now) : null,
    heldSeat: args.holdSeat ? heldSeatOf(game, args) : null,
  };
  if (args.holdSeat) {
    await assertSeatHoldAllowed(database, game, args);
  }

  if (mode === "requested" && pending) {
    const holdsThisSeat =
      pending.heldGameId === game.id &&
      isSeatHoldLive(pending.seatHeldUntil, now);
    const keepsHold = !args.holdSeat && holdsThisSeat;
    const newHold = args.holdSeat && !holdsThisSeat;
    const updated = await database.transaction(async (tx) => {
      const [row] = await tx
        .update(groupJoinRequests)
        .set({
          ...(keepsHold ? {} : hold),
          source: "invite_link",
          invitedBy: link.createdBy,
          updatedAt: now,
        })
        .where(eq(groupJoinRequests.id, pending.id))
        .returning();
      if (newHold) {
        await notifyGroupJoinRequested(tx, {
          group,
          requesterUserId: args.userId,
          gameId: game.id,
        });
      }
      return row;
    });
    return {
      outcome: "requested" as const,
      groupId: group.id,
      requestId: pending.id,
      seatHeldUntil:
        updated?.heldGameId === game.id ? updated.seatHeldUntil : null,
    };
  }

  const existing = await database.query.groupJoinRequests.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.groupId, group.id), eq(table.userId, args.userId)),
    columns: { id: true },
  });
  const details = {
    status: GroupJoinRequestStatusEnum.PENDING,
    decidedBy: null,
    note: null,
    source: "invite_link" as const,
    invitedBy: link.createdBy,
    ...hold,
  };
  const request = await database.transaction(async (tx) => {
    const [row] = existing
      ? await tx
          .update(groupJoinRequests)
          .set({ ...details, updatedAt: now })
          .where(eq(groupJoinRequests.id, existing.id))
          .returning()
      : await tx
          .insert(groupJoinRequests)
          .values({ groupId: group.id, userId: args.userId, ...details })
          .returning();
    if (!row) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create join request",
      });
    }
    await notifyGroupJoinRequested(tx, {
      group,
      requesterUserId: args.userId,
      gameId: hold.heldGameId,
    });
    return row;
  });
  return {
    outcome: "requested" as const,
    groupId: group.id,
    requestId: request.id,
    seatHeldUntil: request.seatHeldUntil,
  };
}

export const joinGroupFromInviteLinkProcedure = protectedProcedure
  .input(
    z.object({
      token: z.string().min(1).max(64),
      holdSeat: z.boolean().optional(),
      sideIndex: z.number().int().min(1).optional(),
      position: z.enum(["left", "right"]).optional(),
      football: z
        .object({
          role: footballRoleSchema,
          position: footballPositionSchema,
        })
        .optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return joinGroupFromInviteLink(ctx.db, {
      token: input.token,
      userId: appUser.id,
      holdSeat: input.holdSeat,
      sideIndex: input.sideIndex,
      position: input.position,
      football: input.football,
      locale: ctx.locale,
    });
  });

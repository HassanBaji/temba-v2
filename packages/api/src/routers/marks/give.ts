import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { MatchStatusEnum, marks, matches } from "@repo/db";

import {
  MARK_KINDS,
  canGiveMark,
  marksWindow,
  type MarkKind,
  type MarkRefusal,
} from "@repo/domain/marks";
import { sportOrDefault } from "@repo/domain/sport";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { canViewGame, requireGame } from "#src/games/access";
import { markReceivedDedupeKey } from "#src/marks/mark-received-notification";
import {
  loadMatchParticipants,
  marksMatch,
} from "#src/marks/match-participants";
import { notify } from "#src/notifications/notify";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The reason code is the message, so a client can show its refused-state copy. */
function refuse(reason: MarkRefusal): never {
  throw new TRPCError({ code: "FORBIDDEN", message: reason });
}

/**
 * A seated account holder gives one Mark to another participant while the
 * Marks window is open. The Match row lock serialises two gives from the
 * same giver, so the cap of three and one-per-receiver hold under a race.
 */
export async function give(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    receiverUserId: string;
    kind: MarkKind;
  },
  now: Date = new Date(),
): Promise<{ markId: string }> {
  const game = await requireGame(database, args.gameId);
  if (!(await canViewGame(database, game, args.userId))) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
  }
  const match = await marksMatch(database, game);
  if (!match) {
    refuse("window_closed");
  }

  return database.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(matches)
      .where(eq(matches.id, match.id))
      .for("update");
    if (!locked) {
      refuse("window_closed");
    }
    const participants = await loadMatchParticipants(tx, locked, game);
    const given = await tx
      .select({ receiverUserId: marks.receiverUserId, kind: marks.kind })
      .from(marks)
      .where(
        and(eq(marks.matchId, locked.id), eq(marks.giverUserId, args.userId)),
      );
    const verdict = canGiveMark({
      giverUserId: args.userId,
      receiverUserId: args.receiverUserId,
      kind: args.kind,
      sport: sportOrDefault(game.sport),
      window:
        locked.status === MatchStatusEnum.COMPLETED
          ? marksWindow(locked.completedAt, now)
          : null,
      participants,
      given,
    });
    if (!verdict.ok) {
      refuse(verdict.reason);
    }

    const [inserted] = await tx
      .insert(marks)
      .values({
        matchId: locked.id,
        giverUserId: args.userId,
        receiverUserId: args.receiverUserId,
        kind: args.kind,
      })
      .onConflictDoNothing()
      .returning({ id: marks.id });
    if (!inserted) {
      refuse("already_marked_receiver");
    }

    await notify(tx, {
      type: "mark_received",
      recipients: [{ userId: args.receiverUserId, audience: "player" }],
      excludeUserIds: [args.userId],
      actorUserId: args.userId,
      groupId: game.groupId,
      gameId: game.id,
      markKind: args.kind,
      dedupeKey: markReceivedDedupeKey(locked.id, args.userId),
    });

    return { markId: inserted.id };
  });
}

export const giveProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      receiverUserId: z.string().uuid(),
      kind: z.enum(MARK_KINDS),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return give(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      receiverUserId: input.receiverUserId,
      kind: input.kind,
    });
  });

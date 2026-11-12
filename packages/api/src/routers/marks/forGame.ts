import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { MatchStatusEnum, marks } from "@repo/db";

import {
  MARK_KINDS,
  gameMvpView,
  marksWindow,
  remainingMarks,
  type GameMarks,
  type MarkKind,
} from "@repo/domain/marks";
import { sportOrDefault } from "@repo/domain/sport";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { canViewGame, isGameOrganizer, requireGame } from "#src/games/access";
import {
  loadMatchParticipants,
  marksMatch,
} from "#src/marks/match-participants";
import { mvpQuestion, settleMvpIfDue } from "#src/marks/settle-mvp";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function receivedKinds(receiverUserId: string, rows: GameMarks["marks"]) {
  const counts = new Map<MarkKind, number>();
  for (const row of rows) {
    if (row.receiverUserId === receiverUserId) {
      counts.set(row.kind, (counts.get(row.kind) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([kind, count]) => ({ kind, count }))
    .sort(
      (left, right) =>
        right.count - left.count ||
        MARK_KINDS.indexOf(left.kind) - MARK_KINDS.indexOf(right.kind),
    );
}

/**
 * The Marks on a Game, for the Game screen: the window, who sat on which
 * side, every mark with its giver, what the viewer may still give, and the
 * MVP, whose own window closes with the Rating window on a Match that counts
 * for Temba Level. Visible to anyone who may open the Game, roasts included.
 * Once the MVP's window has closed, a read settles an MVP the Job has not
 * settled yet.
 */
export async function forGame(
  database: DbClient,
  args: { gameId: string; userId: string; locale?: Locale },
  now: Date = new Date(),
): Promise<GameMarks> {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  if (!(await canViewGame(database, game, args.userId))) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).game.errors.notFound,
    });
  }

  const match = await marksMatch(database, game);
  const current = (await settleMvpIfDue(database, game, match, now))
    ? await requireGame(database, game.id, locale)
    : game;
  const participants = match
    ? await loadMatchParticipants(database, match, game)
    : [];
  const question = await mvpQuestion(database, {
    game: current,
    match,
    participants,
    now,
  });
  const windowState =
    match?.status === MatchStatusEnum.COMPLETED
      ? marksWindow(match.completedAt, now)
      : null;
  const mvp = gameMvpView({
    question,
    stored: {
      userId: current.mvpUserId,
      decidedBy: current.mvpDecidedBy,
      decidedAt: current.mvpDecidedAt,
      settledAt: current.mvpSettledAt,
    },
    viewerUserId: args.userId,
    isOrganizer: await isGameOrganizer(database, game, args.userId),
  });
  const rows = match
    ? await database.query.marks.findMany({
        where: eq(marks.matchId, match.id),
        columns: {
          id: true,
          kind: true,
          giverUserId: true,
          receiverUserId: true,
          createdAt: true,
        },
        orderBy: [asc(marks.createdAt), asc(marks.id)],
      })
    : [];

  const given = rows
    .filter((row) => row.giverUserId === args.userId)
    .map((row) => ({ receiverUserId: row.receiverUserId, kind: row.kind }));
  const isParticipant = participants.some(
    (participant) =>
      participant.userId === args.userId && !participant.isUnclaimed,
  );
  const remaining = remainingMarks(given);

  return {
    gameId: game.id,
    sport: sportOrDefault(game.sport),
    matchId: match?.id ?? null,
    window: windowState,
    participants: participants.map((participant) => ({
      ...participant,
      isViewer: participant.userId === args.userId,
      received: receivedKinds(participant.userId, rows),
    })),
    marks: rows,
    summary: {
      given: rows.length,
      givers: new Set(rows.map((row) => row.giverUserId)).size,
    },
    viewer: {
      isParticipant,
      canGive: isParticipant && windowState?.state === "open" && remaining > 0,
      remaining,
      given,
      ...mvp.viewer,
    },
    mvp: mvp.mvp,
  };
}

export const forGameProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return forGame(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });

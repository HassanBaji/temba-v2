import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { footballLineupDraftAnswers } from "@repo/db";
import { ofSide } from "@repo/domain/football-board";
import {
  FOOTBALL_DRAFT_ANSWERS,
  FOOTBALL_DRAFT_NOTE_MAX_LENGTH,
  type FootballDraftAnswer,
} from "@repo/domain/football-lineup";
import { messagesFor } from "@repo/i18n/messages";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireGame } from "#src/games/access";
import {
  assertFootballDraftOpen,
  assertFootballPickNotRunning,
  loadFootballDraft,
} from "#src/games/football-draft";
import { notifyFootballDraftAnswered } from "#src/notifications/notify-football-draft";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * A Side captain gives their Captain's answer on their own side of the Draft
 * line-up (ADR-0108): approved, or a change asked with a note of 1 to 140
 * characters; `null` undoes it. The answer keeps the side's players it was
 * given for. The Game admins hear once per answer for the side as it stands;
 * Undo sends nothing. It waits while a Captain pick runs.
 */
export async function answerFootballDraft(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    answer: FootballDraftAnswer | null;
    note?: string;
    locale?: Locale;
  },
  now: Date = new Date(),
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const errors = messagesFor(locale).football.errors;
  const game = await requireGame(database, args.gameId, locale);
  await assertFootballDraftOpen(database, game, locale);
  const note = args.answer === "change_asked" ? (args.note ?? "").trim() : null;
  if (
    note != null &&
    (note.length === 0 || note.length > FOOTBALL_DRAFT_NOTE_MAX_LENGTH)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: errors.draftNoteLength(FOOTBALL_DRAFT_NOTE_MAX_LENGTH),
    });
  }

  return database.transaction(async (tx) => {
    const draft = await loadFootballDraft(tx, game, args.userId, {
      lock: true,
    });
    const sideIndex = draft?.viewer.sideCaptainOf ?? null;
    if (!draft || sideIndex == null || draft.viewer.organizer) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: errors.draftNotCaptain,
      });
    }
    assertFootballPickNotRunning(draft, locale);
    const side = and(
      eq(footballLineupDraftAnswers.draftId, draft.id),
      eq(footballLineupDraftAnswers.sideIndex, sideIndex),
    );
    if (args.answer == null) {
      await tx.delete(footballLineupDraftAnswers).where(side);
      return { ok: true as const };
    }

    const sideGamePlayerIds = ofSide(draft.sideGamePlayerIds, sideIndex);
    const values = {
      captainUserId: args.userId,
      answer: args.answer,
      note,
      answeredPlayerIds: sideGamePlayerIds,
      answeredAt: now,
    };
    await tx
      .insert(footballLineupDraftAnswers)
      .values({ draftId: draft.id, sideIndex, ...values })
      .onConflictDoUpdate({
        target: [
          footballLineupDraftAnswers.draftId,
          footballLineupDraftAnswers.sideIndex,
        ],
        set: values,
      });
    await notifyFootballDraftAnswered(tx, {
      game,
      draftId: draft.id,
      sideIndex,
      sideGamePlayerIds,
      answer: args.answer,
      sideCaptainUserId: args.userId,
    });
    return { ok: true as const };
  });
}

export const answerFootballDraftProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      answer: z.enum(FOOTBALL_DRAFT_ANSWERS).nullable(),
      note: z.string().max(1000).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return answerFootballDraft(ctx.db, {
      ...input,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });

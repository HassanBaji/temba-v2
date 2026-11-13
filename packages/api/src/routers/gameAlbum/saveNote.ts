import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { gameNotes } from "@repo/db";
import {
  GAME_NOTE_MAX_LENGTH,
  GAME_NOTE_VISIBILITIES,
  type GameNoteVisibility,
} from "@repo/domain/game-album";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  albumAccess,
  assertMayContribute,
  notesAreOpen,
} from "#src/game-album/access";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

/** The input cap only stops abuse; the real limit is checked in characters, with a localized refusal. */
const BODY_INPUT_MAX = GAME_NOTE_MAX_LENGTH * 4;

/**
 * A player writes or rewrites their one note on a played Game, and picks who
 * reads it, until notes close thirty days after the Game.
 */
export async function saveNote(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    body: string;
    visibility: GameNoteVisibility;
    locale?: Locale;
  },
  now: Date = new Date(),
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const errors = messagesFor(locale).gameAlbum.errors;
  const body = args.body.trim();
  if (body.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: errors.noteEmpty });
  }
  if (Array.from(body).length > GAME_NOTE_MAX_LENGTH) {
    throw new TRPCError({ code: "BAD_REQUEST", message: errors.noteTooLong });
  }

  const access = await albumAccess(database, { ...args, locale });
  assertMayContribute(access, locale);
  if (!notesAreOpen(access, now)) {
    throw new TRPCError({ code: "FORBIDDEN", message: errors.notesClosed });
  }

  const [note] = await database
    .insert(gameNotes)
    .values({
      gameId: access.game.id,
      authorUserId: args.userId,
      body,
      visibility: args.visibility,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [gameNotes.gameId, gameNotes.authorUserId],
      set: { body, visibility: args.visibility, updatedAt: now },
    })
    .returning();
  if (!note) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to save Game note",
    });
  }
  return note;
}

export const saveNoteProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      body: z.string().max(BODY_INPUT_MAX),
      visibility: z.enum(GAME_NOTE_VISIBILITIES),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return saveNote(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      body: input.body,
      visibility: input.visibility,
      locale: ctx.locale,
    });
  });

import { and, asc, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";

import { gameNotes, gamePhotos, user } from "@repo/db";
import {
  GAME_ALBUM_SLOTS,
  type GameAlbum,
  type GameAlbumNote,
  type GameAlbumPerson,
} from "@repo/domain/game-album";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { albumAccess, notesAreOpen } from "#src/game-album/access";
import { gamePhotoUrl } from "#src/storage/game-photos";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function peopleById(
  database: DbClient,
  known: readonly GameAlbumPerson[],
  userIds: readonly string[],
) {
  const byId = new Map(known.map((person) => [person.userId, person]));
  const missing = [...new Set(userIds)].filter((id) => !byId.has(id));
  if (missing.length > 0) {
    const rows = await database.query.user.findMany({
      where: inArray(user.id, missing),
      columns: { id: true, name: true, image: true },
    });
    for (const row of rows) {
      byId.set(row.id, {
        userId: row.id,
        name: row.name ?? "",
        image: row.image ?? null,
      });
    }
  }
  return (userId: string): GameAlbumPerson =>
    byId.get(userId) ?? { userId, name: "", image: null };
}

/**
 * The Album and Notes on a Game, for its screen. Players and Organizers see
 * the photos; players see public notes and their own; another player's
 * private note never leaves the server.
 */
export async function forGame(
  database: DbClient,
  args: { gameId: string; userId: string; locale?: Locale },
  now: Date = new Date(),
): Promise<GameAlbum> {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const access = await albumAccess(database, { ...args, locale });
  const visible = access.played && (access.isPlayer || access.isOrganizer);
  const me =
    access.players.find((player) => player.userId === args.userId) ?? null;
  const readers = access.players.filter(
    (player) => player.userId !== args.userId,
  );

  if (!visible) {
    return {
      gameId: access.game.id,
      open: false,
      viewer: {
        person: me,
        isPlayer: access.isPlayer,
        isOrganizer: access.isOrganizer,
        canAddPhotos: false,
        room: 0,
        canWriteNote: false,
        notesCloseAt: null,
      },
      photos: [],
      notes: { mine: null, shared: [] },
      readers: [],
      silentPlayers: [],
    };
  }

  const [photoRows, noteRows] = await Promise.all([
    database.query.gamePhotos.findMany({
      where: eq(gamePhotos.gameId, access.game.id),
      columns: { id: true, uploaderUserId: true, createdAt: true },
      orderBy: [asc(gamePhotos.createdAt), asc(gamePhotos.id)],
    }),
    access.isPlayer
      ? database.query.gameNotes.findMany({
          where: and(
            eq(gameNotes.gameId, access.game.id),
            or(
              eq(gameNotes.visibility, "public"),
              eq(gameNotes.authorUserId, args.userId),
            ),
          ),
          orderBy: [asc(gameNotes.createdAt), asc(gameNotes.id)],
        })
      : Promise.resolve([]),
  ]);

  const person = await peopleById(database, access.players, [
    ...photoRows.map((row) => row.uploaderUserId),
    ...noteRows.map((row) => row.authorUserId),
  ]);

  const notes: GameAlbumNote[] = noteRows.map((row) => ({
    id: row.id,
    author: person(row.authorUserId),
    isMine: row.authorUserId === args.userId,
    body: row.body,
    visibility: row.visibility,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const publicAuthors = new Set(
    notes
      .filter((note) => note.visibility === "public")
      .map((note) => note.author.userId),
  );
  const room = Math.max(0, GAME_ALBUM_SLOTS - photoRows.length);

  return {
    gameId: access.game.id,
    open: true,
    viewer: {
      person: me,
      isPlayer: access.isPlayer,
      isOrganizer: access.isOrganizer,
      canAddPhotos: access.isPlayer && room > 0,
      room: access.isPlayer ? room : 0,
      canWriteNote: access.isPlayer && notesAreOpen(access, now),
      notesCloseAt: access.isPlayer ? access.notesCloseAt : null,
    },
    photos: photoRows.map((row) => ({
      id: row.id,
      url: gamePhotoUrl(access.game.id, row.id),
      uploader: person(row.uploaderUserId),
      isMine: row.uploaderUserId === args.userId,
      canRemove: row.uploaderUserId === args.userId || access.isOrganizer,
      createdAt: row.createdAt,
    })),
    notes: {
      mine: notes.find((note) => note.isMine) ?? null,
      shared: notes.filter((note) => !note.isMine),
    },
    readers: access.isPlayer ? readers : [],
    silentPlayers: access.isPlayer
      ? readers.filter((reader) => !publicAuthors.has(reader.userId))
      : [],
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

import { beforeEach, describe, expect, it, vi } from "vitest";

const { putS3Object, deleteS3Object } = vi.hoisted(() => ({
  putS3Object: vi.fn(),
  deleteS3Object: vi.fn(),
}));

vi.mock("#src/storage/s3", () => ({
  putS3Object,
  deleteS3Object,
}));

import { eq } from "drizzle-orm";

import { gamePhotos } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { type db } from "#src/db";
import {
  completePadelMatch,
  recordJobs,
  seatPadelFriendlyGame,
  type PadelMarksGame,
} from "#src/marks/marks.test-support";
import { addPhoto } from "#src/routers/gameAlbum/addPhoto";
import { deleteNote } from "#src/routers/gameAlbum/deleteNote";
import { forGame } from "#src/routers/gameAlbum/forGame";
import { myNotes } from "#src/routers/gameAlbum/myNotes";
import { removePhoto } from "#src/routers/gameAlbum/removePhoto";
import { saveNote } from "#src/routers/gameAlbum/saveNote";
import {
  listMyMatchHistoryRows,
  withAlbumSummaries,
} from "#src/routers/games/listMyMatchHistory";

const DAY = 24 * 60 * 60 * 1000;

const PNG_BASE64 = Buffer.from(
  Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]),
).toString("base64");

function asDb(database: TestDatabase): typeof db {
  return database as unknown as typeof db;
}

async function withDb(run: (db: TestDatabase) => Promise<void>) {
  const { db: database, close } = await createPgliteDb();
  try {
    await run(database);
  } finally {
    await close();
  }
}

async function playedGame(database: TestDatabase) {
  const game = await seatPadelFriendlyGame(database);
  await completePadelMatch(database, game);
  return game;
}

function addAs(database: TestDatabase, game: PadelMarksGame, userId: string) {
  return addPhoto(asDb(database), {
    gameId: game.gameId,
    userId,
    contentType: "image/png",
    dataBase64: PNG_BASE64,
  });
}

function noteAs(
  database: TestDatabase,
  game: PadelMarksGame,
  userId: string,
  body: string,
  visibility: "public" | "private",
  now?: Date,
) {
  return saveNote(
    asDb(database),
    { gameId: game.gameId, userId, body, visibility },
    now,
  );
}

function albumFor(
  database: TestDatabase,
  game: PadelMarksGame,
  userId: string,
) {
  return forGame(asDb(database), { gameId: game.gameId, userId });
}

describe("gameAlbum", () => {
  recordJobs();

  beforeEach(() => {
    putS3Object.mockReset();
    deleteS3Object.mockReset();
  });

  it("stays shut until the Game is played", async () => {
    await withDb(async (database) => {
      const game = await seatPadelFriendlyGame(database);
      const album = await albumFor(database, game, game.a.id);
      expect(album.open).toBe(false);
      await expect(addAs(database, game, game.a.id)).rejects.toThrow(
        "The album opens once the game is played",
      );
      expect(putS3Object).not.toHaveBeenCalled();
    });
  });

  it("takes six photos from the players, then is full", async () => {
    await withDb(async (database) => {
      const game = await playedGame(database);
      const uploaders = [game.a, game.a, game.b, game.c, game.d, game.b];
      for (const uploader of uploaders) {
        await addAs(database, game, uploader.id);
      }
      await expect(addAs(database, game, game.c.id)).rejects.toThrow(
        "The album is full",
      );

      const album = await albumFor(database, game, game.a.id);
      expect(album.photos).toHaveLength(6);
      expect(album.photos[0]).toMatchObject({
        uploader: { userId: game.a.id },
        isMine: true,
        canRemove: true,
      });
      expect(album.photos[0]!.url).toMatch(
        new RegExp(`^/api/media/game-photos/${game.gameId}/`),
      );
      expect(album.photos[2]).toMatchObject({
        isMine: false,
        canRemove: false,
      });
      expect(album.viewer).toMatchObject({ canAddPhotos: false, room: 0 });
      expect(putS3Object).toHaveBeenCalledTimes(6);
    });
  });

  it("refuses photos from someone who did not play", async () => {
    await withDb(async (database) => {
      const game = await playedGame(database);
      await expect(addAs(database, game, game.member.id)).rejects.toThrow(
        "Only the players of this game can do that",
      );
      await expect(addAs(database, game, game.organizer.id)).rejects.toThrow(
        "Only the players of this game can do that",
      );
      const memberView = await albumFor(database, game, game.member.id);
      expect(memberView.open).toBe(false);
    });
  });

  it("refuses a file that is not the image it claims to be", async () => {
    await withDb(async (database) => {
      const game = await playedGame(database);
      await expect(
        addPhoto(asDb(database), {
          gameId: game.gameId,
          userId: game.a.id,
          contentType: "image/jpeg",
          dataBase64: PNG_BASE64,
        }),
      ).rejects.toThrow("Use a JPEG, PNG or WebP photo");
    });
  });

  it("lets the uploader and the Organizer remove a photo, nobody else", async () => {
    await withDb(async (database) => {
      const game = await playedGame(database);
      const first = await addAs(database, game, game.a.id);
      const second = await addAs(database, game, game.a.id);

      await expect(
        removePhoto(asDb(database), {
          gameId: game.gameId,
          photoId: first.id,
          userId: game.b.id,
        }),
      ).rejects.toThrow("You can only remove your own photos");

      await removePhoto(asDb(database), {
        gameId: game.gameId,
        photoId: first.id,
        userId: game.a.id,
      });
      const organizerView = await albumFor(database, game, game.organizer.id);
      expect(organizerView.open).toBe(true);
      expect(organizerView.photos.map((photo) => photo.canRemove)).toEqual([
        true,
      ]);
      expect(organizerView.notes).toEqual({ mine: null, shared: [] });

      await removePhoto(asDb(database), {
        gameId: game.gameId,
        photoId: second.id,
        userId: game.organizer.id,
      });
      expect(
        await database.query.gamePhotos.findMany({
          where: eq(gamePhotos.gameId, game.gameId),
        }),
      ).toEqual([]);
      expect(deleteS3Object).toHaveBeenCalledTimes(2);
    });
  });

  it("keeps a private note to its author and never says it exists", async () => {
    await withDb(async (database) => {
      const game = await playedGame(database);
      await noteAs(database, game, game.a.id, "Backhand volley", "private");
      await noteAs(database, game, game.c.id, "Lob more at Dana", "public");

      const mine = await albumFor(database, game, game.a.id);
      expect(mine.notes.mine).toMatchObject({
        body: "Backhand volley",
        visibility: "private",
      });
      expect(mine.notes.shared.map((note) => note.body)).toEqual([
        "Lob more at Dana",
      ]);
      expect(mine.silentPlayers.map((person) => person.userId).sort()).toEqual(
        [game.b.id, game.d.id].sort(),
      );

      const theirs = await albumFor(database, game, game.c.id);
      expect(theirs.notes.mine?.body).toBe("Lob more at Dana");
      expect(theirs.notes.shared).toEqual([]);
      expect(theirs.silentPlayers.map((person) => person.userId)).toContain(
        game.a.id,
      );
    });
  });

  it("holds one note per player and lets it change who reads it", async () => {
    await withDb(async (database) => {
      const game = await playedGame(database);
      await noteAs(database, game, game.a.id, "First go", "private");
      await noteAs(
        database,
        game,
        game.a.id,
        "  Same four next week?  ",
        "public",
      );

      const view = await albumFor(database, game, game.b.id);
      expect(view.notes.shared).toHaveLength(1);
      expect(view.notes.shared[0]).toMatchObject({
        body: "Same four next week?",
        visibility: "public",
      });
    });
  });

  it("refuses empty and long notes, and any note after thirty days", async () => {
    await withDb(async (database) => {
      const game = await playedGame(database);
      await expect(
        noteAs(database, game, game.a.id, "   ", "public"),
      ).rejects.toThrow("Write something first");
      await expect(
        noteAs(database, game, game.a.id, "x".repeat(301), "public"),
      ).rejects.toThrow("A note is 300 characters at most");
      await expect(
        noteAs(
          database,
          game,
          game.a.id,
          "Late",
          "public",
          new Date(Date.now() + 31 * DAY),
        ),
      ).rejects.toThrow("Notes close 30 days after the game");
      await expect(
        noteAs(database, game, game.member.id, "Hi", "public"),
      ).rejects.toThrow("Only the players of this game can do that");
    });
  });

  it("deletes only the author's own note", async () => {
    await withDb(async (database) => {
      const game = await playedGame(database);
      await noteAs(database, game, game.a.id, "Mine", "public");
      await expect(
        deleteNote(asDb(database), { gameId: game.gameId, userId: game.b.id }),
      ).rejects.toThrow("Note not found");
      await deleteNote(asDb(database), {
        gameId: game.gameId,
        userId: game.a.id,
      });
      expect((await albumFor(database, game, game.b.id)).notes.shared).toEqual(
        [],
      );
    });
  });

  it("lists the author's notes with the result read from their side", async () => {
    await withDb(async (database) => {
      const game = await playedGame(database);
      await noteAs(database, game, game.c.id, "Lost this one", "private");

      const [entry] = await myNotes(asDb(database), { userId: game.c.id });
      expect(entry).toMatchObject({
        gameId: game.gameId,
        visibility: "private",
        game: {
          groupName: "Thursday padel",
          outcome: "lost",
          sets: [{ us: 2, them: 6 }],
          partnerNames: ["Noor"],
        },
      });
      expect(await myNotes(asDb(database), { userId: game.a.id })).toEqual([]);
    });
  });

  it("gives the Played list a strip of thumbnails and the readable note count", async () => {
    await withDb(async (database) => {
      const game = await playedGame(database);
      await addAs(database, game, game.a.id);
      await addAs(database, game, game.b.id);
      await noteAs(database, game, game.a.id, "Shared", "public");
      await noteAs(database, game, game.b.id, "Mine only", "private");
      await noteAs(database, game, game.c.id, "Theirs only", "private");

      const rows = await withAlbumSummaries(
        asDb(database),
        game.b.id,
        await listMyMatchHistoryRows(
          asDb(database),
          game.b.id,
          new Date(Date.now() + DAY),
        ),
      );
      expect(rows[0]?.album).toMatchObject({ photoCount: 2, noteCount: 2 });
      expect(rows[0]?.album?.photoUrls).toHaveLength(2);
    });
  });
});

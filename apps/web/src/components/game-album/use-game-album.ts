"use client";

import type {
  GameAlbumPhoto,
  GameNoteVisibility,
} from "@repo/domain/game-album";
import * as React from "react";
import { toast } from "sonner";

import { useLocale, useMessages } from "~/components/locale-provider";
import { api } from "~/trpc/react";

import { photoUploadInput } from "./shrink-photo";

export type AlbumSheetState =
  | { kind: "add" }
  | { kind: "viewer"; photoId: string }
  | { kind: "note" };

/**
 * `gameAlbum.forGame` for the Game details page, the one album dialog that
 * is open, and the write doors. Every write refetches, refused or not.
 */
export function useGameAlbum(gameId: string, enabled = true) {
  const locale = useLocale();
  const copy = useMessages().gameAlbum;
  const utils = api.useUtils();
  const [sheet, setSheet] = React.useState<AlbumSheetState | null>(null);
  const [progress, setProgress] = React.useState<{
    done: number;
    total: number;
  } | null>(null);
  const query = api.gameAlbum.forGame.useQuery({ gameId }, { enabled });

  const settle = React.useCallback(() => {
    void utils.gameAlbum.forGame.invalidate({ gameId });
    void utils.gameAlbum.myNotes.invalidate();
    void utils.games.listMyMatchHistory.invalidate();
  }, [gameId, utils]);

  const refused = (error: { message: string }) => toast.error(error.message);

  const addMutation = api.gameAlbum.addPhoto.useMutation();
  const removeMutation = api.gameAlbum.removePhoto.useMutation({
    onError: refused,
    onSettled: settle,
  });
  const saveMutation = api.gameAlbum.saveNote.useMutation({
    onError: refused,
    onSettled: settle,
  });
  const deleteMutation = api.gameAlbum.deleteNote.useMutation({
    onError: refused,
    onSettled: settle,
  });

  /** Uploads one after another, so each request stays under the API's body cap. */
  const addPhotos = async (files: readonly File[]) => {
    let added = 0;
    setProgress({ done: 0, total: files.length });
    try {
      for (const file of files) {
        try {
          const upload = await photoUploadInput(file, locale);
          await addMutation.mutateAsync({ gameId, ...upload });
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : copy.errors.photoUploadFailed,
          );
          break;
        }
        added += 1;
        setProgress({ done: added, total: files.length });
      }
    } finally {
      setProgress(null);
      settle();
    }
    if (added > 0) {
      toast.success(copy.add.added(added));
    }
    return added === files.length;
  };

  const closeSheet = React.useCallback(() => setSheet(null), []);

  const run = async (write: () => Promise<unknown>) => {
    try {
      await write();
      return true;
    } catch {
      return false;
    }
  };

  return {
    data: query.data,
    sheet,
    openSheet: setSheet,
    closeSheet,
    addPhotos,
    progress,
    removePhoto: (photo: GameAlbumPhoto) =>
      run(() => removeMutation.mutateAsync({ gameId, photoId: photo.id })),
    saveNote: (body: string, visibility: GameNoteVisibility) =>
      run(() => saveMutation.mutateAsync({ gameId, body, visibility })),
    deleteNote: () => run(() => deleteMutation.mutateAsync({ gameId })),
    pending:
      progress != null ||
      removeMutation.isPending ||
      saveMutation.isPending ||
      deleteMutation.isPending,
  };
}

export type GameAlbumController = ReturnType<typeof useGameAlbum>;

import type {
  GameAlbumPhoto,
  GameNoteVisibility,
} from "@repo/domain/game-album";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";

import { useMessages } from "../i18n/locale-provider";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { shrinkForUpload, type UploadPhoto } from "./shrink-photo";

export type PickedPhoto = { uri: string; width: number; height: number };

export type AlbumSheet =
  | { kind: "add" }
  | { kind: "viewer"; photoId: string }
  | { kind: "note" };

const PICKER_BASE: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  quality: 1,
  exif: false,
};

/**
 * `gameAlbum.forGame` for the Played game screen, the one album sheet that
 * is open, and the write doors. Every write refetches, refused or not.
 */
export function useGameAlbum(gameId: string, enabled = true) {
  const m = useMessages();
  const copy = m.gameAlbum;
  const toast = useToast();
  const utils = api.useUtils();
  const [sheet, setSheet] = useState<AlbumSheet | null>(null);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const query = api.gameAlbum.forGame.useQuery(
    { gameId },
    { enabled, refetchOnWindowFocus: "always" },
  );

  const settle = useCallback(() => {
    void utils.gameAlbum.forGame.invalidate({ gameId });
    void utils.gameAlbum.myNotes.invalidate();
    void utils.games.listMyMatchHistory.invalidate();
  }, [gameId, utils]);

  const refused = useCallback(
    (error: { message: string }) => toast.show(error.message),
    [toast],
  );

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

  const pick = useCallback(
    async (
      source: "camera" | "library",
      limit: number,
    ): Promise<PickedPhoto[]> => {
      try {
        if (source === "camera") {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            toast.show(copy.add.cameraDenied);
            return [];
          }
        }
        const result =
          source === "camera"
            ? await ImagePicker.launchCameraAsync(PICKER_BASE)
            : await ImagePicker.launchImageLibraryAsync({
                ...PICKER_BASE,
                allowsMultipleSelection: limit > 1,
                selectionLimit: limit,
                orderedSelection: true,
              });
        if (result.canceled) {
          return [];
        }
        return result.assets.map((asset) => ({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
        }));
      } catch {
        toast.show(copy.add.unreadable);
        return [];
      }
    },
    [copy, toast],
  );

  /** Uploads one after another, so each request stays under the API's body cap. */
  const addPhotos = useCallback(
    async (photos: readonly PickedPhoto[]) => {
      let added = 0;
      setProgress({ done: 0, total: photos.length });
      try {
        for (const photo of photos) {
          let upload: UploadPhoto;
          try {
            upload = await shrinkForUpload(photo);
          } catch {
            toast.show(copy.add.unreadable);
            break;
          }
          try {
            await addMutation.mutateAsync({ gameId, ...upload });
          } catch (error) {
            refused(error as { message: string });
            break;
          }
          added += 1;
          setProgress({ done: added, total: photos.length });
        }
      } finally {
        setProgress(null);
        settle();
      }
      if (added > 0) {
        toast.show(copy.add.added(added));
      }
      return added === photos.length;
    },
    [addMutation, copy, gameId, refused, settle, toast],
  );

  const closeSheet = useCallback(() => setSheet(null), []);

  const run = useCallback(async (write: () => Promise<unknown>) => {
    try {
      await write();
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    data: query.data,
    refetch: query.refetch,
    sheet,
    openSheet: setSheet,
    closeSheet,
    pick,
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

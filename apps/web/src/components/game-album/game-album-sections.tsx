"use client";

import { useSearchParams } from "next/navigation";
import * as React from "react";

import { AddPhotosDialog } from "./add-photos-dialog";
import { AlbumSection } from "./album-section";
import { NoteDialog } from "./note-dialog";
import { NotesSection } from "./notes-section";
import { PhotoViewer } from "./photo-viewer";
import { useGameAlbum } from "./use-game-album";

export const ADD_PHOTOS_INTENT = "addPhotos";

/**
 * Album and Notes on a played Game, under the facts and above Share. Shows
 * nothing until a score is final, or for someone who neither played nor
 * organizes. `?intent=addPhotos` opens the add dialog once.
 */
export function GameAlbumSections({
  gameId,
  enabled = true,
  place,
  context,
}: {
  gameId: string;
  enabled?: boolean;
  /** Under a photo in the viewer: the Group and the Venue. */
  place: string;
  /** Under the note dialog's title: when the Game was played. */
  context: string | null;
}) {
  const album = useGameAlbum(gameId, enabled);
  const intent = useSearchParams().get("intent");
  const opened = React.useRef(false);
  const data = album.data;
  const { openSheet } = album;

  React.useEffect(() => {
    if (
      intent === ADD_PHOTOS_INTENT &&
      !opened.current &&
      data?.viewer.canAddPhotos
    ) {
      opened.current = true;
      openSheet({ kind: "add" });
    }
  }, [intent, data?.viewer.canAddPhotos, openSheet]);

  if (!data?.open) {
    return null;
  }

  const sheet = album.sheet;

  return (
    <>
      <div className="flex flex-col gap-[26px]">
        <AlbumSection
          album={data}
          onAdd={() => album.openSheet({ kind: "add" })}
          onOpenPhoto={(photoId) =>
            album.openSheet({ kind: "viewer", photoId })
          }
        />
        {data.viewer.isPlayer ? (
          <NotesSection
            album={data}
            onWrite={() => album.openSheet({ kind: "note" })}
          />
        ) : null}
      </div>
      <AddPhotosDialog
        open={sheet?.kind === "add"}
        album={album}
        onClose={album.closeSheet}
      />
      <PhotoViewer
        photos={data.photos}
        initialPhotoId={sheet?.kind === "viewer" ? sheet.photoId : null}
        place={place}
        onClose={album.closeSheet}
        onRemove={album.removePhoto}
      />
      <NoteDialog
        open={sheet?.kind === "note"}
        album={data}
        context={context}
        pending={album.pending}
        onClose={album.closeSheet}
        onSave={album.saveNote}
        onDelete={album.deleteNote}
      />
    </>
  );
}

import { useEffect, useRef } from "react";
import { View } from "react-native";

import { AddPhotosSheet } from "./add-photos-sheet";
import { AlbumSection } from "./album-section";
import { NoteSheet } from "./note-sheet";
import { NotesSection } from "./notes-section";
import { PhotoViewer } from "./photo-viewer";
import type { GameAlbumController } from "./use-game-album";

const SECTION_GAP = 26;

/**
 * Album and Notes on a played Game, under the result and above Share. Shows
 * nothing until a score is final, or for someone who neither played nor
 * organizes. Hosts the add sheet, the viewer and the note sheet.
 */
export function GameAlbumSections({
  album,
  place,
  context,
  openAdd = false,
}: {
  album: GameAlbumController;
  /** Under a photo in the viewer: the Group and the Venue. */
  place: string;
  /** Under the note sheet's title: when the Game was played. */
  context: string | null;
  /** Opened from the Played list's Add photos. */
  openAdd?: boolean;
}) {
  const data = album.data;
  const opened = useRef(false);
  const { openSheet } = album;

  useEffect(() => {
    if (openAdd && !opened.current && data?.viewer.canAddPhotos) {
      opened.current = true;
      openSheet({ kind: "add" });
    }
  }, [openAdd, data?.viewer.canAddPhotos, openSheet]);

  if (!data?.open) {
    return null;
  }

  const sheet = album.sheet;

  return (
    <>
      <View style={{ gap: SECTION_GAP }}>
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
      </View>
      <AddPhotosSheet
        visible={sheet?.kind === "add"}
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
      <NoteSheet
        visible={sheet?.kind === "note"}
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

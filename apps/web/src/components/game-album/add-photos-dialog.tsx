"use client";

import { ENTITY_IMAGE_ACCEPT } from "@repo/domain/entity-image-file";
import { GAME_ALBUM_SLOTS } from "@repo/domain/game-album";
import { ImagesIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";

import { AlbumSheet } from "./album-sheet";
import type { GameAlbumController } from "./use-game-album";

type Pick = { file: File; url: string };

/**
 * Choose photos from this device, up to the slots left. Picks show numbered
 * in the order they will land; click one to drop it.
 */
export function AddPhotosDialog({
  open,
  album,
  onClose,
}: {
  open: boolean;
  album: GameAlbumController;
  onClose: () => void;
}) {
  const m = useMessages().gameAlbum.add;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const room = album.data?.viewer.room ?? 0;
  const [picks, setPicks] = React.useState<Pick[]>([]);

  React.useEffect(() => {
    if (!open) {
      setPicks((current) => {
        current.forEach((pick) => URL.revokeObjectURL(pick.url));
        return [];
      });
    }
  }, [open]);

  const left = room - picks.length;

  const onFiles = (files: FileList | null) => {
    const chosen = Array.from(files ?? []);
    if (chosen.length === 0) {
      return;
    }
    if (chosen.length > left) {
      toast(m.tooMany(left));
    }
    setPicks((current) => [
      ...current,
      ...chosen
        .slice(0, Math.max(0, left))
        .map((file) => ({ file, url: URL.createObjectURL(file) })),
    ]);
  };

  const drop = (pick: Pick) => {
    URL.revokeObjectURL(pick.url);
    setPicks((current) => current.filter((item) => item !== pick));
  };

  const submit = async () => {
    if (await album.addPhotos(picks.map((pick) => pick.file))) {
      onClose();
    }
  };

  const uploading = album.progress;

  return (
    <AlbumSheet
      open={open}
      onClose={onClose}
      title={m.title}
      subtitle={m.subtitle(room, GAME_ALBUM_SLOTS)}
      footer={
        <Button
          size="lg"
          className="w-full font-semibold"
          pending={uploading != null}
          disabled={picks.length === 0}
          onClick={() => void submit()}
        >
          {uploading
            ? m.uploading(uploading.done + 1, uploading.total)
            : picks.length > 0
              ? m.submit(picks.length)
              : m.pickFirst}
        </Button>
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept={ENTITY_IMAGE_ACCEPT}
        multiple
        hidden
        onChange={(event) => {
          onFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <Button
        variant="outline"
        disabled={left <= 0 || uploading != null}
        onClick={() => inputRef.current?.click()}
      >
        <ImagesIcon aria-hidden="true" />
        {m.library}
      </Button>
      {picks.length > 0 ? (
        <ul className="grid grid-cols-3 gap-1.5">
          {picks.map((pick, index) => (
            <li key={pick.url} className="aspect-square">
              <button
                type="button"
                onClick={() => drop(pick)}
                disabled={uploading != null}
                aria-label={`${index + 1}. ${m.remove}`}
                className="border-ink focus-visible:ring-ring/50 relative block size-full overflow-hidden rounded-[10px] border-2 outline-none focus-visible:ring-[3px]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL */}
                <img src={pick.url} alt="" className="size-full object-cover" />
                <span className="bg-control text-on-control text-eyebrow absolute end-1.5 top-1.5 flex size-5 items-center justify-center rounded-full font-semibold">
                  {index + 1}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-eyebrow text-muted-foreground">{m.footnote}</p>
    </AlbumSheet>
  );
}

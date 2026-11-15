"use client";

import {
  albumCaption,
  albumCountLabel,
  albumTiles,
  type GameAlbum,
} from "@repo/domain/game-album";
import { PlusIcon } from "lucide-react";

import { useLocale, useMessages } from "~/components/locale-provider";

import { InitialsBadge } from "./initials-badge";
import { SectionHeading } from "./section-heading";

/** Six tiles, three by two: photos from the start, hatched where empty, the plus while you may add. */
export function AlbumSection({
  album,
  onAdd,
  onOpenPhoto,
}: {
  album: GameAlbum;
  onAdd: () => void;
  onOpenPhoto: (photoId: string) => void;
}) {
  const locale = useLocale();
  const m = useMessages().gameAlbum.album;
  const tiles = albumTiles(album.photos, album.viewer.canAddPhotos);

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading
        title={m.title}
        count={albumCountLabel(album.photos.length, locale)}
      />
      <ul className="grid grid-cols-3 gap-1.5">
        {tiles.map((tile, index) => (
          <li
            key={tile.kind === "photo" ? tile.photo.id : `slot-${index}`}
            className="aspect-square"
          >
            {tile.kind === "photo" ? (
              <button
                type="button"
                onClick={() => onOpenPhoto(tile.photo.id)}
                aria-label={
                  tile.photo.isMine
                    ? m.photoByYou
                    : m.photoBy(tile.photo.uploader.name)
                }
                className="focus-visible:ring-ring/50 relative block size-full overflow-hidden rounded-[10px] outline-none focus-visible:ring-[3px]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- presigned bucket URLs are not static assets */}
                <img
                  src={tile.photo.url}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover transition-opacity hover:opacity-90"
                />
                <InitialsBadge
                  name={tile.photo.uploader.name}
                  mine={tile.photo.isMine}
                  className="absolute bottom-1.5 start-1.5 size-5 text-[9px]"
                />
              </button>
            ) : tile.kind === "add" && tile.primary ? (
              <button
                type="button"
                onClick={onAdd}
                className="bg-control text-on-control focus-visible:ring-ring/50 hover:bg-control/90 flex size-full flex-col items-center justify-center gap-1 rounded-[10px] outline-none focus-visible:ring-[3px]"
              >
                <PlusIcon aria-hidden="true" className="size-4" />
                <span className="text-eyebrow font-semibold">
                  {m.addPhotos}
                </span>
              </button>
            ) : tile.kind === "add" ? (
              <button
                type="button"
                onClick={onAdd}
                aria-label={m.addPhoto}
                className="border-rule text-muted-foreground hover:text-ink focus-visible:ring-ring/50 relative flex size-full items-center justify-center overflow-hidden rounded-[10px] border outline-none focus-visible:ring-[3px]"
              >
                <span aria-hidden="true" className="hatch absolute inset-0" />
                <PlusIcon aria-hidden="true" className="relative size-4" />
              </button>
            ) : (
              <span
                role="img"
                aria-label={m.emptySlot}
                className="border-rule relative block size-full overflow-hidden rounded-[10px] border"
              >
                <span aria-hidden="true" className="hatch absolute inset-0" />
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="text-eyebrow text-muted-foreground">
        {albumCaption(album, locale)}
      </p>
    </section>
  );
}

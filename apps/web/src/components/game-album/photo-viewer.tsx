"use client";

import { photoTimeLabel, type GameAlbumPhoto } from "@repo/domain/game-album";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  ShareIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { useLocale, useMessages } from "~/components/locale-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";

import { InitialsBadge } from "./initials-badge";

const BAR_BUTTON =
  "bg-control-raised text-on-control focus-visible:ring-ring/50 inline-flex size-9 items-center justify-center rounded-[10px] outline-none hover:opacity-80 focus-visible:ring-[3px] disabled:opacity-40";

const ACTION_BUTTON =
  "text-on-control focus-visible:ring-ring/50 inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[10px] font-semibold outline-none focus-visible:ring-[3px] disabled:opacity-50";

async function photoFile(photo: GameAlbumPhoto) {
  const response = await fetch(photo.url);
  if (!response.ok) {
    throw new Error(String(response.status));
  }
  const blob = await response.blob();
  return new File([blob], `temba-${photo.id}.jpg`, {
    type: blob.type || "image/jpeg",
  });
}

/**
 * A photo from the Album on black: counter and share at the top, dots under
 * the photo, who added it and when, Save, and Remove for the uploader and
 * the Organizer. Arrow keys move through the six.
 */
export function PhotoViewer({
  photos,
  initialPhotoId,
  place,
  onClose,
  onRemove,
}: {
  photos: readonly GameAlbumPhoto[];
  initialPhotoId: string | null;
  place: string;
  onClose: () => void;
  onRemove: (photo: GameAlbumPhoto) => Promise<boolean>;
}) {
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.gameAlbum.viewer;
  const open = initialPhotoId != null;
  const [index, setIndex] = React.useState(0);
  const [confirming, setConfirming] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  // Only a new opening picks the start; removing a photo keeps the place.
  const photosRef = React.useRef(photos);
  photosRef.current = photos;
  React.useEffect(() => {
    if (open) {
      setIndex(
        Math.max(
          0,
          photosRef.current.findIndex((photo) => photo.id === initialPhotoId),
        ),
      );
      setConfirming(false);
    }
  }, [open, initialPhotoId]);

  React.useEffect(() => {
    if (open && photos.length === 0) {
      onClose();
    }
  }, [open, photos.length, onClose]);

  const photo = photos[Math.min(index, photos.length - 1)];
  const go = (step: number) => {
    setConfirming(false);
    setIndex((current) =>
      Math.min(photos.length - 1, Math.max(0, current + step)),
    );
  };

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } catch {
      toast.error(messages.common.somethingWentWrong);
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => {
      if (!photo) {
        return;
      }
      let file: File;
      try {
        file = await photoFile(photo);
      } catch {
        // The bucket may refuse a cross-origin read; the browser can still save it from a tab.
        window.open(photo.url, "_blank", "noopener");
        return;
      }
      const href = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = href;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(href);
    });

  const share = () =>
    run(async () => {
      if (!photo) {
        return;
      }
      const file = await photoFile(photo);
      const data = { files: [file] };
      if (navigator.canShare?.(data)) {
        await navigator.share(data).catch(() => undefined);
      }
    });

  const remove = () =>
    run(async () => {
      if (photo && (await onRemove(photo))) {
        toast.success(m.removed);
        setConfirming(false);
      }
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            go(document.dir === "rtl" ? -1 : 1);
          } else if (event.key === "ArrowLeft") {
            go(document.dir === "rtl" ? 1 : -1);
          }
        }}
        className="bg-control text-on-control border-control-rule flex h-[min(92vh,820px)] max-w-[calc(100%-1rem)] flex-col gap-0 p-0 sm:max-w-[560px]"
      >
        <DialogTitle className="sr-only">
          {photo ? m.photo(index + 1, photos.length) : m.close}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {photo
            ? m.meta(photoTimeLabel(photo.createdAt, locale), place)
            : place}
        </DialogDescription>
        <div className="flex items-center justify-between px-4 pt-4">
          <button
            type="button"
            className={BAR_BUTTON}
            onClick={onClose}
            aria-label={m.close}
          >
            <XIcon aria-hidden="true" className="size-4" />
          </button>
          <span
            aria-live="polite"
            className="text-eyebrow text-on-control-muted tabular-nums"
          >
            {photos.length > 0 ? m.counter(index + 1, photos.length) : null}
          </span>
          {canShare ? (
            <button
              type="button"
              className={BAR_BUTTON}
              onClick={() => void share()}
              disabled={busy}
              aria-label={m.share}
            >
              <ShareIcon aria-hidden="true" className="size-4" />
            </button>
          ) : (
            <span className="size-9" />
          )}
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center py-4">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- presigned bucket URLs are not static assets
            <img
              key={photo.id}
              src={photo.url}
              alt={m.photo(index + 1, photos.length)}
              className="max-h-full max-w-full object-contain"
            />
          ) : null}
          {index > 0 ? (
            <button
              type="button"
              className={cn(BAR_BUTTON, "absolute start-3")}
              onClick={() => go(-1)}
              aria-label={m.previous}
            >
              <ChevronLeftIcon
                aria-hidden="true"
                className="size-4 rtl:-scale-x-100"
              />
            </button>
          ) : null}
          {index < photos.length - 1 ? (
            <button
              type="button"
              className={cn(BAR_BUTTON, "absolute end-3")}
              onClick={() => go(1)}
              aria-label={m.next}
            >
              <ChevronRightIcon
                aria-hidden="true"
                className="size-4 rtl:-scale-x-100"
              />
            </button>
          ) : null}
        </div>

        <div
          aria-hidden="true"
          className="flex justify-center gap-[5px] pb-3.5"
        >
          {photos.map((item, dotIndex) => (
            <span
              key={item.id}
              className={cn(
                "h-[5px] rounded-full",
                dotIndex === index
                  ? "bg-on-control w-[15px]"
                  : "bg-control-rule w-[5px]",
              )}
            />
          ))}
        </div>

        {photo ? (
          <div className="flex flex-col gap-3.5 px-4 pb-4">
            <div className="flex items-center gap-3">
              <InitialsBadge
                name={photo.uploader.name}
                mine={false}
                className="size-[34px] rounded-[10px] text-[11px]"
              />
              <div className="min-w-0">
                <p className="text-body font-semibold">
                  {photo.isMine ? m.youAdded : m.added(photo.uploader.name)}
                </p>
                <p className="text-eyebrow text-on-control-muted">
                  {m.meta(photoTimeLabel(photo.createdAt, locale), place)}
                </p>
              </div>
            </div>
            {confirming ? (
              <div className="border-control-rule flex flex-col gap-2.5 rounded-[10px] border p-3">
                <p className="text-body font-semibold">{m.removeTitle}</p>
                <p className="text-meta text-on-control-muted">
                  {m.removeBody}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={cn(ACTION_BUTTON, "border-control-rule border")}
                    onClick={() => setConfirming(false)}
                  >
                    {m.cancel}
                  </button>
                  <button
                    type="button"
                    className={cn(ACTION_BUTTON, "bg-control-raised")}
                    disabled={busy}
                    onClick={() => void remove()}
                  >
                    <Trash2Icon aria-hidden="true" className="size-4" />
                    {m.removeConfirm}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  className={cn(ACTION_BUTTON, "bg-control-raised")}
                  disabled={busy}
                  onClick={() => void save()}
                >
                  <DownloadIcon aria-hidden="true" className="size-4" />
                  {m.save}
                </button>
                {photo.canRemove ? (
                  <button
                    type="button"
                    className={cn(ACTION_BUTTON, "border-control-rule border")}
                    disabled={busy}
                    onClick={() => setConfirming(true)}
                  >
                    <Trash2Icon aria-hidden="true" className="size-4" />
                    {m.remove}
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

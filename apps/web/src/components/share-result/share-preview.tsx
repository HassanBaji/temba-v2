"use client";

import { stickerPlacement } from "@repo/domain/result-share-frame";
import { Image as ImageIcon, type LucideIcon } from "lucide-react";

import { useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

/** The card's width in the fitted preview: the whole page stays above the fold. */
const FITTED_WIDTH = 236;
const PLACEMENT = stickerPlacement();

/** The wash well a preview sits in, fitted to a small frame or opened to full width. */
export function PreviewWell({
  full,
  children,
}: {
  full: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-wash flex justify-center rounded-[16px] p-[22px]">
      <div
        className="max-w-full overflow-hidden rounded-[10px]"
        style={{ width: full ? "100%" : FITTED_WIDTH }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * A 9:16 photo with the sticker where the story editor would put it. The
 * sticker inside is the capture; the photo only shows how it reads.
 */
export function PhotoFrame({
  photoUrl,
  children,
}: {
  photoUrl: string | null;
  children: React.ReactNode;
}) {
  const m = useMessages().webUi.shareResult;
  return (
    <div className="bg-control-raised relative flex aspect-[9/16] w-full items-center justify-center">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- a local object URL
        <img
          src={photoUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div className="text-on-control-muted flex flex-col items-center gap-2">
          <ImageIcon className="size-7" aria-hidden="true" />
          <span className="text-eyebrow">{m.yourPhoto}</span>
        </div>
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, transparent 45%, rgba(0, 0, 0, 0.55) 100%)",
        }}
      />
      <div
        className="absolute"
        style={{
          left: `${PLACEMENT.insetPercent}%`,
          right: `${PLACEMENT.insetPercent}%`,
          bottom: `${PLACEMENT.bottomPercent}%`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** The line under the preview: the file's format, and one quiet door on the right. */
export function PreviewMeta({
  format,
  action,
}: {
  format: string;
  action: { label: string; icon: LucideIcon; onClick: () => void };
}) {
  const Icon = action.icon;
  return (
    <div className="flex items-center justify-between gap-3 px-0.5">
      <span className="text-eyebrow text-muted-foreground truncate font-mono tracking-[0.08em]">
        {format}
      </span>
      <button
        type="button"
        onClick={action.onClick}
        className={cn(
          "text-meta text-muted-foreground hover:text-foreground inline-flex min-h-11 shrink-0 items-center gap-1.5 transition-colors",
          "focus-visible:ring-ring/50 rounded-md outline-none focus-visible:ring-[3px]",
        )}
      >
        <Icon className="size-[13px]" aria-hidden="true" />
        {action.label}
      </button>
    </div>
  );
}

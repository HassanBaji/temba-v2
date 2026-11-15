"use client";

import { toJpeg, toPng } from "html-to-image";
import {
  FileText,
  Link as LinkIcon,
  Share,
  Smartphone,
  Square,
  Table2,
  type LucideIcon,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { A4_POINTS, jpegToPdf } from "@repo/domain/image-pdf";
import {
  STANDING_PDF_PAGE,
  STANDING_SQUARE_SIZE,
  standingShareCard,
  standingShareCsv,
  standingShareFileName,
  standingShareFormatOptions,
  standingSharePreview,
  standingShareTable,
  standingShareWhat,
  type StandingShareAction,
  type StandingShareFormat,
  type StandingShareInput,
} from "@repo/domain/standing-share";

import { useLocale, useMessages } from "~/components/locale-provider";
import { MarksSheet } from "~/components/marks/marks-sheet";
import {
  STORY_HEIGHT,
  STORY_WIDTH,
  ScaledCanvas,
} from "~/components/share-result/scaled-canvas";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { copyTextWhenReady } from "~/lib/share-link";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import {
  StandingPdfPage,
  StandingSquareCard,
  StandingStoryCard,
} from "./standing-share-cards";

const FORMAT_ICONS: Record<StandingShareFormat, LucideIcon> = {
  story: Smartphone,
  square: Square,
  pdf: FileText,
  csv: Table2,
  link: LinkIcon,
};

/** The design's preview tile: 72 wide, each format at its own shape. */
const THUMB_WIDTH = 72;

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function blobFromDataUrl(dataUrl: string) {
  return (await fetch(dataUrl)).blob();
}

/** The system share sheet with the file where it takes files; a download elsewhere. */
async function shareOrDownload(file: File) {
  if (
    typeof navigator.share === "function" &&
    navigator.canShare?.({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
    }
  }
  download(file, file.name);
}

function Thumbnail({
  format,
  input,
  canvasRef,
}: {
  format: StandingShareFormat;
  input: StandingShareInput;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}) {
  const locale = useLocale();
  if (format === "csv" || format === "link") {
    const Icon = FORMAT_ICONS[format];
    return (
      <span className="bg-wash flex size-[72px] shrink-0 items-center justify-center rounded-[12px]">
        <Icon aria-hidden="true" className="size-6" />
      </span>
    );
  }
  const size =
    format === "story"
      ? { width: STORY_WIDTH, height: STORY_HEIGHT }
      : format === "square"
        ? { width: STANDING_SQUARE_SIZE, height: STANDING_SQUARE_SIZE }
        : STANDING_PDF_PAGE;
  return (
    <div
      aria-hidden="true"
      className={cn(
        "shrink-0 overflow-hidden",
        format === "pdf" ? "border-rule rounded-[4px] border" : "rounded-[8px]",
      )}
      style={{ width: THUMB_WIDTH }}
    >
      <ScaledCanvas
        canvasRef={canvasRef}
        canvasWidth={size.width}
        canvasHeight={size.height}
      >
        {format === "story" ? (
          <StandingStoryCard card={standingShareCard(input, "story", locale)} />
        ) : format === "square" ? (
          <StandingSquareCard
            card={standingShareCard(input, "square", locale)}
          />
        ) : (
          <StandingPdfPage table={standingShareTable(input, locale)} />
        )}
      </ScaledCanvas>
    </div>
  );
}

/**
 * Design "Group standings" 2a: one sheet that shares the lens and view on
 * screen as an image, a PDF, a CSV or a link.
 */
export function StandingShareSheet({
  open,
  onClose,
  groupId,
  input,
}: {
  open: boolean;
  onClose: () => void;
  groupId: string;
  /** Everything but Highlight me, which the sheet owns. */
  input: Omit<StandingShareInput, "highlight">;
}) {
  const locale = useLocale();
  const m = useMessages().group.standing.share;
  const utils = api.useUtils();
  const canvasRef = React.useRef<HTMLDivElement | null>(null);
  const [format, setFormat] = React.useState<StandingShareFormat>("story");
  const [highlight, setHighlight] = React.useState(false);
  const [pending, setPending] = React.useState<StandingShareAction | null>(
    null,
  );
  const share = { ...input, highlight };
  const preview = standingSharePreview(format, highlight, locale);
  const seasonId = input.season?.id ?? null;

  async function file(): Promise<File> {
    if (format === "csv") {
      const csv = standingShareCsv(standingShareTable(share, locale), locale);
      return new File([csv], standingShareFileName(share, "csv"), {
        type: "text/csv;charset=utf-8",
      });
    }
    const node = canvasRef.current;
    if (!node) {
      throw new Error(m.toasts.failed);
    }
    if (format === "pdf") {
      const jpeg = await toJpeg(node, {
        quality: 0.92,
        pixelRatio: 1,
        width: STANDING_PDF_PAGE.width,
        height: STANDING_PDF_PAGE.height,
        backgroundColor: "#ffffff",
        cacheBust: true,
        style: { transform: "none" },
      });
      const bytes = new Uint8Array(
        await (await blobFromDataUrl(jpeg)).arrayBuffer(),
      );
      const pdf = jpegToPdf(bytes, STANDING_PDF_PAGE, A4_POINTS);
      return new File([pdf], standingShareFileName(share, "pdf"), {
        type: "application/pdf",
      });
    }
    const story = format === "story";
    const png = await toPng(node, {
      pixelRatio: 1,
      width: story ? STORY_WIDTH : STANDING_SQUARE_SIZE,
      height: story ? STORY_HEIGHT : STANDING_SQUARE_SIZE,
      cacheBust: true,
      style: { transform: "none" },
    });
    return new File(
      [await blobFromDataUrl(png)],
      standingShareFileName(share, "png"),
      { type: "image/png" },
    );
  }

  function run(action: StandingShareAction) {
    if (pending) {
      return;
    }
    setPending(action);
    const task = async () => {
      switch (action) {
        case "copy-link": {
          const copied = await copyTextWhenReady(
            utils.groups.standingLink
              .fetch({ groupId, seasonId, view: input.view })
              .then((result) => result.url),
          );
          toast.success(copied ? m.toasts.linkCopied : m.toasts.linkLoading);
          return;
        }
        case "share-image":
        case "share-file":
          await shareOrDownload(await file());
          return;
        case "save-image":
        case "save-file": {
          const saved = await file();
          download(saved, saved.name);
          toast.success(m.toasts.saved);
          return;
        }
      }
    };
    void task()
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : m.toasts.failed);
      })
      .finally(() => setPending(null));
  }

  return (
    <MarksSheet
      open={open}
      onClose={onClose}
      title={m.title}
      subtitle={`${m.onScreen} ${standingShareWhat(input.season, input.view, locale)}`}
      footer={
        <>
          <Button
            type="button"
            size="lg"
            className="text-body w-full font-semibold"
            disabled={pending != null}
            onClick={() => run(preview.primary.action)}
          >
            <Share aria-hidden="true" />
            {preview.primary.label}
          </Button>
          {preview.secondary ? (
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="text-body w-full font-semibold"
              disabled={pending != null}
              onClick={() => run(preview.secondary!.action)}
            >
              {preview.secondary.label}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="border-rule flex min-h-[130px] items-center gap-3.5 rounded-[14px] border p-3.5">
        <Thumbnail format={format} input={share} canvasRef={canvasRef} />
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold">{preview.title}</p>
          <p className="text-eyebrow text-muted-foreground mt-0.5 leading-relaxed">
            {preview.description}
          </p>
        </div>
      </div>

      <div
        role="radiogroup"
        aria-label={m.formatLabel}
        className="border-rule overflow-hidden rounded-[14px] border"
      >
        {standingShareFormatOptions(locale).map((option) => {
          const selected = option.format === format;
          const Icon = FORMAT_ICONS[option.format];
          return (
            <button
              key={option.format}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setFormat(option.format)}
              className={cn(
                "border-rule flex w-full items-center gap-3 border-t px-3.5 py-3 text-start outline-none first:border-t-0 focus-visible:underline",
                selected ? "bg-wash" : "bg-paper hover:bg-wash",
              )}
            >
              <Icon aria-hidden="true" className="size-[18px] shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="text-body block font-semibold">
                  {option.title}
                </span>
                <span className="text-eyebrow text-muted-foreground mt-px block leading-snug">
                  {option.description}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border",
                  selected ? "border-ink" : "border-input",
                )}
              >
                {selected ? (
                  <span className="bg-ink block size-2.5 rounded-full" />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {preview.highlights ? (
        <label className="border-rule flex items-center gap-3 rounded-[14px] border px-3.5 py-3">
          <span className="min-w-0 flex-1">
            <span className="text-body block font-semibold">
              {m.highlight.label}
            </span>
            <span className="text-eyebrow text-muted-foreground block">
              {m.highlight.description}
            </span>
          </span>
          <Switch checked={highlight} onCheckedChange={setHighlight} />
        </label>
      ) : null}
    </MarksSheet>
  );
}

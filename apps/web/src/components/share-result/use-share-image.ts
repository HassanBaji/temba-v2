"use client";

import * as React from "react";
import { toast } from "sonner";

import { useLocale, useMessages } from "~/components/locale-provider";
import {
  copyLinkFailedMessage,
  copyTextWhenReady,
  shareOrCopyLink,
} from "~/lib/share-link";

export type ShareAction =
  | "save"
  | "share_image"
  | "copy_link"
  | "share_message";

function downloadDataUrl(dataUrl: string, name: string) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = name;
  anchor.click();
}

async function fileFromDataUrl(dataUrl: string, name: string) {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], name, { type: "image/png" });
}

/**
 * Save, share, copy-link and message for a result image. One action runs at a
 * time; a failure is a toast.
 */
export function useShareImage({
  capture,
  fileName,
  url,
  message,
}: {
  /** Renders the card to a PNG data URL. */
  capture: () => Promise<string>;
  fileName: string;
  url: string | null;
  /** The text a Message share sends, read when the action runs. */
  message: () => string;
}) {
  const locale = useLocale();
  const m = useMessages().webUi.shareResult;
  const [pending, setPending] = React.useState<ShareAction | null>(null);

  function run(action: ShareAction, task: () => Promise<void>) {
    if (pending) {
      return;
    }
    setPending(action);
    void task()
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : m.shareFailed);
      })
      .finally(() => setPending(null));
  }

  const save = () =>
    run("save", async () => {
      downloadDataUrl(await capture(), fileName);
    });

  const shareImage = () =>
    run("share_image", async () => {
      const file = await fileFromDataUrl(await capture(), fileName);
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
      downloadDataUrl(URL.createObjectURL(file), fileName);
    });

  const copyLink = () =>
    run("copy_link", async () => {
      if (!url) {
        toast.error(m.linkLoading);
        return;
      }
      try {
        await copyTextWhenReady(Promise.resolve(url));
        toast.success(m.linkCopied);
      } catch {
        toast.error(copyLinkFailedMessage(locale));
      }
    });

  const shareMessage = () =>
    run("share_message", async () => {
      const outcome = await shareOrCopyLink({ text: message() });
      if (outcome === "copied") {
        toast.success(m.messageCopied);
      }
    });

  return { pending, save, shareImage, copyLink, shareMessage };
}

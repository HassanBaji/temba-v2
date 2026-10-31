import { toast } from "sonner";

export type ShareLinkOutcome =
  | "shared"
  | "copied"
  | "cancelled"
  | "unavailable";

type LinkShare = { text: string; url?: string };

type ClipboardEnvironment = {
  writeText: (text: string) => Promise<void>;
  writeLater?: (text: Promise<string>) => Promise<void>;
};

type ShareEnvironment = ClipboardEnvironment & {
  share?: (data: ShareData) => Promise<void>;
  coarsePointer: boolean;
};

function browserClipboardEnvironment(): ClipboardEnvironment {
  return {
    writeText: (text) => navigator.clipboard.writeText(text),
    writeLater:
      typeof ClipboardItem === "function" &&
      typeof navigator.clipboard?.write === "function"
        ? (text) =>
            navigator.clipboard.write([
              new ClipboardItem({
                "text/plain": text.then(
                  (value) => new Blob([value], { type: "text/plain" }),
                ),
              }),
            ])
        : undefined,
  };
}

function browserShareEnvironment(): ShareEnvironment {
  return {
    ...browserClipboardEnvironment(),
    share:
      typeof navigator.share === "function"
        ? (data) => navigator.share(data)
        : undefined,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
  };
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

/**
 * Safari only lets a page write to the clipboard inside the tap that asked
 * for it, so text that arrives after a network call is written through a
 * ClipboardItem started before the first await. Call it straight from the
 * click handler. Resolves false without writing when the text never arrives;
 * rejects when the clipboard refuses.
 */
export async function copyTextWhenReady(
  pending: Promise<string | null>,
  clipboard: ClipboardEnvironment = browserClipboardEnvironment(),
): Promise<boolean> {
  if (clipboard.writeLater) {
    try {
      await clipboard.writeLater(
        pending.then((text) => text ?? Promise.reject(new Error("No text"))),
      );
      return true;
    } catch (error) {
      const text = await pending;
      if (text === null) {
        return false;
      }
      try {
        await clipboard.writeText(text);
      } catch {
        throw error;
      }
      return true;
    }
  }
  const text = await pending;
  if (text === null) {
    return false;
  }
  await clipboard.writeText(text);
  return true;
}

/**
 * Opens the native share sheet on touch devices that have one and copies to
 * the clipboard everywhere else. Rejects only when the clipboard write fails.
 */
export async function shareOrCopyLink(
  data: LinkShare | Promise<LinkShare | null>,
  environment: ShareEnvironment = browserShareEnvironment(),
): Promise<ShareLinkOutcome> {
  const pending = Promise.resolve(data);
  if (environment.share && environment.coarsePointer) {
    const ready = await pending;
    if (!ready) {
      return "unavailable";
    }
    try {
      await environment.share(
        ready.url ? { url: ready.url } : { text: ready.text },
      );
      return "shared";
    } catch (error) {
      if (isAbortError(error)) {
        return "cancelled";
      }
    }
    await environment.writeText(ready.text);
    return "copied";
  }
  const copied = await copyTextWhenReady(
    pending.then((ready) => ready?.text ?? null),
    environment,
  );
  return copied ? "copied" : "unavailable";
}

export const COPY_LINK_FAILED_MESSAGE = "Couldn't copy the link";

export async function shareLinkWithFeedback(
  data: LinkShare | Promise<LinkShare | null>,
  copiedMessage: string,
) {
  try {
    const outcome = await shareOrCopyLink(data);
    if (outcome === "copied") {
      toast.success(copiedMessage);
    }
  } catch {
    toast.error(COPY_LINK_FAILED_MESSAGE);
  }
}

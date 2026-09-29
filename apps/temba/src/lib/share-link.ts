import { toast } from "sonner";

export type ShareLinkOutcome = "shared" | "copied" | "cancelled";

type ShareEnvironment = {
  share?: (data: ShareData) => Promise<void>;
  writeText: (text: string) => Promise<void>;
  coarsePointer: boolean;
};

function browserShareEnvironment(): ShareEnvironment {
  return {
    share:
      typeof navigator.share === "function"
        ? (data) => navigator.share(data)
        : undefined,
    writeText: (text) => navigator.clipboard.writeText(text),
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
  };
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

/**
 * Opens the native share sheet on touch devices that have one and copies to
 * the clipboard everywhere else. Rejects only when the clipboard write fails.
 */
export async function shareOrCopyLink(
  data: { text: string; url?: string },
  environment: ShareEnvironment = browserShareEnvironment(),
): Promise<ShareLinkOutcome> {
  if (environment.share && environment.coarsePointer) {
    try {
      await environment.share(
        data.url ? { url: data.url } : { text: data.text },
      );
      return "shared";
    } catch (error) {
      if (isAbortError(error)) {
        return "cancelled";
      }
    }
  }
  await environment.writeText(data.text);
  return "copied";
}

export const COPY_LINK_FAILED_MESSAGE = "Couldn't copy the link";

export async function shareLinkWithFeedback(
  data: { text: string; url?: string },
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

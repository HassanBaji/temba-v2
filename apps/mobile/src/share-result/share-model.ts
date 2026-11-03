export type ShareMode = "story" | "sticker";

export type ShareModeCopy = {
  /** The mono line under the preview: what the file is. */
  format: string;
  share: string;
  save: string;
  /** Shown under the preview when the saved file differs from what is on screen. */
  note: string | null;
};

export const SHARE_MODE_COPY: Record<ShareMode, ShareModeCopy> = {
  story: {
    format: "1080 × 1920 · STORY",
    share: "Share image",
    save: "Save",
    note: null,
  },
  sticker: {
    format: "TRANSPARENT PNG · STICKER",
    share: "Share sticker",
    save: "Save PNG",
    note: "Only the black card is saved. Drop it on your own photo in the story editor.",
  },
};

export type ShareMode = "story" | "sticker";

export const SHARE_MODE_HINT: Record<ShareMode, string> = {
  story: "1080 × 1920, sized for a story.",
  sticker: "A transparent sticker to drop on your own photo.",
};

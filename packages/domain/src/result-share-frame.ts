/** The story canvas a result card is drawn on, in export pixels. */
export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

/** Where a sticker sits on a story: inset from both sides, raised from the bottom. */
export const STICKER_INSET = 72;
export const STICKER_BOTTOM = 160;
export const STICKER_WIDTH = STORY_WIDTH - 2 * STICKER_INSET;

export type StickerPlacement = {
  /** Side inset as a percentage of the frame width. */
  insetPercent: number;
  /** Bottom offset as a percentage of the frame height. */
  bottomPercent: number;
};

/**
 * The sticker's place on a photo of any size, as percentages, so a preview
 * can position it with CSS alone and stays true to the exported story.
 */
export function stickerPlacement(): StickerPlacement {
  return {
    insetPercent: (STICKER_INSET / STORY_WIDTH) * 100,
    bottomPercent: (STICKER_BOTTOM / STORY_HEIGHT) * 100,
  };
}

/** The preview height that keeps a story frame's 9:16 shape. */
export function storyFrameHeight(width: number): number {
  return (width * STORY_HEIGHT) / STORY_WIDTH;
}

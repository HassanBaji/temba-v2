import { describe, expect, it } from "vitest";

import {
  STICKER_WIDTH,
  STORY_HEIGHT,
  STORY_WIDTH,
  stickerPlacement,
  storyFrameHeight,
} from "./result-share-frame";

describe("result share frame", () => {
  it("draws a story at 1080 × 1920 with the sticker 72 in from each side", () => {
    expect(STORY_WIDTH).toBe(1080);
    expect(STORY_HEIGHT).toBe(1920);
    expect(STICKER_WIDTH).toBe(936);
  });

  it("places the sticker where the story frame puts it, whatever the preview size", () => {
    const placement = stickerPlacement();
    expect(placement.insetPercent).toBeCloseTo(6.6667, 3);
    expect(placement.bottomPercent).toBeCloseTo(8.3333, 3);
    expect((placement.insetPercent / 100) * 236).toBeCloseTo(15.73, 2);
    expect((placement.bottomPercent / 100) * 420).toBeCloseTo(35, 2);
  });

  it("keeps a preview frame at 9:16", () => {
    expect(storyFrameHeight(1080)).toBe(1920);
    expect(storyFrameHeight(236)).toBeCloseTo(419.56, 2);
  });
});

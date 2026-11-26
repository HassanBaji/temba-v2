import { describe, expect, it } from "vitest";

import {
  seriesAttachPick,
  seriesEditOptions,
  type SeriesAttachOption,
} from "./series-attach";

const sunday: SeriesAttachOption = {
  id: "sunday",
  name: "Sunday Social",
  emblem: "cup",
  colour: "gold",
  edition: 12,
};
const thursday: SeriesAttachOption = {
  id: "thursday",
  name: "Thursday Ladder",
  emblem: "bolt",
  colour: "blue",
  edition: 32,
};

describe("seriesAttachPick", () => {
  it("finds the picked series while it is offered", () => {
    expect(seriesAttachPick([sunday, thursday], "thursday")).toBe(thursday);
  });

  it("falls back to none when the series is no longer offered", () => {
    expect(seriesAttachPick([thursday], "sunday")).toBeNull();
    expect(seriesAttachPick([], "sunday")).toBeNull();
  });

  it("is none when nothing is picked", () => {
    expect(seriesAttachPick([sunday], null)).toBeNull();
  });
});

describe("seriesEditOptions", () => {
  it("offers the running series when the Game has none", () => {
    expect(seriesEditOptions([sunday, thursday], null)).toEqual([
      sunday,
      thursday,
    ]);
  });

  it("keeps the Game's own series first once it is no longer running", () => {
    const ended = { ...sunday, id: "ended", name: "Old Social" };
    expect(seriesEditOptions([thursday], ended)).toEqual([ended, thursday]);
  });

  it("does not repeat the Game's series while it is running", () => {
    expect(seriesEditOptions([sunday, thursday], sunday)).toEqual([
      sunday,
      thursday,
    ]);
  });
});

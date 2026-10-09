import { describe, expect, it } from "vitest";

import { gridRows } from "./grid-rows";

describe("gridRows", () => {
  it("fills complete rows", () => {
    expect(gridRows([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("pads the last row so cells keep the column width", () => {
    expect(gridRows(["None", "1", "2", "3", "4", "More"], 5)).toEqual([
      ["None", "1", "2", "3", "4"],
      ["More", null, null, null, null],
    ]);
  });

  it("returns no rows for no items", () => {
    expect(gridRows([], 4)).toEqual([]);
  });

  it("treats fewer than one column as one", () => {
    expect(gridRows(["a", "b"], 0)).toEqual([["a"], ["b"]]);
  });
});

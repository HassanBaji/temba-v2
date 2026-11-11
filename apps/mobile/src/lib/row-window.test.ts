import { describe, expect, it } from "vitest";

import { windowedRows } from "./row-window";

describe("windowedRows", () => {
  const rows = Array.from({ length: 120 }, (_, index) => index);

  it("shows the first window and counts the rest", () => {
    const { shown, hidden } = windowedRows(rows, 50);
    expect(shown).toHaveLength(50);
    expect(shown[49]).toBe(49);
    expect(hidden).toBe(70);
  });

  it("shows every row once the window covers them", () => {
    expect(windowedRows(rows, 150)).toEqual({ shown: rows, hidden: 0 });
    expect(windowedRows([], 50)).toEqual({ shown: [], hidden: 0 });
  });
});

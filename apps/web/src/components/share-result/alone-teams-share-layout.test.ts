import { describe, expect, it } from "vitest";

import { aloneShareLayout } from "./alone-teams-share-layout";

describe("aloneShareLayout", () => {
  it("puts eight teams on a Story in one column of pairs at full size", () => {
    expect(aloneShareLayout(8, "story")).toEqual({
      columns: 1,
      stacked: false,
      rowHeight: 96,
      namePx: 34,
    });
  });

  it("moves a Story past twelve teams to two columns with stacked names", () => {
    const layout = aloneShareLayout(16, "story");
    expect(layout.columns).toBe(2);
    expect(layout.stacked).toBe(true);
    expect(layout.rowHeight).toBe(120);
  });

  it("splits a Square into two columns and shrinks the rows to fit", () => {
    expect(aloneShareLayout(8, "square")).toMatchObject({
      columns: 2,
      stacked: true,
      rowHeight: 130,
    });
    const crowded = aloneShareLayout(32, "square");
    expect(crowded.rowHeight * 16).toBeLessThanOrEqual(600);
    expect(crowded.namePx).toBeLessThan(aloneShareLayout(8, "square").namePx);
  });
});

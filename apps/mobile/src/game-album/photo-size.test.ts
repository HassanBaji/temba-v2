import { describe, expect, it } from "vitest";

import { fitWithin } from "./photo-size";

describe("fitWithin", () => {
  it("shrinks the long edge to the cap and keeps the shape", () => {
    expect(fitWithin(4032, 3024, 2048)).toEqual({ width: 2048, height: 1536 });
    expect(fitWithin(3024, 4032, 2048)).toEqual({ width: 1536, height: 2048 });
  });

  it("never enlarges a small photo", () => {
    expect(fitWithin(800, 600, 2048)).toEqual({ width: 800, height: 600 });
  });
});

import { describe, expect, it } from "vitest";

import { sportSchema } from "./sport";

describe("sportSchema", () => {
  it("accepts padel and football", () => {
    expect(sportSchema.parse("padel")).toBe("padel");
    expect(sportSchema.parse("football")).toBe("football");
  });

  it("refuses anything else", () => {
    expect(sportSchema.safeParse("tennis").success).toBe(false);
    expect(sportSchema.safeParse(undefined).success).toBe(false);
  });
});

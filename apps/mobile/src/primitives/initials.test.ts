import { describe, expect, it } from "vitest";

import { initialsFor } from "./initials";

describe("initialsFor", () => {
  it("takes the first and last initials", () => {
    expect(initialsFor("Hassan Al Udyh")).toBe("HU");
  });

  it("handles one word and blanks", () => {
    expect(initialsFor("hassan")).toBe("H");
    expect(initialsFor("   ")).toBe("");
  });
});

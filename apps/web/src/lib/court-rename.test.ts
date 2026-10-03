import { describe, expect, it } from "vitest";

import { courtRenameIsDirty } from "~/lib/court-rename";

describe("courtRenameIsDirty", () => {
  it("is clean while the draft matches the saved name", () => {
    expect(courtRenameIsDirty("Court 1", "Court 1")).toBe(false);
    expect(courtRenameIsDirty("  Court 1 ", "Court 1")).toBe(false);
  });

  it("is clean for a blank draft", () => {
    expect(courtRenameIsDirty("   ", "Court 1")).toBe(false);
  });

  it("is dirty for a new name", () => {
    expect(courtRenameIsDirty("Centre Court", "Court 1")).toBe(true);
  });
});

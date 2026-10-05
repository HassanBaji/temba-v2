import { describe, expect, it } from "vitest";

import { drawToast } from "./organizer-model";

describe("drawToast", () => {
  it("names the groups for a Pool draw", () => {
    expect(drawToast("drawn", false)).toBe("Groups drawn");
    expect(drawToast("posted", false)).toBe("Group draw posted");
    expect(drawToast("undone", false)).toBe("Group draw undone");
  });

  it("names the knockout for a Knockout draw", () => {
    expect(drawToast("drawn", true)).toBe("Knockout drawn");
    expect(drawToast("posted", true)).toBe("Draw posted");
    expect(drawToast("undone", true)).toBe("Draw undone");
  });
});

import { describe, expect, it } from "vitest";

import { drawToast } from "./organizer-model";

describe("drawToast", () => {
  it("names the groups for a Pool draw", () => {
    expect(drawToast("drawn", false, "en")).toBe("Groups drawn");
    expect(drawToast("posted", false, "en")).toBe("Group draw posted");
    expect(drawToast("undone", false, "en")).toBe("Group draw undone");
  });

  it("names the knockout for a Knockout draw", () => {
    expect(drawToast("drawn", true, "en")).toBe("Knockout drawn");
    expect(drawToast("posted", true, "en")).toBe("Draw posted");
    expect(drawToast("undone", true, "en")).toBe("Draw undone");
  });

  it("writes the toast in Arabic", () => {
    expect(drawToast("drawn", false, "ar")).toBe("تمت قرعة المجموعات");
    expect(drawToast("posted", true, "ar")).toBe("نُشرت القرعة");
  });
});

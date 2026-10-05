import { describe, expect, it } from "vitest";

import { backTarget } from "./back-target";

describe("backTarget", () => {
  it("goes back when there is history", () => {
    expect(backTarget(true, "/games")).toEqual({ kind: "back" });
  });

  it("replaces with the tab root after a cold deep link", () => {
    expect(backTarget(false, "/games")).toEqual({
      kind: "replace",
      href: "/games",
    });
  });
});

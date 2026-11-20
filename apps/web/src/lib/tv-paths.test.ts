import { describe, expect, it } from "vitest";

import { parseTvEntryNotice, tvBoardHref, tvEntryHref } from "./tv-paths";

describe("tv paths", () => {
  it("builds the board and the code entry with its reason", () => {
    expect(tvBoardHref("482913")).toBe("/tv/482913");
    expect(tvEntryHref({})).toBe("/tv");
    expect(tvEntryHref({ notice: "stopped" })).toBe("/tv?notice=stopped");
    expect(tvEntryHref({ code: "482913", notice: "not_found" })).toBe(
      "/tv?code=482913&notice=not_found",
    );
  });

  it("reads only a reason it knows", () => {
    expect(parseTvEntryNotice("closed")).toBe("closed");
    expect(parseTvEntryNotice("anything")).toBeUndefined();
    expect(parseTvEntryNotice(undefined)).toBeUndefined();
  });
});

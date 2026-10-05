import { describe, expect, it } from "vitest";

import { visibleTabs } from "./tab-list";

describe("visibleTabs", () => {
  it("shows Home, Games, Groups and Profile without the Group creator flag", () => {
    expect(visibleTabs(false).map((tab) => tab.title)).toEqual([
      "Home",
      "Games",
      "Groups",
      "Profile",
    ]);
  });

  it("puts Communities before Profile with the Group creator flag", () => {
    expect(visibleTabs(true).map((tab) => tab.title)).toEqual([
      "Home",
      "Games",
      "Groups",
      "Communities",
      "Profile",
    ]);
  });
});

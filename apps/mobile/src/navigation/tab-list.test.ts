import { describe, expect, it } from "vitest";

import { tabBarHidden, visibleTabs } from "./tab-list";

describe("visibleTabs", () => {
  it("shows Home, Games, Book, Groups and Profile without the Group creator flag", () => {
    expect(visibleTabs(false).map((tab) => tab.title)).toEqual([
      "Home",
      "Games",
      "Book",
      "Groups",
      "Profile",
    ]);
  });

  it("puts Communities before Profile with the Group creator flag", () => {
    expect(visibleTabs(true).map((tab) => tab.title)).toEqual([
      "Home",
      "Games",
      "Book",
      "Groups",
      "Communities",
      "Profile",
    ]);
  });
});

describe("tabBarHidden", () => {
  it("hides the tab bar on the create Game flow", () => {
    expect(tabBarHidden(["(app)", "games", "new"])).toBe(true);
  });

  it("keeps the tab bar elsewhere", () => {
    expect(tabBarHidden(["(app)", "games"])).toBe(false);
    expect(tabBarHidden(["(app)", "games", "abc123"])).toBe(false);
    expect(tabBarHidden(["(app)", "groups", "new"])).toBe(false);
  });

  it("hides the tab bar from a Venue onward in the Book flow", () => {
    expect(tabBarHidden(["(app)", "book", "venues", "[venueId]"])).toBe(true);
    expect(
      tabBarHidden(["(app)", "book", "venues", "[venueId]", "checkout"]),
    ).toBe(true);
    expect(tabBarHidden(["(app)", "book", "bookings", "[bookingId]"])).toBe(
      true,
    );
  });

  it("keeps the tab bar on My bookings and the Venues list", () => {
    expect(tabBarHidden(["(app)", "book"])).toBe(false);
    expect(tabBarHidden(["(app)", "book", "venues"])).toBe(false);
  });
});

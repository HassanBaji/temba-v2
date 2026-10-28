import { describe, expect, it } from "vitest";

import { stackMissingRoot, tabBarHidden, visibleTabs } from "./tab-list";

describe("visibleTabs", () => {
  it("shows Home, Games, Book, Groups and Profile, without Communities", () => {
    expect(visibleTabs().map((tab) => tab.title)).toEqual([
      "Home",
      "Games",
      "Book",
      "Groups",
      "Profile",
    ]);
  });
});

describe("tabBarHidden", () => {
  it("hides the tab bar on the create Game flow", () => {
    expect(tabBarHidden(["(app)", "games", "new"])).toBe(true);
  });

  it("hides the tab bar from a Game's details onward", () => {
    expect(tabBarHidden(["(app)", "games", "[id]"])).toBe(true);
    expect(
      tabBarHidden(["(app)", "games", "players", "[userId]", "matches"]),
    ).toBe(true);
  });

  it("keeps the tab bar elsewhere", () => {
    expect(tabBarHidden(["(app)", "games"])).toBe(false);
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

  it("keeps the tab bar on the Book screen and My bookings in Profile", () => {
    expect(tabBarHidden(["(app)", "book"])).toBe(false);
    expect(tabBarHidden(["(app)", "profile", "bookings"])).toBe(false);
    expect(tabBarHidden(["(app)", "profile", "bookings", "[bookingId]"])).toBe(
      false,
    );
  });
});

describe("stackMissingRoot", () => {
  it("is true when a tab's stack was opened on a detail screen", () => {
    expect(stackMissingRoot({ key: "s", routes: [{ name: "[id]" }] })).toBe(
      true,
    );
  });

  it("is false when the tab's list is at the bottom of the stack", () => {
    expect(
      stackMissingRoot({
        key: "s",
        routes: [{ name: "index" }, { name: "[id]" }],
      }),
    ).toBe(false);
  });

  it("is false before the tab's stack exists", () => {
    expect(stackMissingRoot(undefined)).toBe(false);
  });
});

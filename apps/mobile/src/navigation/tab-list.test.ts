import { messagesFor } from "@repo/i18n/messages";
import { describe, expect, it } from "vitest";

import { stackMissingRoot, tabBarHidden, visibleTabs } from "./tab-list";

describe("visibleTabs", () => {
  it("shows Home, Games, Challenges, Groups and Profile", () => {
    expect(visibleTabs(messagesFor("en")).map((tab) => tab.title)).toEqual([
      "Home",
      "Games",
      "Challenges",
      "Groups",
      "Profile",
    ]);
  });

  it("reads the titles from the Arabic catalog", () => {
    expect(visibleTabs(messagesFor("ar")).map((tab) => tab.title)).toEqual([
      "الرئيسية",
      "المباريات",
      "التحديات",
      "المجموعات",
      "الملف الشخصي",
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

  it("hides the tab bar on the Profile checklist and its tasks", () => {
    expect(tabBarHidden(["(app)", "(home)", "complete-profile"])).toBe(true);
    expect(tabBarHidden(["(app)", "(home)", "complete-profile", "photo"])).toBe(
      true,
    );
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

  it("leaves Book out of the bar, its routes reached from Home and Profile", () => {
    expect(visibleTabs(messagesFor("en")).map((tab) => tab.slot)).not.toContain(
      "book",
    );
  });

  it("keeps the tab bar on the Challenges segments, Teams and Player profiles", () => {
    expect(tabBarHidden(["(app)", "challenges"])).toBe(false);
    expect(tabBarHidden(["(app)", "challenges", "teams", "[id]"])).toBe(false);
    expect(tabBarHidden(["(app)", "challenges", "teams", "new"])).toBe(false);
    expect(
      tabBarHidden(["(app)", "challenges", "players", "[userId]", "matches"]),
    ).toBe(false);
  });

  it("hides the tab bar on a Challenge's own screens", () => {
    expect(tabBarHidden(["(app)", "challenges", "[id]"])).toBe(true);
    expect(tabBarHidden(["(app)", "challenges", "new"])).toBe(true);
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

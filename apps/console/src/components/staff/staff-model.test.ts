import { describe, expect, it } from "vitest";

import {
  candidateManagers,
  MANAGER_CAPABILITIES,
  managerSubtitle,
} from "./staff-model";

describe("managerSubtitle", () => {
  it("shows the handle for another manager who has one", () => {
    expect(managerSubtitle({ username: "reem", isViewer: false })).toBe(
      "@reem",
    );
  });

  it("appends ', you' for the signed-in manager with a handle", () => {
    expect(managerSubtitle({ username: "noor", isViewer: true })).toBe(
      "@noor, you",
    );
  });

  it("says 'you' for the signed-in manager without a username", () => {
    expect(managerSubtitle({ username: null, isViewer: true })).toBe("you");
  });

  it("is empty for another manager without a username", () => {
    expect(managerSubtitle({ username: null, isViewer: false })).toBe(null);
  });
});

describe("candidateManagers", () => {
  it("drops search results that already manage the Venue", () => {
    const results = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(candidateManagers(results, [{ userId: "b" }])).toEqual([
      { id: "a" },
      { id: "c" },
    ]);
  });
});

describe("MANAGER_CAPABILITIES", () => {
  it("lists the glossary's Venue manager scope", () => {
    expect(MANAGER_CAPABILITIES).toContain("Pricing rules");
    expect(MANAGER_CAPABILITIES).toContain("Customers and reports");
    expect(new Set(MANAGER_CAPABILITIES).size).toBe(
      MANAGER_CAPABILITIES.length,
    );
  });
});

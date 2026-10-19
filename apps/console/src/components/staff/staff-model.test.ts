import { describe, expect, it } from "vitest";

import {
  candidateManagers,
  isViewer,
  MANAGER_CAPABILITIES,
  managerSubtitle,
} from "./staff-model";

describe("isViewer", () => {
  it("matches on username, ignoring case and whitespace", () => {
    expect(isViewer({ username: "Noor" }, { username: " noor " })).toBe(true);
  });

  it("is false when either side has no username", () => {
    expect(isViewer({ username: null }, { username: "noor" })).toBe(false);
    expect(isViewer({ username: "noor" }, { username: null })).toBe(false);
    expect(isViewer({ username: "noor" }, null)).toBe(false);
    expect(isViewer({ username: "" }, { username: "" })).toBe(false);
  });

  it("is false for different usernames", () => {
    expect(isViewer({ username: "noor" }, { username: "reem" })).toBe(false);
  });
});

describe("managerSubtitle", () => {
  it("shows the handle for another manager", () => {
    expect(managerSubtitle({ username: "reem" }, { username: "noor" })).toBe(
      "@reem",
    );
  });

  it("appends ', you' for the signed-in manager", () => {
    expect(managerSubtitle({ username: "noor" }, { username: "noor" })).toBe(
      "@noor, you",
    );
  });

  it("is empty when there is no handle and no match", () => {
    expect(managerSubtitle({ username: null }, { username: "noor" })).toBe(
      null,
    );
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

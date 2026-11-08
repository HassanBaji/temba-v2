import { describe, expect, it } from "vitest";

import {
  challengesSegments,
  challengesTabFromQuery,
  challengesTabQuery,
} from "./challenges-tab";

describe("challengesTabFromQuery", () => {
  it("reads Mine and Teams and falls back to Open", () => {
    expect(challengesTabFromQuery("mine")).toBe("mine");
    expect(challengesTabFromQuery("teams")).toBe("teams");
    expect(challengesTabFromQuery("open")).toBe("open");
    expect(challengesTabFromQuery("board")).toBe("open");
    expect(challengesTabFromQuery(undefined)).toBe("open");
  });
});

describe("challengesTabQuery", () => {
  it("leaves Open off the query", () => {
    expect(challengesTabQuery("open")).toBe("");
    expect(challengesTabQuery("mine")).toBe("?tab=mine");
    expect(challengesTabQuery("teams")).toBe("?tab=teams");
  });
});

describe("challengesSegments", () => {
  it("lists Open, Mine and Teams with counts above zero", () => {
    expect(challengesSegments({ open: 0, mine: null, teams: 2 }, "en")).toEqual(
      [
        { key: "open", label: "Open", count: null, accessibilityLabel: "Open" },
        { key: "mine", label: "Mine", count: null, accessibilityLabel: "Mine" },
        {
          key: "teams",
          label: "Teams",
          count: 2,
          accessibilityLabel: "Teams, 2",
        },
      ],
    );
  });

  it("reads the labels from the Arabic catalog", () => {
    expect(
      challengesSegments({ open: null, mine: null, teams: 1 }, "ar").map(
        (segment) => segment.accessibilityLabel,
      ),
    ).toEqual(["مفتوحة", "تحدياتي", "الفرق، 1"]);
  });
});

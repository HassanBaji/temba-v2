import { describe, expect, it } from "vitest";

import {
  footballDraftSavedLine,
  footballDraftSaveProblem,
  footballDraftSummary,
  footballDraftVisibilityLine,
} from "./football-draft";

const bibs = { slot1: "black", slot2: "white" } as const;

describe("footballDraftSaveProblem", () => {
  const roster = ["a", "b", "c", "d"];

  it("saves an incomplete draft with one player placed", () => {
    expect(
      footballDraftSaveProblem({ bibs, slot1: ["a"], slot2: [] }, roster, "en"),
    ).toBeNull();
  });

  it("refuses nobody placed, a player on both sides, someone not registered and one colour", () => {
    expect(
      footballDraftSaveProblem({ bibs, slot1: [], slot2: [] }, roster, "en"),
    ).toBe("Place at least one player to save a draft");
    expect(
      footballDraftSaveProblem(
        { bibs, slot1: ["a"], slot2: ["a"] },
        roster,
        "en",
      ),
    ).toBe("A player can be on one team only");
    expect(
      footballDraftSaveProblem(
        { bibs, slot1: ["a"], slot2: ["z"] },
        roster,
        "en",
      ),
    ).toBe("Only registered players can be placed on a team");
    expect(
      footballDraftSaveProblem(
        { bibs: { slot1: "red", slot2: "red" }, slot1: ["a"], slot2: ["b"] },
        roster,
        "en",
      ),
    ).toBe("Pick two different bib colours");
  });

  it("answers in Arabic", () => {
    expect(
      footballDraftSaveProblem({ bibs, slot1: [], slot2: [] }, roster, "ar"),
    ).toBe("ضع لاعبًا واحدًا على الأقل لحفظ مسودة");
  });
});

describe("footballDraftSummary", () => {
  it("is ready to publish once everyone is placed and the sides are even", () => {
    expect(
      footballDraftSummary(
        { bibs, slot1: ["a", "b"], slot2: ["c", "d"] },
        ["a", "b", "c", "d"],
        "en",
      ),
    ).toEqual({
      line: "Everyone is placed. Publish when you're ready.",
      canPublish: true,
    });
  });

  it("reads the players still to place and holds publishing", () => {
    expect(
      footballDraftSummary(
        { bibs, slot1: ["a"], slot2: ["c"] },
        ["a", "b", "c", "d"],
        "en",
      ),
    ).toEqual({ line: "2 still to place.", canPublish: false });
  });

  it("reads a side that is too big by its bib", () => {
    expect(
      footballDraftSummary(
        { bibs, slot1: ["a", "b", "c"], slot2: ["d"] },
        ["a", "b", "c", "d"],
        "en",
      ),
    ).toEqual({
      line: "Black has 2 extra. Move one across before publishing.",
      canPublish: false,
    });
  });
});

describe("footballDraftVisibilityLine", () => {
  it("names the group's admins on a Group Game and nobody else on a groupless Game", () => {
    expect(footballDraftVisibilityLine({ groupId: "g" }, "en")).toBe(
      "Players don't see these teams yet. Only you and the group's admins do.",
    );
    expect(footballDraftVisibilityLine({ groupId: null }, "en")).toBe(
      "Players don't see these teams yet. Only you do.",
    );
    expect(footballDraftVisibilityLine({ groupId: null }, "ar")).toBe(
      "لا يرى اللاعبون هذه الفرق بعد. لا يراها إلا أنت.",
    );
  });
});

describe("footballDraftSavedLine", () => {
  it("reads the weekday and the clock in the product timezone", () => {
    expect(
      footballDraftSavedLine(new Date("2026-10-16T14:40:00.000Z"), "en"),
    ).toBe("saved Fri 5:40 PM");
  });
});

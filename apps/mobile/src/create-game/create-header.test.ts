import { describe, expect, it } from "vitest";

import { nextStepTitle, stepHeader } from "./create-header";

const NO_GROUP = { groupName: null, venues: null };
const WITH_GROUP = {
  groupName: "Tuesday Crew",
  venues: { locked: false, count: 3 },
};

describe("stepHeader", () => {
  it("asks what is being set up on step 1 of either branch", () => {
    for (const type of [
      null,
      "friendly_game",
      "friendly_tournament",
    ] as const) {
      expect(stepHeader({ type, step: 1 }, NO_GROUP)).toEqual({
        title: ["What are you", "setting up?"],
        subtitle:
          "Both start with a Venue and a time. The rest of the form follows your pick.",
        context: null,
      });
    }
  });

  it("starts a Friendly game with the Group before one is picked", () => {
    expect(stepHeader({ type: "friendly_game", step: 2 }, NO_GROUP)).toEqual({
      title: ["Friendly", "game"],
      subtitle: "Start with the Group. Venue rules depend on it.",
      context: null,
    });
  });

  it("names the Group and its Venue count once a Group is picked", () => {
    expect(stepHeader({ type: "friendly_game", step: 2 }, WITH_GROUP)).toEqual({
      title: ["Friendly", "game"],
      subtitle: null,
      context: { icon: "users", parts: ["Tuesday Crew", "3 Venues"] },
    });
  });

  it("uses the singular for one Venue", () => {
    expect(
      stepHeader(
        { type: "friendly_game", step: 2 },
        { groupName: "Tuesday Crew", venues: { locked: false, count: 1 } },
      )?.context?.parts,
    ).toEqual(["Tuesday Crew", "1 Venue"]);
  });

  it("names the linked Venue for a locked picker", () => {
    expect(
      stepHeader(
        { type: "friendly_game", step: 2 },
        { groupName: "Karbabad Club", venues: { locked: true, count: 1 } },
      )?.context?.parts,
    ).toEqual(["Karbabad Club", "Linked Venue"]);
  });

  it("shows only the Group while its Venues load", () => {
    expect(
      stepHeader(
        { type: "friendly_game", step: 2 },
        { groupName: "Tuesday Crew", venues: null },
      )?.context?.parts,
    ).toEqual(["Tuesday Crew"]);
  });

  it("states the rating and Game team range for a Friendly tournament", () => {
    const expected = {
      title: ["Friendly", "tournament"],
      subtitle: null,
      context: {
        icon: "trophy",
        parts: ["Counts for your rating", "4 to 32 Game teams"],
      },
    };
    expect(
      stepHeader({ type: "friendly_tournament", step: 2 }, NO_GROUP),
    ).toEqual(expected);
    expect(
      stepHeader({ type: "friendly_tournament", step: 2 }, WITH_GROUP),
    ).toEqual(expected);
  });

  it("leaves steps 3 and 4 to the step summary", () => {
    expect(stepHeader({ type: "friendly_game", step: 3 }, WITH_GROUP)).toBe(
      null,
    );
    expect(
      stepHeader({ type: "friendly_tournament", step: 4 }, WITH_GROUP),
    ).toBe(null);
  });
});

describe("nextStepTitle", () => {
  it("follows the Friendly game steps", () => {
    expect(nextStepTitle("friendly_game", 1)).toBe("Where");
    expect(nextStepTitle("friendly_game", 2)).toBe("When");
    expect(nextStepTitle("friendly_game", 3)).toBe("Level and price");
  });

  it("follows the Friendly tournament steps", () => {
    expect(nextStepTitle("friendly_tournament", 1)).toBe("Where and size");
    expect(nextStepTitle("friendly_tournament", 2)).toBe("Format and day");
    expect(nextStepTitle("friendly_tournament", 3)).toBe("Entry and review");
  });

  it("previews the Friendly game steps before a type is picked", () => {
    expect(nextStepTitle(null, 1)).toBe("Where");
  });

  it("has nothing after the last step", () => {
    expect(nextStepTitle("friendly_game", 4)).toBe(null);
  });
});

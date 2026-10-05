import { describe, expect, it } from "vitest";

import {
  friendlyGameTimeHeader,
  kickoffHero,
  nextStepTitle,
  stepHeader,
} from "./create-header";

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

describe("kickoffHero", () => {
  it("splits an evening start into value and meridiem", () => {
    expect(kickoffHero("2026-10-06", "20:00", "21:30")).toEqual({
      value: "8:00",
      unit: "PM",
      trailing: "to 9:30 PM",
    });
  });

  it("reads a morning start", () => {
    expect(kickoffHero("2026-10-06", "09:30", "11:00")).toEqual({
      value: "9:30",
      unit: "AM",
      trailing: "to 11:00 AM",
    });
  });

  it("crosses noon", () => {
    expect(kickoffHero("2026-10-06", "11:00", "12:30")).toEqual({
      value: "11:00",
      unit: "AM",
      trailing: "to 12:30 PM",
    });
  });

  it("has no trailing part without a finish", () => {
    expect(kickoffHero("2026-10-06", "20:00", "")).toEqual({
      value: "8:00",
      unit: "PM",
      trailing: null,
    });
  });

  it("drops a finish that is not after the start", () => {
    expect(kickoffHero("2026-10-06", "20:00", "19:00")?.trailing).toBe(null);
  });

  it("is a placeholder before a start time or for invalid input", () => {
    expect(kickoffHero("2026-10-06", "", "21:30")).toBe(null);
    expect(kickoffHero("", "20:00", "21:30")).toBe(null);
    expect(kickoffHero("2026-02-30", "20:00", "21:30")).toBe(null);
    expect(kickoffHero("2026-10-06", "soon", "21:30")).toBe(null);
  });
});

describe("friendlyGameTimeHeader", () => {
  const base = {
    day: "2026-10-06",
    startTime: "20:00",
    finishTime: "21:30",
    groupName: "Friday Padel",
    venueName: "Seef Padel Club",
    courtName: "Court 1",
  };

  it("shows the kickoff hero with day, Venue and Court", () => {
    expect(friendlyGameTimeHeader(base)).toEqual({
      title: [],
      hero: { value: "8:00", unit: "PM", trailing: "to 9:30 PM" },
      subtitle: null,
      context: { parts: ["Tue 6 Oct 2026", "Seef Padel Club", "Court 1"] },
    });
  });

  it("asks for a time before a start is picked", () => {
    const header = friendlyGameTimeHeader({
      ...base,
      startTime: "",
      finishTime: "",
    });
    expect(header.title).toEqual(["Pick a time"]);
    expect(header.hero).toBeUndefined();
  });

  it("falls back to the Group without a Venue and skips an empty Court", () => {
    expect(
      friendlyGameTimeHeader({ ...base, venueName: null, courtName: null })
        .context?.parts,
    ).toEqual(["Tue 6 Oct 2026", "Friday Padel"]);
  });
});

import { describe, expect, it } from "vitest";

import {
  draftAnswerMark,
  draftCaptainName,
  withDraftSides,
} from "./football-draft-view";

describe("draftCaptainName", () => {
  it("reads You for the viewer, a nickname, or the short name", () => {
    expect(
      draftCaptainName({ name: "Rashid Nasser", isViewer: true }, "You"),
    ).toBe("You");
    expect(
      draftCaptainName(
        {
          name: "Rashid Nasser",
          isViewer: false,
          nickname: { name: "Rash", visibility: "group" },
        },
        "You",
      ),
    ).toBe("Rash");
    expect(
      draftCaptainName({ name: "Rashid Nasser", isViewer: false }, "You"),
    ).toBe("Rashid N");
  });

  it("is null without a captain", () => {
    expect(draftCaptainName(undefined, "You")).toBeNull();
  });
});

describe("withDraftSides", () => {
  it("places each player on their draft side, or on none", () => {
    expect(
      withDraftSides([{ userId: "a" }, { userId: "b" }, { userId: "c" }], {
        slot1: ["a"],
        slot2: ["c"],
      }),
    ).toEqual([
      { userId: "a", sideIndex: 1 },
      { userId: "b", sideIndex: null },
      { userId: "c", sideIndex: 2 },
    ]);
  });
});

describe("draftAnswerMark", () => {
  it("draws Approved solid, Change asked outlined and Waiting hatched", () => {
    expect(draftAnswerMark("approved")).toBe("won");
    expect(draftAnswerMark("change_asked")).toBe("lost");
    expect(draftAnswerMark("waiting")).toBe("hatch");
    expect(draftAnswerMark("none")).toBeNull();
  });
});

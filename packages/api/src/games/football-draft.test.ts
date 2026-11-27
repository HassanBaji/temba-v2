import { describe, expect, it } from "vitest";

import { captainAnswerState } from "#src/games/football-draft";

describe("captainAnswerState", () => {
  const side = ["p1", "p2", "p3"];
  const captain = { isOrganizer: false };

  it("has nobody to ask without a captain or with an Organizer as captain", () => {
    const approved = { answer: "approved" as const, answeredPlayerIds: side };
    expect(captainAnswerState(approved, side, null)).toBe("none");
    expect(captainAnswerState(approved, side, { isOrganizer: true })).toBe(
      "none",
    );
  });

  it("waits for a captain with no answer", () => {
    expect(captainAnswerState(null, side, captain)).toBe("waiting");
  });

  it("reads the answer for the side as it stands, in any order", () => {
    expect(
      captainAnswerState(
        { answer: "approved", answeredPlayerIds: ["p3", "p1", "p2"] },
        side,
        captain,
      ),
    ).toBe("approved");
    expect(
      captainAnswerState(
        { answer: "change_asked", answeredPlayerIds: side },
        side,
        captain,
      ),
    ).toBe("change_asked");
  });

  it("waits again once the side's players differ from the answer's", () => {
    expect(
      captainAnswerState(
        { answer: "approved", answeredPlayerIds: ["p1", "p2"] },
        side,
        captain,
      ),
    ).toBe("waiting");
    expect(
      captainAnswerState(
        { answer: "approved", answeredPlayerIds: [...side, "p4"] },
        side,
        captain,
      ),
    ).toBe("waiting");
    expect(
      captainAnswerState(
        { answer: "change_asked", answeredPlayerIds: ["p1", "p2", "p9"] },
        side,
        captain,
      ),
    ).toBe("waiting");
  });
});

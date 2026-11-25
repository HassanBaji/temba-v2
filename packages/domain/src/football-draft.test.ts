import { describe, expect, it } from "vitest";

import { NO_SIDE_CAPTAINS } from "./football-board";
import {
  footballDraftCaptainViewLine,
  footballDraftSavedLine,
  footballDraftSaveProblem,
  footballDraftSummary,
  footballDraftVisibilityLine,
  footballSideCaptainProblem,
  type FootballDraftAnswerState,
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
  const nobodyToAsk = {
    slot1: { state: "none" },
    slot2: { state: "none" },
  } as const;
  const noCaptains = { captains: NO_SIDE_CAPTAINS, answers: nobodyToAsk };

  it("is ready to publish once everyone is placed and the sides are even", () => {
    expect(
      footballDraftSummary(
        {
          bibs,
          slot1: ["a", "b"],
          slot2: ["c", "d"],
          captains: { slot1: "a", slot2: "c" },
          answers: nobodyToAsk,
        },
        ["a", "b", "c", "d"],
        { groupId: null },
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
        { bibs, slot1: ["a"], slot2: ["c"], ...noCaptains },
        ["a", "b", "c", "d"],
        { groupId: null },
        "en",
      ),
    ).toEqual({ line: "2 still to place.", canPublish: false });
  });

  it("reads a side that is too big by its bib", () => {
    expect(
      footballDraftSummary(
        { bibs, slot1: ["a", "b", "c"], slot2: ["d"], ...noCaptains },
        ["a", "b", "c", "d"],
        { groupId: null },
        "en",
      ),
    ).toEqual({
      line: "Black has 2 extra. Move one across before publishing.",
      canPublish: false,
    });
  });
});

describe("footballDraftSummary with Side captains", () => {
  const roster = ["a", "b", "c", "d"];
  const sides = { bibs, slot1: ["a", "b"], slot2: ["c", "d"] };

  function line(
    captains: { slot1: string | null; slot2: string | null },
    slot1: FootballDraftAnswerState,
    slot2: FootballDraftAnswerState,
    groupId: string | null = "g",
    locale: "en" | "ar" = "en",
  ) {
    return footballDraftSummary(
      {
        ...sides,
        captains,
        answers: { slot1: { state: slot1 }, slot2: { state: slot2 } },
      },
      roster,
      { groupId },
      locale,
    ).line;
  }

  it("says who can see a draft with no captains picked", () => {
    const none = { slot1: null, slot2: null };
    expect(line(none, "none", "none")).toBe(
      "No captains picked, so only you and the group's admins can see this draft.",
    );
    expect(line(none, "none", "none", null)).toBe(
      "No captains picked, so only you can see this draft.",
    );
  });

  it("counts the captains who have approved, and never holds publishing", () => {
    const both = { slot1: "a", slot2: "c" };
    expect(line(both, "approved", "waiting")).toBe(
      "1 of 2 captains have approved. You can publish without waiting.",
    );
    expect(line(both, "change_asked", "waiting")).toBe(
      "0 of 2 captains have approved. You can publish without waiting.",
    );
    expect(line({ slot1: "a", slot2: null }, "waiting", "none")).toBe(
      "0 of 1 captain has approved. You can publish without waiting.",
    );
    expect(line(both, "approved", "waiting", "g", "ar")).toBe(
      "وافق 1 من قائدَين. يمكنك النشر دون انتظار.",
    );
    expect(
      footballDraftSummary(
        {
          ...sides,
          captains: both,
          answers: {
            slot1: { state: "waiting" },
            slot2: { state: "waiting" },
          },
        },
        roster,
        { groupId: null },
        "en",
      ).canPublish,
    ).toBe(true);
  });

  it("reads one captain and both captains approved", () => {
    expect(line({ slot1: "a", slot2: null }, "approved", "none")).toBe(
      "The captain approved their team. Publish when you're ready.",
    );
    expect(line({ slot1: "a", slot2: "c" }, "approved", "approved")).toBe(
      "Both captains approved their team. Publish when you're ready.",
    );
  });

  it("reads ready when the only captains are Organizers, with nobody to ask", () => {
    expect(line({ slot1: "a", slot2: null }, "none", "none")).toBe(
      "Everyone is placed. Publish when you're ready.",
    );
  });

  it("still reads the players to place first", () => {
    expect(
      footballDraftSummary(
        {
          bibs,
          slot1: ["a"],
          slot2: ["c"],
          captains: { slot1: "a", slot2: "c" },
          answers: {
            slot1: { state: "approved" },
            slot2: { state: "approved" },
          },
        },
        roster,
        { groupId: null },
        "en",
      ),
    ).toEqual({ line: "2 still to place.", canPublish: false });
  });
});

describe("footballSideCaptainProblem", () => {
  const sides = { slot1: ["a", "b"], slot2: ["c", "g"] };
  const accounts = ["a", "b", "c"];

  it("takes one captain per side from that side, or none", () => {
    expect(
      footballSideCaptainProblem(
        { slot1: "a", slot2: "c" },
        sides,
        accounts,
        "en",
      ),
    ).toBeNull();
    expect(
      footballSideCaptainProblem(
        { slot1: null, slot2: null },
        sides,
        accounts,
        "en",
      ),
    ).toBeNull();
  });

  it("refuses a captain from the other side or on no side", () => {
    expect(
      footballSideCaptainProblem(
        { slot1: "c", slot2: null },
        sides,
        accounts,
        "en",
      ),
    ).toBe("A captain must be a player on their team");
    expect(
      footballSideCaptainProblem(
        { slot1: null, slot2: "z" },
        sides,
        accounts,
        "en",
      ),
    ).toBe("A captain must be a player on their team");
  });

  it("refuses a Guest player or an Unclaimed player", () => {
    expect(
      footballSideCaptainProblem(
        { slot1: null, slot2: "g" },
        sides,
        accounts,
        "en",
      ),
    ).toBe("A guest player or a player without an account can't be a captain");
  });
});

describe("footballDraftCaptainViewLine", () => {
  it("names who saved the draft and who else sees it", () => {
    const draft = {
      savedByName: "Hassan Haji",
      captains: { slot1: "a", slot2: "c" },
    };
    expect(footballDraftCaptainViewLine(draft, { groupId: "g" }, "en")).toBe(
      "A draft from Hassan H. Only the two captains and the organizers can see it.",
    );
    expect(
      footballDraftCaptainViewLine(
        { ...draft, captains: { slot1: "a", slot2: null } },
        { groupId: null },
        "en",
      ),
    ).toBe("A draft from Hassan H. Only you and the organizer can see it.");
  });
});

describe("footballDraftVisibilityLine", () => {
  it("adds the captains when any is named", () => {
    expect(footballDraftVisibilityLine({ groupId: "g" }, true, "en")).toBe(
      "Players don't see these teams yet. Only you, the group's admins and the captains do.",
    );
    expect(footballDraftVisibilityLine({ groupId: null }, true, "en")).toBe(
      "Players don't see these teams yet. Only you and the captains do.",
    );
  });

  it("names the group's admins on a Group Game and nobody else on a groupless Game", () => {
    expect(footballDraftVisibilityLine({ groupId: "g" }, false, "en")).toBe(
      "Players don't see these teams yet. Only you and the group's admins do.",
    );
    expect(footballDraftVisibilityLine({ groupId: null }, false, "en")).toBe(
      "Players don't see these teams yet. Only you do.",
    );
    expect(footballDraftVisibilityLine({ groupId: null }, false, "ar")).toBe(
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

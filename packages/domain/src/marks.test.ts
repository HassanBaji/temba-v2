import { describe, expect, it } from "vitest";

import { bahrainDate } from "./bahrain-date.test-support";
import {
  GIVER_GROUPS,
  MARK_KINDS,
  MARK_META,
  MARK_REFUSALS,
  MARKS_PER_GAME,
  canGiveMark,
  formatMarksClose,
  givableKinds,
  giverGroupLabel,
  isMarkKind,
  isMarkRefusal,
  markDescription,
  markName,
  markRefusedCopy,
  markRelation,
  marksClosedCopy,
  marksClosesCopy,
  marksWindow,
  mvpWindow,
  remainingMarks,
  type GivenMark,
  type MarkKind,
  type MarkParticipant,
  type MarksWindow,
} from "./marks";

const HOUR = 60 * 60 * 1000;
const COMPLETED_AT = new Date("2026-11-04T16:00:00.000Z");

describe("marksWindow", () => {
  it("has no window before the Match completes", () => {
    expect(marksWindow(null, COMPLETED_AT)).toBeNull();
  });

  it("is open from the completion until 48 hours later, then closed", () => {
    const closesAt = new Date(COMPLETED_AT.getTime() + 48 * HOUR);
    expect(marksWindow(COMPLETED_AT, COMPLETED_AT)).toEqual({
      state: "open",
      opensAt: COMPLETED_AT,
      closesAt,
    });
    expect(
      marksWindow(COMPLETED_AT, new Date(closesAt.getTime() - 1))?.state,
    ).toBe("open");
    expect(marksWindow(COMPLETED_AT, closesAt)).toEqual({
      state: "closed",
      opensAt: COMPLETED_AT,
      closesAt,
    });
  });
});

describe("mvpWindow", () => {
  const ratingCloses = new Date(COMPLETED_AT.getTime() + 24 * HOUR);
  const ratingWindow = { closesAt: ratingCloses, settledAt: null };

  it("closes with the Rating window on a Match that has one", () => {
    expect(mvpWindow(COMPLETED_AT, COMPLETED_AT, ratingWindow)).toEqual({
      state: "open",
      opensAt: COMPLETED_AT,
      closesAt: ratingCloses,
    });
    expect(
      mvpWindow(
        COMPLETED_AT,
        new Date(ratingCloses.getTime() - 1),
        ratingWindow,
      )?.state,
    ).toBe("open");
    expect(mvpWindow(COMPLETED_AT, ratingCloses, ratingWindow)?.state).toBe(
      "closed",
    );
  });

  it("closes when the Rating window settled early, as the rating Organizer submitted", () => {
    const settledAt = new Date(COMPLETED_AT.getTime() + 2 * HOUR);
    expect(
      mvpWindow(COMPLETED_AT, settledAt, { ...ratingWindow, settledAt }),
    ).toEqual({ state: "closed", opensAt: COMPLETED_AT, closesAt: settledAt });
  });

  it("keeps the Rating window's close when it settled late", () => {
    const settledAt = new Date(ratingCloses.getTime() + HOUR);
    expect(
      mvpWindow(COMPLETED_AT, settledAt, { ...ratingWindow, settledAt })
        ?.closesAt,
    ).toEqual(ratingCloses);
  });

  it("is the Marks window on a Match with no Rating window", () => {
    expect(mvpWindow(COMPLETED_AT, COMPLETED_AT, null)).toEqual(
      marksWindow(COMPLETED_AT, COMPLETED_AT),
    );
    expect(mvpWindow(null, COMPLETED_AT, ratingWindow)).toBeNull();
  });
});

describe("markRelation", () => {
  it("reads the same Game team as teammates and the other as opponents", () => {
    expect(markRelation(1, 1)).toBe("teammate");
    expect(markRelation(2, 2)).toBe("teammate");
    expect(markRelation(1, 2)).toBe("opponent");
    expect(markRelation(2, 1)).toBe("opponent");
  });
});

describe("givableKinds", () => {
  it.each([
    [
      "padel",
      "teammate",
      [
        "dynamo",
        "let_him_cook",
        "mr_fumble",
        "sayed_malek",
        "clutch",
        "mr_ice",
        "smash_machine",
      ],
    ],
    [
      "padel",
      "opponent",
      [
        "clutch",
        "mr_ice",
        "smash_machine",
        "great_wall",
        "comeback_king",
        "underdog",
        "good_game",
      ],
    ],
    [
      "football",
      "teammate",
      [
        "dynamo",
        "let_him_cook",
        "mr_fumble",
        "sayed_malek",
        "clutch",
        "mr_ice",
        "goal_machine",
      ],
    ],
    [
      "football",
      "opponent",
      [
        "clutch",
        "mr_ice",
        "goal_machine",
        "great_wall",
        "comeback_king",
        "underdog",
        "good_game",
      ],
    ],
  ] as const)("%s to a %s", (sport, relation, expected) => {
    expect(givableKinds({ sport, relation })).toEqual(expected);
  });
});

describe("MARK_META", () => {
  it("gives every kind a group, and only Mr Fumble and Sayed Malek are roasts", () => {
    expect(Object.keys(MARK_META).sort()).toEqual([...MARK_KINDS].sort());
    for (const kind of MARK_KINDS) {
      expect(GIVER_GROUPS).toContain(MARK_META[kind].group);
    }
    expect(MARK_KINDS.filter((kind) => MARK_META[kind].roast)).toEqual([
      "mr_fumble",
      "sayed_malek",
    ]);
  });

  it("keeps four kinds in each giver group", () => {
    for (const group of GIVER_GROUPS) {
      expect(
        MARK_KINDS.filter((kind) => MARK_META[kind].group === group),
      ).toHaveLength(4);
    }
  });
});

describe("isMarkKind and isMarkRefusal", () => {
  it("accepts only the known values", () => {
    expect(isMarkKind("dynamo")).toBe(true);
    expect(isMarkKind("mvp")).toBe(false);
    expect(isMarkRefusal("cap_reached")).toBe(true);
    expect(isMarkRefusal("Game not found")).toBe(false);
  });
});

describe("remainingMarks", () => {
  it("counts down from three and never below zero", () => {
    expect(remainingMarks([])).toBe(MARKS_PER_GAME);
    expect(remainingMarks([1, 2])).toBe(1);
    expect(remainingMarks([1, 2, 3, 4])).toBe(0);
  });
});

describe("canGiveMark", () => {
  const open: MarksWindow = {
    state: "open",
    opensAt: COMPLETED_AT,
    closesAt: new Date(COMPLETED_AT.getTime() + 48 * HOUR),
  };
  const participants: MarkParticipant[] = [
    { userId: "a", slot: 1, isUnclaimed: false },
    { userId: "b", slot: 1, isUnclaimed: false },
    { userId: "c", slot: 2, isUnclaimed: false },
    { userId: "d", slot: 2, isUnclaimed: true },
  ];

  function check(
    overrides: Partial<{
      giverUserId: string;
      receiverUserId: string;
      kind: MarkKind;
      window: MarksWindow | null;
      given: GivenMark[];
    }> = {},
  ) {
    return canGiveMark({
      giverUserId: "a",
      receiverUserId: "b",
      kind: "dynamo",
      sport: "padel",
      window: open,
      participants,
      given: [],
      ...overrides,
    });
  }

  it("lets a seated account holder give a teammate mark to a teammate", () => {
    expect(check()).toEqual({ ok: true });
  });

  it("lets anyone receive, an Unclaimed player included", () => {
    expect(check({ receiverUserId: "d", kind: "good_game" })).toEqual({
      ok: true,
    });
  });

  it("refuses a self-mark", () => {
    expect(check({ receiverUserId: "a" })).toEqual({
      ok: false,
      reason: "self",
    });
  });

  it("refuses a giver or receiver who is not on the Match, and an Unclaimed giver", () => {
    expect(check({ giverUserId: "outsider" })).toEqual({
      ok: false,
      reason: "not_participant",
    });
    expect(check({ receiverUserId: "outsider" })).toEqual({
      ok: false,
      reason: "not_participant",
    });
    expect(check({ giverUserId: "d", receiverUserId: "c" })).toEqual({
      ok: false,
      reason: "not_participant",
    });
  });

  it("refuses before completion and after the window closes", () => {
    expect(check({ window: null })).toEqual({
      ok: false,
      reason: "window_closed",
    });
    expect(check({ window: { ...open, state: "closed" } })).toEqual({
      ok: false,
      reason: "window_closed",
    });
  });

  it("refuses a second mark to the same receiver", () => {
    expect(
      check({
        kind: "clutch",
        given: [{ receiverUserId: "b", kind: "dynamo" }],
      }),
    ).toEqual({ ok: false, reason: "already_marked_receiver" });
  });

  it("refuses a fourth mark, to a new receiver or an already-marked one", () => {
    const given: GivenMark[] = [
      { receiverUserId: "b", kind: "clutch" },
      { receiverUserId: "c", kind: "good_game" },
      { receiverUserId: "d", kind: "underdog" },
    ];
    expect(check({ given, receiverUserId: "b" })).toEqual({
      ok: false,
      reason: "cap_reached",
    });
    expect(check({ given: given.slice(1), receiverUserId: "b" })).toEqual({
      ok: true,
    });
  });

  it("refuses a kind of the wrong sport or the wrong giver group", () => {
    expect(check({ kind: "goal_machine" })).toEqual({
      ok: false,
      reason: "kind_not_allowed",
    });
    expect(check({ kind: "great_wall" })).toEqual({
      ok: false,
      reason: "kind_not_allowed",
    });
    expect(check({ receiverUserId: "c", kind: "dynamo" })).toEqual({
      ok: false,
      reason: "kind_not_allowed",
    });
  });
});

describe("marks copy", () => {
  it("names and describes every kind in both Locales", () => {
    for (const kind of MARK_KINDS) {
      for (const locale of ["en", "ar"] as const) {
        expect(markName(kind, locale).trim()).not.toBe("");
        expect(markDescription(kind, locale).trim()).not.toBe("");
      }
    }
    expect(markName("great_wall", "en")).toBe("The Great Wall");
    expect(markName("great_wall", "ar")).toBe("سور الصين");
    expect(markDescription("clutch", "en")).toBe(
      "Won the points that mattered.",
    );
  });

  it("labels the giver groups", () => {
    expect(giverGroupLabel("teammate", "en")).toBe(
      "From your teammate or partner",
    );
    expect(giverGroupLabel("opponent", "ar")).toBe("من الفريق الآخر");
  });

  it("writes the close on the product clock", () => {
    const closesAt = bahrainDate(2026, 10, 6, 19, 0);
    expect(formatMarksClose(closesAt, "en")).toBe("Fri 7:00 PM");
    expect(marksClosesCopy(closesAt, "en")).toBe("closes Fri 7:00 PM");
    expect(marksClosedCopy(closesAt, "en")).toBe("Closed Fri 7:00 PM");
    expect(marksClosesCopy(closesAt, "ar")).toBe("يُغلق الجمعة 7:00 م");
  });

  it("explains every refusal in both Locales", () => {
    for (const reason of MARK_REFUSALS) {
      for (const locale of ["en", "ar"] as const) {
        expect(markRefusedCopy(reason, locale).trim()).not.toBe("");
      }
    }
    expect(markRefusedCopy("cap_reached", "en")).toBe(
      "You’ve given all your marks for this game.",
    );
  });
});

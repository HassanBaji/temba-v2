import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { scoreConfirmationRows } from "./friendly-game-score";
import {
  scoreChangeNote,
  scoreChangedSetNumbers,
  scoreEntryLine,
  scoreInReview,
  scoreResultLine,
  scoreReviewBar,
  scoreReviewBoxState,
  scoreReviewView,
  type ScoreEntry,
} from "./score-review";

const set = (slot1GamesWon: number | null, slot2GamesWon: number | null) => ({
  slot1GamesWon,
  slot2GamesWon,
});

const ENTERED = [set(7, 6), set(0, 6), set(7, 5)];
const CORRECTED = [set(7, 6), set(3, 6), set(7, 5)];

const sides = [
  {
    sideIndex: 1,
    gameTeamId: "team-a",
    left: { userId: "layla", name: "Layla Haddad" },
    right: { userId: "rashed", name: "Rashed Kanoo" },
  },
  {
    sideIndex: 2,
    gameTeamId: "team-b",
    left: { userId: "hassan", name: "Hassan Haji" },
    right: { userId: "khalid", name: "Khalid Janahi" },
  },
];

const enteredByLayla: ScoreEntry = {
  enteredByUserId: "layla",
  enteredByName: "Layla Haddad",
  enteredAt: "2026-11-26T18:42:00.000Z",
  change: null,
};

const changedByHassan: ScoreEntry = {
  enteredByUserId: "hassan",
  enteredByName: "Hassan Haji",
  enteredAt: "2026-11-26T18:51:00.000Z",
  change: { reason: "set_score_wrong", previousSets: ENTERED },
};

const barInput = {
  editing: false,
  changedSetNumbers: [],
  draftValid: true,
  canConfirm: true,
  confirmIsFinal: false,
  canEdit: true,
  viewerUserId: "hassan",
  viewerSlot: 2 as const,
  entry: enteredByLayla,
  sets: ENTERED,
};

describe("scoreInReview", () => {
  it("is a score that is in and not yet final", () => {
    assert.equal(
      scoreInReview({ phase: "needs_results", hasResult: true }),
      true,
    );
    assert.equal(scoreInReview({ phase: "ongoing", hasResult: true }), true);
    assert.equal(
      scoreInReview({ phase: "needs_results", hasResult: false }),
      false,
    );
    assert.equal(scoreInReview({ phase: "final", hasResult: true }), false);
  });
});

describe("scoreReviewBoxState", () => {
  it("is solid for the side that won the Set, outline for the other, hatched when not played", () => {
    const state = (games: ReturnType<typeof set>, sideIndex: number) =>
      scoreReviewBoxState({ set: games, sideIndex, editing: false });
    assert.equal(state(set(7, 6), 1), "solid");
    assert.equal(state(set(7, 6), 2), "outline");
    assert.equal(state(set(0, 6), 2), "solid");
    assert.equal(state(set(null, null), 1), "unplayed");
    assert.equal(state(set(6, 6), 1), "readonly");
  });

  it("opens every box while the score is being changed", () => {
    assert.equal(
      scoreReviewBoxState({
        set: set(null, null),
        sideIndex: 1,
        editing: true,
      }),
      "enterable",
    );
  });
});

describe("scoreChangedSetNumbers", () => {
  it("names the Sets whose games differ", () => {
    assert.deepEqual(scoreChangedSetNumbers(ENTERED, ENTERED), []);
    assert.deepEqual(scoreChangedSetNumbers(ENTERED, CORRECTED), [2]);
    assert.deepEqual(
      scoreChangedSetNumbers([set(6, 2)], [set(2, 6), set(6, 3)]),
      [1, 2],
    );
  });
});

describe("the lines under the boxes", () => {
  it("says who won in Sets, or that they are level", () => {
    assert.equal(
      scoreResultLine(ENTERED, sides, "en"),
      "Layla & Rashed won 2–1.",
    );
    assert.equal(
      scoreResultLine([set(7, 6), set(0, 6)], sides, "en"),
      "Level at 1–1 in sets.",
    );
    assert.equal(scoreResultLine([set(null, null)], sides, "en"), null);
  });

  it("says who entered or changed the score, in product time", () => {
    const line = (entry: ScoreEntry, viewerUserId: string, editing = false) =>
      scoreEntryLine({ entry, viewerUserId, editing }, "en");
    assert.equal(
      line(enteredByLayla, "hassan"),
      "Entered by Layla Haddad at 9:42 PM.",
    );
    assert.equal(line(enteredByLayla, "layla"), "Entered by you at 9:42 PM.");
    assert.equal(
      line(changedByHassan, "layla"),
      "Changed by Hassan Haji at 9:51 PM.",
    );
    assert.equal(
      line(enteredByLayla, "hassan", true),
      "You are changing the score Layla entered.",
    );
    assert.equal(
      scoreEntryLine({ entry: null, viewerUserId: "x", editing: false }, "en"),
      null,
    );
  });

  it("notes the one Set a change moved, and the reason given", () => {
    assert.deepEqual(
      scoreChangeNote(
        { entry: changedByHassan, viewerUserId: "layla", sets: CORRECTED },
        "en",
      ),
      {
        title: "Hassan changed set 2 from 0–6 to 3–6",
        subline:
          "Reason given: a set score is wrong. The other side is asked to confirm the new score.",
      },
    );
  });

  it("notes the whole score when more than one Set moved, or a Set was added", () => {
    const swapped = [set(6, 7), set(6, 0), set(7, 5)];
    assert.equal(
      scoreChangeNote(
        {
          entry: {
            ...changedByHassan,
            change: { reason: null, previousSets: ENTERED },
          },
          viewerUserId: "hassan",
          sets: swapped,
        },
        "en",
      )?.title,
      "You changed it from 7–6, 0–6, 7–5 to 6–7, 6–0, 7–5",
    );
    const added = scoreChangeNote(
      {
        entry: {
          ...changedByHassan,
          change: { reason: null, previousSets: [set(6, 2), set(null, null)] },
        },
        viewerUserId: "layla",
        sets: [set(6, 2), set(3, 6)],
      },
      "en",
    );
    assert.equal(added?.title, "Hassan changed it from 6–2 to 6–2, 3–6");
    assert.equal(
      added?.subline,
      "The other side is asked to confirm the new score.",
    );
  });

  it("has no note for a score that was only entered", () => {
    assert.equal(
      scoreChangeNote(
        { entry: enteredByLayla, viewerUserId: "hassan", sets: ENTERED },
        "en",
      ),
      null,
    );
  });
});

describe("scoreReviewBar", () => {
  it("gives the side that has yet to confirm two actions: dispute and edit, or confirm", () => {
    assert.deepEqual(scoreReviewBar(barInput, "en"), {
      title: "Layla entered the score",
      subline: "Your team lost 1–2. Confirm it, or change it if it is wrong.",
      actions: [
        {
          kind: "edit",
          label: "Dispute and edit",
          primary: false,
          enabled: true,
        },
        {
          kind: "confirm",
          label: "Confirm score",
          primary: true,
          enabled: true,
        },
      ],
    });
  });

  it("asks the others again after a change, saying whether their result still holds", () => {
    const bar = scoreReviewBar(
      {
        ...barInput,
        viewerUserId: "layla",
        viewerSlot: 1,
        entry: changedByHassan,
        sets: CORRECTED,
      },
      "en",
    );
    assert.equal(bar?.title, "Hassan changed the score");
    assert.equal(
      bar?.subline,
      "Your team still won 2–1. Confirm the new score, or change it back.",
    );
  });

  it("lets whoever entered it wait and edit, never confirm their own entry", () => {
    assert.deepEqual(
      scoreReviewBar(
        {
          ...barInput,
          viewerUserId: "layla",
          viewerSlot: 1,
          canConfirm: false,
        },
        "en",
      ),
      {
        title: "You entered this score",
        subline: "Counts once the other side confirms",
        actions: [
          { kind: "edit", label: "Edit score", primary: false, enabled: true },
        ],
      },
    );
  });

  it("tells an Organizer their confirmation is final", () => {
    const bar = scoreReviewBar(
      {
        ...barInput,
        viewerUserId: "organizer",
        viewerSlot: null,
        confirmIsFinal: true,
      },
      "en",
    );
    assert.equal(
      bar?.subline,
      "As the Organizer, your confirmation makes the score final.",
    );
    assert.deepEqual(
      bar?.actions.map((action) => action.kind),
      ["edit", "confirm"],
    );
  });

  it("sends a change only once something differs and the boxes are valid", () => {
    const editing = { ...barInput, editing: true };
    const idle = scoreReviewBar(editing, "en");
    assert.equal(idle?.title, "Change the score");
    assert.equal(idle?.subline, "Nothing changed yet. Change a box above.");
    assert.deepEqual(
      idle?.actions.map((action) => [action.kind, action.enabled]),
      [
        ["cancel", true],
        ["send", false],
      ],
    );
    const changed = scoreReviewBar(
      { ...editing, changedSetNumbers: [2] },
      "en",
    );
    assert.equal(
      changed?.subline,
      "Set 2 changed. The other side will be asked to confirm.",
    );
    assert.equal(changed?.actions[1]?.enabled, true);
    assert.equal(
      scoreReviewBar({ ...editing, changedSetNumbers: [1, 2] }, "en")?.subline,
      "2 sets changed. The other side will be asked to confirm.",
    );
    assert.equal(
      scoreReviewBar(
        { ...editing, changedSetNumbers: [2], draftValid: false },
        "en",
      )?.actions[1]?.enabled,
      false,
    );
  });

  it("is absent for a viewer who can neither confirm nor edit", () => {
    assert.equal(
      scoreReviewBar({ ...barInput, canConfirm: false, canEdit: false }, "en"),
      null,
    );
  });
});

describe("scoreReviewView", () => {
  const match = {
    sets: ENTERED,
    outcome: { result: "slot1" },
    canScoreSets: true,
    slot1GameTeamId: "team-a",
    slot2GameTeamId: "team-b",
  };
  const confirmation = {
    confirmedUserIds: ["layla"],
    requiredUserIds: ["layla", "rashed", "hassan", "khalid"],
    viewerHasConfirmed: false,
    sideConfirmedUserIds: ["layla", "rashed"],
    scoreEntry: enteredByLayla,
  };
  const input = {
    phase: "needs_results" as const,
    match,
    confirmation,
    viewerUserId: "hassan",
    viewerGameTeamId: "team-b",
    draftSets: null,
    draftValid: true,
  };

  it("offers Confirm to the other side and only Edit to the entering side", () => {
    const other = scoreReviewView(input, "en");
    assert.equal(other.active, true);
    assert.deepEqual(
      other.bar?.actions.map((action) => action.kind),
      ["edit", "confirm"],
    );
    const partner = scoreReviewView(
      { ...input, viewerUserId: "rashed", viewerGameTeamId: "team-a" },
      "en",
    );
    assert.equal(partner.bar?.title, "Layla entered the score");
    assert.deepEqual(
      partner.bar?.actions.map((action) => action.label),
      ["Edit score"],
    );
  });

  it("tracks what an unsent change differs in", () => {
    const view = scoreReviewView({ ...input, draftSets: CORRECTED }, "en");
    assert.deepEqual(view.changedSetNumbers, [2]);
    assert.equal(view.bar?.title, "Change the score");
  });

  it("is inactive before a score is in and once the Match is final", () => {
    assert.equal(
      scoreReviewView(
        { ...input, match: { ...match, outcome: { result: "none" } } },
        "en",
      ).active,
      false,
    );
    assert.equal(scoreReviewView({ ...input, phase: "final" }, "en").bar, null);
  });
});

describe("confirmation rows with a score entry", () => {
  const names = new Map(
    sides.flatMap((side) => [
      [side.left.userId, side.left.name] as const,
      [side.right.userId, side.right.name] as const,
    ]),
  );
  const rows = (
    confirmation: Parameters<typeof scoreConfirmationRows>[0],
    viewerUserId: string,
  ) =>
    scoreConfirmationRows(confirmation, viewerUserId, names, "en").map(
      (row) => [row.label, row.status, row.confirmed],
    );

  it("marks who entered it, their partner, the viewer's turn and who waits", () => {
    assert.deepEqual(
      rows(
        {
          confirmedUserIds: ["layla"],
          requiredUserIds: ["layla", "rashed", "hassan", "khalid"],
          viewerHasConfirmed: false,
          sideConfirmedUserIds: ["layla", "rashed"],
          scoreEntry: enteredByLayla,
        },
        "hassan",
      ),
      [
        ["Layla Haddad", "Entered it", true],
        ["Rashed Kanoo", "Partner confirmed", false],
        ["Hassan Haji (You)", "Your turn", true],
        ["Khalid Janahi", "Waiting", false],
      ],
    );
  });

  it("asks the other side again after a change", () => {
    assert.deepEqual(
      rows(
        {
          confirmedUserIds: ["hassan"],
          requiredUserIds: ["layla", "rashed", "hassan", "khalid"],
          viewerHasConfirmed: false,
          sideConfirmedUserIds: ["hassan", "khalid"],
          scoreEntry: changedByHassan,
        },
        "layla",
      ),
      [
        ["Layla Haddad (You)", "Your turn", true],
        ["Rashed Kanoo", "Asked again", false],
        ["Hassan Haji", "Changed it", true],
        ["Khalid Janahi", "Partner confirmed", false],
      ],
    );
  });
});

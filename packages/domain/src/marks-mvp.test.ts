import { describe, expect, it } from "vitest";

import { bahrainDate } from "./bahrain-date.test-support";
import {
  MVP_MODES,
  MVP_REFUSALS,
  canCastMvpVote,
  canPickMvp,
  countedMvpVotes,
  gameMvpView,
  isMvpMode,
  isMvpRefusal,
  marksWindow,
  mvpDecidedByCopy,
  mvpEligibleVoterIds,
  mvpModeCopy,
  mvpName,
  mvpOutcome,
  mvpRefusedCopy,
  mvpTally,
  voteProgressCopy,
  type MarkParticipant,
  type MvpQuestion,
  type MvpVote,
} from "./marks";

const HOUR = 60 * 60 * 1000;
const COMPLETED_AT = new Date("2026-11-04T16:00:00.000Z");
const OPEN = marksWindow(COMPLETED_AT, new Date(COMPLETED_AT.getTime() + HOUR));
const CLOSED = marksWindow(
  COMPLETED_AT,
  new Date(COMPLETED_AT.getTime() + 49 * HOUR),
);

const PARTICIPANTS: MarkParticipant[] = [
  { userId: "a", slot: 1, isUnclaimed: false },
  { userId: "b", slot: 1, isUnclaimed: false },
  { userId: "c", slot: 2, isUnclaimed: false },
  { userId: "d", slot: 2, isUnclaimed: true },
];

function votes(...pairs: [string, string][]): MvpVote[] {
  return pairs.map(([voterUserId, candidateUserId]) => ({
    voterUserId,
    candidateUserId,
  }));
}

function question(overrides: Partial<MvpQuestion> = {}): MvpQuestion {
  return {
    mode: "vote",
    window: OPEN,
    participants: PARTICIPANTS,
    votes: [],
    pick: null,
    ...overrides,
  };
}

describe("MVP voters and votes", () => {
  it("lets every participant with an account vote, never an Unclaimed player", () => {
    expect(mvpEligibleVoterIds(PARTICIPANTS)).toEqual(["a", "b", "c"]);
  });

  it("counts only votes from an eligible voter for another participant", () => {
    expect(
      countedMvpVotes(
        votes(["a", "d"], ["d", "a"], ["b", "x"], ["x", "a"], ["c", "c"]),
        PARTICIPANTS,
      ),
    ).toEqual(votes(["a", "d"]));
  });

  it("tallies most votes first and names every leader", () => {
    expect(mvpTally(votes(["a", "c"], ["b", "c"], ["c", "a"]))).toEqual({
      cast: 3,
      counts: [
        { userId: "c", votes: 2 },
        { userId: "a", votes: 1 },
      ],
      leaders: ["c"],
    });
    expect(mvpTally(votes(["a", "c"], ["c", "a"])).leaders).toEqual(["a", "c"]);
    expect(mvpTally([])).toEqual({ cast: 0, counts: [], leaders: [] });
  });
});

describe("mvpOutcome", () => {
  it("has no MVP in none mode", () => {
    expect(mvpOutcome(question({ mode: "none" }))).toMatchObject({
      state: "none",
      userId: null,
      final: true,
    });
  });

  it("is pending before the Match completes", () => {
    expect(mvpOutcome(question({ window: null }))).toMatchObject({
      state: "pending",
      final: false,
    });
  });

  it("stays pending while the vote is open and not everyone has voted", () => {
    expect(
      mvpOutcome(question({ votes: votes(["a", "c"], ["b", "c"]) })),
    ).toMatchObject({ state: "pending", userId: null, final: false });
  });

  it("decides at once when everyone eligible has voted for one leader", () => {
    expect(
      mvpOutcome(
        question({ votes: votes(["a", "c"], ["b", "c"], ["c", "a"]) }),
      ),
    ).toEqual({
      state: "decided",
      userId: "c",
      decidedBy: "vote",
      tiedUserIds: null,
      final: true,
    });
  });

  it("tallies what was cast once the window closes", () => {
    expect(
      mvpOutcome(question({ window: CLOSED, votes: votes(["a", "d"]) })),
    ).toMatchObject({ state: "decided", userId: "d", decidedBy: "vote" });
  });

  it("settles with no MVP when nobody voted, or nobody could", () => {
    expect(mvpOutcome(question({ window: CLOSED }))).toMatchObject({
      state: "none",
      final: true,
    });
    const allUnclaimed = PARTICIPANTS.map((participant) => ({
      ...participant,
      isUnclaimed: true,
    }));
    expect(mvpOutcome(question({ participants: allUnclaimed }))).toMatchObject({
      state: "pending",
      final: false,
    });
    expect(
      mvpOutcome(question({ participants: allUnclaimed, window: CLOSED })),
    ).toMatchObject({ state: "none", final: true });
  });

  it("asks the Organizer on a tie, then takes the tie-break pick", () => {
    const tied = votes(["a", "c"], ["b", "a"], ["c", "d"]);
    expect(mvpOutcome(question({ votes: tied }))).toEqual({
      state: "tie",
      userId: null,
      decidedBy: null,
      tiedUserIds: ["a", "c", "d"],
      final: false,
    });
    expect(
      mvpOutcome(
        question({
          votes: tied,
          pick: { userId: "a", decidedBy: "tie_break" },
        }),
      ),
    ).toMatchObject({ state: "decided", userId: "a", decidedBy: "tie_break" });
    expect(
      mvpOutcome(
        question({
          votes: tied,
          pick: { userId: "b", decidedBy: "tie_break" },
        }),
      ).state,
    ).toBe("tie");
  });

  it("has no MVP when a tie meets the close without a pick", () => {
    expect(
      mvpOutcome(
        question({ window: CLOSED, votes: votes(["a", "c"], ["b", "a"]) }),
      ),
    ).toMatchObject({ state: "none", userId: null, final: true });
  });

  it("shows the Organizer's current pick, final only at the close", () => {
    const pick = { userId: "c", decidedBy: "organizer" as const };
    expect(mvpOutcome(question({ mode: "organizer", pick }))).toMatchObject({
      state: "decided",
      userId: "c",
      decidedBy: "organizer",
      final: false,
    });
    expect(
      mvpOutcome(question({ mode: "organizer", pick, window: CLOSED })),
    ).toMatchObject({ state: "decided", userId: "c", final: true });
    expect(mvpOutcome(question({ mode: "organizer" }))).toMatchObject({
      state: "pending",
      final: false,
    });
    expect(
      mvpOutcome(question({ mode: "organizer", window: CLOSED })),
    ).toMatchObject({ state: "none", final: true });
  });

  it("ignores a pick that does not belong to the mode", () => {
    expect(
      mvpOutcome(
        question({
          mode: "organizer",
          pick: { userId: "c", decidedBy: "tie_break" },
        }),
      ).state,
    ).toBe("pending");
    expect(
      mvpOutcome(
        question({
          mode: "organizer",
          pick: { userId: "gone", decidedBy: "organizer" },
        }),
      ).state,
    ).toBe("pending");
  });
});

describe("canCastMvpVote", () => {
  const vote = (overrides: Partial<Parameters<typeof canCastMvpVote>[0]>) =>
    canCastMvpVote({
      ...question(),
      settled: false,
      voterUserId: "a",
      candidateUserId: "c",
      ...overrides,
    });

  it("accepts a vote for any other participant, Unclaimed included", () => {
    expect(vote({})).toEqual({ ok: true });
    expect(vote({ candidateUserId: "b" })).toEqual({ ok: true });
    expect(vote({ candidateUserId: "d" })).toEqual({ ok: true });
  });

  it("refuses each case with its reason", () => {
    expect(vote({ mode: "organizer" })).toEqual({
      ok: false,
      reason: "wrong_mode",
    });
    expect(vote({ voterUserId: "d" })).toEqual({
      ok: false,
      reason: "not_voter",
    });
    expect(vote({ voterUserId: "x" })).toEqual({
      ok: false,
      reason: "not_voter",
    });
    expect(vote({ candidateUserId: "a" })).toEqual({
      ok: false,
      reason: "self",
    });
    expect(vote({ candidateUserId: "x" })).toEqual({
      ok: false,
      reason: "not_candidate",
    });
    for (const closed of [
      { window: null },
      { window: CLOSED },
      { settled: true },
      { votes: votes(["a", "c"], ["b", "a"], ["c", "a"]) },
    ]) {
      expect(vote(closed)).toEqual({ ok: false, reason: "closed" });
    }
  });
});

describe("canPickMvp", () => {
  const pick = (overrides: Partial<Parameters<typeof canPickMvp>[0]>) =>
    canPickMvp({
      ...question({ mode: "organizer" }),
      settled: false,
      isOrganizer: true,
      pickerUserId: "a",
      userId: "c",
      ...overrides,
    });

  it("lets an Organizer pick any participant but themselves in organizer mode", () => {
    expect(pick({})).toEqual({ ok: true });
    expect(pick({ userId: "d" })).toEqual({ ok: true });
    expect(pick({ userId: "a" })).toEqual({ ok: false, reason: "self" });
    expect(pick({ userId: "x" })).toEqual({
      ok: false,
      reason: "not_candidate",
    });
    expect(pick({ isOrganizer: false })).toEqual({
      ok: false,
      reason: "not_organizer",
    });
    expect(pick({ mode: "none" })).toEqual({ ok: false, reason: "wrong_mode" });
    expect(pick({ window: CLOSED })).toEqual({ ok: false, reason: "closed" });
    expect(pick({ settled: true })).toEqual({ ok: false, reason: "closed" });
  });

  it("in vote mode accepts only one of the tied, the Organizer included", () => {
    const tied = votes(["a", "c"], ["b", "a"], ["c", "a"]);
    const tie = votes(["a", "c"], ["b", "a"], ["c", "b"]);
    expect(pick({ mode: "vote" })).toEqual({ ok: false, reason: "wrong_mode" });
    expect(pick({ mode: "vote", votes: tied })).toEqual({
      ok: false,
      reason: "closed",
    });
    expect(pick({ mode: "vote", votes: tie, userId: "a" })).toEqual({
      ok: true,
    });
    expect(pick({ mode: "vote", votes: tie, userId: "d" })).toEqual({
      ok: false,
      reason: "not_candidate",
    });
  });
});

describe("gameMvpView", () => {
  const unsettled = {
    userId: null,
    decidedBy: null,
    decidedAt: null,
    settledAt: null,
  };

  it("shows the count and the viewer's own vote but no tally while pending", () => {
    const view = gameMvpView({
      question: question({ votes: votes(["a", "c"], ["b", "c"]) }),
      stored: unsettled,
      viewerUserId: "a",
      isOrganizer: false,
    });
    expect(view.mvp).toMatchObject({
      mode: "vote",
      state: "pending",
      votes: { cast: 2, eligible: 3 },
      tally: null,
      tiedUserIds: null,
      closesAt: OPEN?.closesAt,
    });
    expect(view.viewer).toEqual({
      canVote: true,
      vote: "c",
      isOrganizer: false,
      canPickMvp: false,
    });
  });

  it("names the tied players to an Organizer only", () => {
    const tie = question({ votes: votes(["a", "c"], ["b", "a"], ["c", "b"]) });
    const organizer = gameMvpView({
      question: tie,
      stored: unsettled,
      viewerUserId: "x",
      isOrganizer: true,
    });
    expect(organizer.mvp.tiedUserIds).toEqual(["a", "b", "c"]);
    expect(organizer.viewer).toMatchObject({ canPickMvp: true });
    const player = gameMvpView({
      question: tie,
      stored: unsettled,
      viewerUserId: "a",
      isOrganizer: false,
    });
    expect(player.mvp).toMatchObject({ state: "tie", tiedUserIds: null });
    expect(player.viewer).toMatchObject({ canVote: false, canPickMvp: false });
  });

  it("shows the stored decision and the tally once settled", () => {
    const settledAt = new Date(COMPLETED_AT.getTime() + 48 * HOUR);
    const view = gameMvpView({
      question: question({ window: CLOSED, votes: votes(["a", "c"]) }),
      stored: {
        userId: "c",
        decidedBy: "vote",
        decidedAt: settledAt,
        settledAt,
      },
      viewerUserId: "a",
      isOrganizer: true,
    });
    expect(view.mvp).toMatchObject({
      state: "decided",
      userId: "c",
      decidedBy: "vote",
      decidedAt: settledAt,
      settledAt,
      tally: [{ userId: "c", votes: 1 }],
    });
    expect(view.viewer).toMatchObject({ canVote: false, canPickMvp: false });
  });

  it("exposes no MVP state in none mode", () => {
    const view = gameMvpView({
      question: question({ mode: "none", votes: votes(["a", "c"]) }),
      stored: unsettled,
      viewerUserId: "a",
      isOrganizer: true,
    });
    expect(view.mvp).toMatchObject({
      mode: "none",
      state: "none",
      userId: null,
      votes: { cast: 0, eligible: 0 },
      tally: null,
    });
    expect(view.viewer).toEqual({
      canVote: false,
      vote: null,
      isOrganizer: true,
      canPickMvp: false,
    });
  });

  it("lets the Organizer change their pick until the close", () => {
    const view = gameMvpView({
      question: question({
        mode: "organizer",
        pick: { userId: "c", decidedBy: "organizer" },
      }),
      stored: {
        userId: "c",
        decidedBy: "organizer",
        decidedAt: COMPLETED_AT,
        settledAt: null,
      },
      viewerUserId: "a",
      isOrganizer: true,
    });
    expect(view.mvp).toMatchObject({
      state: "decided",
      userId: "c",
      decidedBy: "organizer",
      decidedAt: COMPLETED_AT,
      settledAt: null,
      votes: { cast: 0, eligible: 0 },
    });
    expect(view.viewer.canPickMvp).toBe(true);
  });
});

describe("MVP copy", () => {
  it("recognises modes and refusals", () => {
    expect(MVP_MODES.every(isMvpMode)).toBe(true);
    expect(isMvpMode("random")).toBe(false);
    expect(MVP_REFUSALS.every(isMvpRefusal)).toBe(true);
  });

  it("labels, describes and helps every mode in both Locales", () => {
    for (const mode of MVP_MODES) {
      for (const locale of ["en", "ar"] as const) {
        const copy = mvpModeCopy(mode, locale);
        expect(copy.label.trim()).not.toBe("");
        expect(copy.description.trim()).not.toBe("");
        expect(copy.help.trim()).not.toBe("");
      }
    }
    expect(mvpModeCopy("vote", "en").label).toBe("Players vote");
    expect(mvpModeCopy("organizer", "ar").label).toBe("المنظّم يختار");
    expect(mvpName("en")).toBe("MVP");
    expect(mvpName("ar")).toBe("نجم المباراة");
  });

  it("says how the MVP was decided", () => {
    const tally = { cast: 7, eligible: 12 };
    expect(mvpDecidedByCopy("vote", tally, "en")).toBe("By vote, 7 of 12");
    expect(mvpDecidedByCopy("organizer", tally, "en")).toBe("Organizer’s pick");
    expect(mvpDecidedByCopy("tie_break", tally, "en")).toBe(
      "Tied vote, Organizer’s pick",
    );
    expect(mvpDecidedByCopy("vote", tally, "ar")).toBe("بالتصويت، 7 من 12");
  });

  it("writes the vote progress with the close", () => {
    const closesAt = bahrainDate(2026, 10, 6, 19, 0);
    expect(voteProgressCopy({ cast: 7, eligible: 12 }, closesAt, "en")).toBe(
      "7 of 12 have voted, closes Fri 7:00 PM",
    );
    expect(voteProgressCopy({ cast: 7, eligible: 12 }, closesAt, "ar")).toBe(
      "صوّت 7 من 12، يُغلق الجمعة 7:00 م",
    );
  });

  it("explains every refusal in both Locales", () => {
    for (const reason of MVP_REFUSALS) {
      for (const locale of ["en", "ar"] as const) {
        expect(mvpRefusedCopy(reason, locale).trim()).not.toBe("");
      }
    }
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { bahrainDate } from "./bahrain-date.test-support";
import type {
  MyTournament,
  MyTournamentPair,
  MyTournamentRound,
} from "./hub-game-row";
import {
  isTournamentGamesCardRow,
  tournamentGamesCardModel,
  tournamentPlayedCardModel,
} from "./tournament-games-card";

function occupant(name: string, isViewer = false) {
  return {
    userId: name,
    name,
    image: null,
    isViewer,
  };
}

function pair(first: string, second: string): MyTournamentPair {
  return { left: occupant(first), right: occupant(second) };
}

const START = bahrainDate(2026, 10, 11, 23, 0);
const END = bahrainDate(2026, 10, 12, 1, 0);

function round(
  roundNumber: number,
  opponent: MyTournamentPair,
  overrides: Partial<MyTournamentRound> = {},
): MyTournamentRound {
  return {
    matchId: `m${roundNumber}`,
    roundNumber,
    startTime: new Date(START.getTime() + (roundNumber - 1) * 30 * 60_000),
    courtName: `Court ${roundNumber}`,
    completed: false,
    cancelled: false,
    outcome: null,
    viewerSets: [],
    opponent,
    ...overrides,
  };
}

function tournament(overrides: Partial<MyTournament> = {}): MyTournament {
  return {
    viewerTeam: {
      left: occupant("Hassan Haji", true),
      right: occupant("Khalid Jaber"),
    },
    poolLabel: "A",
    poolSize: 6,
    poolCount: 1,
    viewerPosition: null,
    poolFinished: false,
    winner: null,
    rounds: [
      round(1, pair("Layla Hassan", "Mariam Zayed")),
      round(2, pair("Omar Tariq", "Sara Mansoor")),
      round(3, pair("Dana Ali", "Yousif Khalil")),
      round(4, pair("Ahmed Bader", "Faisal Jamal")),
    ],
    ...overrides,
  };
}

function game(myTournament: MyTournament) {
  return {
    name: "Tuesday Night Padel",
    sport: "padel",
    format: "friendly_tournament",
    startTime: START,
    windowStart: START,
    windowEnd: END,
    venue: { name: "World Padel Academy Bahrain" },
    myTournament,
  };
}

const won = (sets: [number, number][]) => ({
  completed: true,
  outcome: "won" as const,
  viewerSets: sets.map(([viewer, opponent]) => ({ viewer, opponent })),
});

const lost = (sets: [number, number][]) => ({
  completed: true,
  outcome: "lost" as const,
  viewerSets: sets.map(([viewer, opponent]) => ({ viewer, opponent })),
});

describe("isTournamentGamesCardRow", () => {
  it("is true only for rows that carry the viewer's tournament", () => {
    expect(isTournamentGamesCardRow({ myTournament: tournament() })).toBe(true);
    expect(isTournamentGamesCardRow({ myTournament: null })).toBe(false);
    expect(isTournamentGamesCardRow({})).toBe(false);
  });
});

describe("tournamentGamesCardModel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(bahrainDate(2026, 10, 11, 22, 5));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("before the first Round counts down and marks Round 1 next", () => {
    const model = tournamentGamesCardModel(
      game(tournament()),
      bahrainDate(2026, 10, 11, 22, 5),
      "en",
    );
    expect(model.status).toBe("in 55m");
    expect(model.dayLine).toBe("Tonight, Wednesday 11 November");
    expect(model.time).toBe("11:00");
    expect(model.meridiem).toBe("PM");
    expect(model.untilLine).toBe("to 1:00 AM");
    expect(model.venueLine).toBe("World Padel Academy Bahrain, 4 courts");
    expect(model.teamName).toBe("You and Khalid J");
    expect(model.teamLine).toBe("Group A, 6 teams");
    expect(model.roundsMeta).toBe("4 tonight");
    expect(model.cells.map((cell) => [cell.label, cell.state])).toEqual([
      ["R1", "next"],
      ["R2", "later"],
      ["R3", "later"],
      ["R4", "later"],
    ]);
    expect(model.cells.every((cell) => cell.hatched)).toBe(true);
    expect(model.cells[0]?.opponentNames).toEqual(["Layla H", "Mariam Z"]);
    expect(model.step).toEqual({
      kind: "first",
      title: "First up: Layla H and Mariam Z, Court 1",
      body: "4 rounds, one card for the whole night. Scores go in from here.",
    });
    expect(model.secondary).toEqual({ label: "Details", target: "tournament" });
    expect(model.primary).toEqual({
      label: "View tournament",
      target: "results",
    });
  });

  it("during the night shows the result, the Round on court and the next one", () => {
    const base = tournament({ viewerPosition: 2 });
    const live = {
      ...base,
      rounds: base.rounds.map((item) =>
        item.roundNumber === 1 ? { ...item, ...won([[6, 2]]) } : item,
      ),
    };
    const model = tournamentGamesCardModel(
      game(live),
      bahrainDate(2026, 10, 11, 23, 40),
      "en",
    );
    expect(model.status).toBe("round 2 of 4");
    expect(model.teamLine).toBe("Group A, 2nd of 6 so far");
    expect(model.roundsMeta).toBe("1 played, 1 won");
    expect(
      model.cells.map((cell) => [cell.state, cell.stateLine, cell.hatched]),
    ).toEqual([
      ["won", "6–2", false],
      ["on_court", "On court", false],
      ["next", "Next", true],
      ["later", null, true],
    ]);
    expect(model.cells[0]?.accessibilityLabel).toBe(
      "Round 1, won 6–2, against Layla H and Mariam Z",
    );
    expect(model.step).toEqual({
      kind: "playing",
      title: "Playing Omar T and Sara M, Court 2",
      body: "Enter the score when you finish. Dana A and Yousif K are next, on Court 3.",
    });
    expect(model.primary).toEqual({ label: "Enter score", target: "results" });
    expect(model.secondary).toEqual({
      label: "Tournament",
      target: "tournament",
    });
  });

  it("names the one court when every Round is on it", () => {
    const base = tournament();
    const model = tournamentGamesCardModel(
      game({
        ...base,
        rounds: base.rounds.map((item) => ({ ...item, courtName: "Court 3" })),
      }),
      bahrainDate(2026, 10, 11, 22, 5),
      "en",
    );
    expect(model.venueLine).toBe("World Padel Academy Bahrain, Court 3");
  });

  it("writes Arabic copy", () => {
    const model = tournamentGamesCardModel(
      game(tournament()),
      bahrainDate(2026, 10, 11, 22, 5),
      "ar",
    );
    expect(model.cells[0]?.label).toBe("ج1");
    expect(model.cells[0]?.stateLine).toBe("التالية");
    expect(model.roundsTitle).toBe("جولاتك");
  });
});

describe("tournamentPlayedCardModel", () => {
  function played(myTournament: MyTournament) {
    return {
      name: "Tuesday Night Padel",
      format: "friendly_tournament",
      displayTime: START,
      windowStart: START,
      venue: { name: "World Padel Academy Bahrain" },
      myTournament,
    };
  }

  it("leads with the place and names the winner", () => {
    const base = tournament();
    const model = tournamentPlayedCardModel(
      played({
        ...base,
        viewerPosition: 2,
        poolFinished: true,
        winner: pair("Layla Hassan", "Mariam Zayed"),
        rounds: [
          { ...base.rounds[0]!, ...won([[6, 2]]) },
          { ...base.rounds[1]!, ...lost([[2, 6]]) },
          { ...base.rounds[2]!, ...won([[6, 2]]) },
          { ...base.rounds[3]!, ...won([[6, 4]]) },
        ],
      }),
      "en",
    );
    expect(model.bandLabel).toBe("Friendly tournament");
    expect(model.day).toBe("Wed 11 Nov");
    expect(model.venueLine).toBe(
      "Tuesday Night Padel, World Padel Academy Bahrain",
    );
    expect(model.place).toBe("2nd");
    expect(model.context).toBe("of 6 teams, with Khalid J");
    expect(model.summary).toBe("3 won, 1 lost. Layla H and Mariam Z won it");
    expect(model.cells.map((cell) => cell.stateLine)).toEqual([
      "6–2",
      "2–6",
      "6–2",
      "6–4",
    ]);
    expect(model.missing).toBeNull();
  });

  it("does not name the winner when the viewer won", () => {
    const base = tournament();
    const model = tournamentPlayedCardModel(
      played({
        ...base,
        viewerPosition: 1,
        poolFinished: true,
        winner: base.viewerTeam,
        rounds: base.rounds.map((item) => ({ ...item, ...won([[6, 1]]) })),
      }),
      "en",
    );
    expect(model.place).toBe("1st");
    expect(model.summary).toBe("4 won, 0 lost.");
  });

  it("says so far and offers the score when a Round has none", () => {
    const base = tournament();
    const model = tournamentPlayedCardModel(
      played({
        ...base,
        viewerPosition: 3,
        rounds: [
          { ...base.rounds[0]!, ...won([[6, 2]]) },
          { ...base.rounds[1]!, ...lost([[2, 6]]) },
          { ...base.rounds[2]!, ...won([[6, 2]]) },
          base.rounds[3]!,
        ],
      }),
      "en",
    );
    expect(model.context).toBe("of 6 teams, so far, with Khalid J");
    expect(model.summary).toBe("2 won, 1 lost. One round has no score yet");
    expect(model.cells[3]).toMatchObject({
      state: "no_score",
      stateLine: "no score",
      hatched: true,
    });
    expect(model.missing).toEqual({
      line: "R4 has no score",
      action: { label: "Add the score", target: "results" },
    });
  });

  it("names the group when the tournament has more than one", () => {
    const base = tournament({ poolCount: 2, viewerPosition: 2 });
    const model = tournamentPlayedCardModel(
      played({
        ...base,
        poolFinished: true,
        rounds: base.rounds.map((item) => ({ ...item, ...won([[6, 1]]) })),
      }),
      "en",
    );
    expect(model.context).toBe("of 6 in group A, with Khalid J");
  });
});

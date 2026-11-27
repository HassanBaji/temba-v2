import { describe, expect, it } from "vitest";

import {
  seriesEditionResult,
  type SeriesResultGame,
  type SeriesResultGameTeam,
  type SeriesResultMatch,
} from "./series-result";
import {
  knockoutChampion,
  postedKnockoutRounds,
} from "./tournament-knockout-view";
import { matchOutcome } from "./match-outcome";

const DAY = new Date("2026-11-08T07:00:00Z");

function team(
  id: string,
  userIds: string[],
  extra: Partial<SeriesResultGameTeam> = {},
): SeriesResultGameTeam {
  return {
    id,
    poolIndex: null,
    sideIndex: null,
    finalPlace: null,
    userIds,
    ...extra,
  };
}

function match(
  id: string,
  slot1: string | null,
  slot2: string | null,
  score: readonly [number, number] | null,
  extra: Partial<SeriesResultMatch> = {},
): SeriesResultMatch {
  return {
    id,
    status: score ? "completed" : "pending",
    roundNumber: null,
    knockoutRound: null,
    knockoutPosition: null,
    slot1GameTeamId: slot1,
    slot2GameTeamId: slot2,
    walkoverGameTeamId: null,
    startTime: DAY,
    sets: score ? [{ slot1GamesWon: score[0], slot2GamesWon: score[1] }] : [],
    ...extra,
  };
}

function game(extra: Partial<SeriesResultGame>): SeriesResultGame {
  return {
    format: "friendly_game",
    sport: "padel",
    groupId: "group",
    challengeId: null,
    tournamentShape: null,
    poolCount: null,
    roundCount: null,
    cancelledAt: null,
    drawPostedAt: null,
    finalOrderPostedAt: null,
    gameTeams: [],
    matches: [],
    americano: null,
    ...extra,
  };
}

const sides = [team("side-1", ["u1", "u2"]), team("side-2", ["u3", "u4"])];

function friendly(
  score: readonly [number, number] | null,
  extra: Partial<SeriesResultGame> = {},
) {
  return game({
    gameTeams: sides,
    matches: [match("m1", "side-1", "side-2", score)],
    ...extra,
  });
}

describe("seriesEditionResult: kinds that never decide", () => {
  it("leaves a cancelled Game upcoming, even with a completed Match", () => {
    expect(seriesEditionResult(friendly([6, 2], { cancelledAt: DAY }))).toEqual(
      { state: "upcoming" },
    );
  });

  it("leaves a kind that carries no Series upcoming", () => {
    expect(
      seriesEditionResult(friendly([6, 2], { format: "americano" })),
    ).toEqual({ state: "upcoming" });
    expect(
      seriesEditionResult(friendly([6, 2], { challengeId: "challenge" })),
    ).toEqual({ state: "upcoming" });
  });
});

describe("seriesEditionResult: a padel Friendly game", () => {
  it("is upcoming until its Match is completed", () => {
    expect(seriesEditionResult(friendly(null))).toEqual({ state: "upcoming" });
  });

  it("goes to both players of the winning Game team", () => {
    expect(
      seriesEditionResult(
        game({
          gameTeams: sides,
          matches: [
            {
              ...match("m1", "side-1", "side-2", null),
              status: "completed",
              sets: [
                { slot1GamesWon: 4, slot2GamesWon: 6 },
                { slot1GamesWon: 6, slot2GamesWon: 3 },
                { slot1GamesWon: 3, slot2GamesWon: 6 },
              ],
            },
          ],
        }),
      ),
    ).toEqual({
      state: "won",
      gameTeamIds: ["side-2"],
      userIds: ["u3", "u4"],
    });
  });

  it("gives a drawn Match to nobody", () => {
    expect(
      seriesEditionResult(
        game({
          gameTeams: sides,
          matches: [
            {
              ...match("m1", "side-1", "side-2", null),
              status: "completed",
              sets: [
                { slot1GamesWon: 6, slot2GamesWon: 3 },
                { slot1GamesWon: 3, slot2GamesWon: 6 },
              ],
            },
          ],
        }),
      ),
    ).toEqual({ state: "no_winner" });
  });
});

describe("seriesEditionResult: a football Game", () => {
  const football = (score: readonly [number, number] | null) =>
    friendly(score, {
      sport: "football",
      gameTeams: [
        team("black", ["k1", "k2", "k3"]),
        team("white", ["w1", "w2", "w3", "sub"]),
      ],
      matches: [match("m1", "black", "white", score)],
    });

  it("is upcoming until the score is in", () => {
    expect(seriesEditionResult(football(null))).toEqual({ state: "upcoming" });
  });

  it("goes to everyone on the winning side, substitutes included", () => {
    expect(seriesEditionResult(football([3, 5]))).toEqual({
      state: "won",
      gameTeamIds: ["white"],
      userIds: ["w1", "w2", "w3", "sub"],
    });
  });

  it("gives a drawn Score to nobody", () => {
    expect(seriesEditionResult(football([2, 2]))).toEqual({
      state: "no_winner",
    });
  });
});

function poolTeams(pool: number, ids: string[]) {
  return ids.map((id, index) =>
    team(id, [`${id}-left`, `${id}-right`], {
      poolIndex: pool,
      sideIndex: pool * 10 + index + 1,
    }),
  );
}

function roundRobin(ids: readonly [string, string, string, string]) {
  const [a, b, c, d] = ids;
  return [
    match(`${a}${b}`, a, b, [6, 2], { roundNumber: 1 }),
    match(`${c}${d}`, c, d, [6, 3], { roundNumber: 1 }),
    match(`${a}${c}`, a, c, [6, 4], { roundNumber: 2 }),
    match(`${b}${d}`, b, d, [6, 1], { roundNumber: 2 }),
    match(`${a}${d}`, a, d, [6, 0], { roundNumber: 3 }),
    match(`${b}${c}`, b, c, [6, 3], { roundNumber: 3 }),
  ];
}

function social(extra: Partial<SeriesResultGame>) {
  return game({
    format: "friendly_tournament",
    drawPostedAt: DAY,
    ...extra,
  });
}

describe("seriesEditionResult: a Rounds Social", () => {
  const rounds = (matches: SeriesResultMatch[]) =>
    social({
      tournamentShape: "rounds",
      poolCount: 1,
      roundCount: 3,
      gameTeams: poolTeams(0, ["a", "b", "c", "d"]),
      matches,
    });

  it("is upcoming while a Round is still to be posted", () => {
    expect(
      seriesEditionResult(
        rounds(
          roundRobin(["a", "b", "c", "d"]).filter(
            (entry) => entry.roundNumber !== 3,
          ),
        ),
      ),
    ).toEqual({ state: "upcoming" });
  });

  it("is upcoming while a posted Match has no score", () => {
    const matches = roundRobin(["a", "b", "c", "d"]);
    matches[5] = match("bc", "b", "c", null, { roundNumber: 3 });
    expect(seriesEditionResult(rounds(matches))).toEqual({
      state: "upcoming",
    });
  });

  it("goes to the team on top of the table once the last Round is settled", () => {
    expect(
      seriesEditionResult(rounds(roundRobin(["a", "b", "c", "d"]))),
    ).toEqual({
      state: "won",
      gameTeamIds: ["a"],
      userIds: ["a-left", "a-right"],
    });
  });

  it("is upcoming before the draw is posted", () => {
    expect(
      seriesEditionResult({
        ...rounds(roundRobin(["a", "b", "c", "d"])),
        drawPostedAt: null,
      }),
    ).toEqual({ state: "upcoming" });
  });
});

describe("seriesEditionResult: a Groups only Social", () => {
  it("goes to the one Pool's top team", () => {
    expect(
      seriesEditionResult(
        social({
          tournamentShape: "groups_only",
          poolCount: 1,
          gameTeams: poolTeams(0, ["a", "b", "c", "d"]),
          matches: roundRobin(["a", "b", "c", "d"]),
        }),
      ),
    ).toEqual({
      state: "won",
      gameTeamIds: ["a"],
      userIds: ["a-left", "a-right"],
    });
  });

  it("gives two Pools two winning teams", () => {
    const groups = social({
      tournamentShape: "groups_only",
      poolCount: 2,
      gameTeams: [
        ...poolTeams(0, ["a", "b", "c", "d"]),
        ...poolTeams(1, ["e", "f", "g", "h"]),
      ],
      matches: [
        ...roundRobin(["a", "b", "c", "d"]),
        ...roundRobin(["f", "e", "g", "h"]),
      ],
    });
    expect(seriesEditionResult(groups)).toEqual({
      state: "won",
      gameTeamIds: ["a", "f"],
      userIds: ["a-left", "a-right", "f-left", "f-right"],
    });
  });

  it("is upcoming while one of the Pools is still playing", () => {
    const second = roundRobin(["e", "f", "g", "h"]);
    second[0] = match("ef", "e", "f", null, { roundNumber: 1 });
    expect(
      seriesEditionResult(
        social({
          tournamentShape: "groups_only",
          poolCount: 2,
          gameTeams: [
            ...poolTeams(0, ["a", "b", "c", "d"]),
            ...poolTeams(1, ["e", "f", "g", "h"]),
          ],
          matches: [...roundRobin(["a", "b", "c", "d"]), ...second],
        }),
      ),
    ).toEqual({ state: "upcoming" });
  });
});

const knockoutTeams = ["a", "b", "c", "d"].map((id) =>
  team(id, [`${id}-left`, `${id}-right`]),
);

function knockout(
  final: Partial<SeriesResultMatch>,
  extra: Partial<SeriesResultGame> = {},
) {
  return social({
    tournamentShape: "knockout_only",
    gameTeams: knockoutTeams,
    matches: [
      match("semi-1", "a", "b", [6, 3], {
        knockoutRound: 1,
        knockoutPosition: 1,
      }),
      match("semi-2", "c", "d", [2, 6], {
        knockoutRound: 1,
        knockoutPosition: 2,
      }),
      { ...match("final", "a", "d", null), ...final },
    ],
    ...extra,
  });
}

const finalPlace = { knockoutRound: 2, knockoutPosition: 1 };

describe("seriesEditionResult: a Social with a Knockout", () => {
  it("is upcoming until the Final has a winner", () => {
    expect(seriesEditionResult(knockout(finalPlace))).toEqual({
      state: "upcoming",
    });
  });

  it("goes to the Champion who won the Final", () => {
    expect(
      seriesEditionResult(
        knockout({
          ...finalPlace,
          status: "completed",
          sets: [{ slot1GamesWon: 4, slot2GamesWon: 6 }],
        }),
      ),
    ).toEqual({
      state: "won",
      gameTeamIds: ["d"],
      userIds: ["d-left", "d-right"],
    });
  });

  it("goes to the team awarded the Final as a Walkover", () => {
    expect(
      seriesEditionResult(
        knockout({
          ...finalPlace,
          status: "cancelled",
          walkoverGameTeamId: "a",
        }),
      ),
    ).toEqual({
      state: "won",
      gameTeamIds: ["a"],
      userIds: ["a-left", "a-right"],
    });
  });

  it("reads the Final of Groups then knockout, not a Pool table", () => {
    const groupsThen = knockout(
      {
        ...finalPlace,
        status: "completed",
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 1 }],
      },
      { tournamentShape: "groups_then_knockout", poolCount: 1 },
    );
    expect(seriesEditionResult(groupsThen)).toEqual({
      state: "won",
      gameTeamIds: ["a"],
      userIds: ["a-left", "a-right"],
    });
  });

  it.each([
    [
      "a completed Final",
      { status: "completed", sets: [{ slot1GamesWon: 3, slot2GamesWon: 6 }] },
    ],
    ["a Walkover", { status: "cancelled", walkoverGameTeamId: "d" }],
  ] as const)(
    "names the same Champion as knockoutChampion on %s",
    (_, final) => {
      const fixture = knockout({ ...finalPlace, ...final });
      const champion = knockoutChampion(
        postedKnockoutRounds({
          matches: fixture.matches.map((entry) => ({
            ...entry,
            courtName: null,
            result: matchOutcome(entry.sets).result,
          })),
          gameTeams: fixture.gameTeams.map((entry) => ({
            id: entry.id,
            name: null,
            members: [],
          })),
          viewerUserId: "",
          locale: "en",
        }),
      );
      const result = seriesEditionResult(fixture);
      expect(result.state).toBe("won");
      expect(result.state === "won" ? result.gameTeamIds : []).toEqual([
        champion?.gameTeamId,
      ]);
    },
  );
});

describe("seriesEditionResult: King of the court", () => {
  const king = (places: (number | null)[], finalOrderPostedAt: Date | null) =>
    social({
      tournamentShape: "king_of_the_court",
      finalOrderPostedAt,
      gameTeams: places.map((place, index) =>
        team(`k${index}`, [`k${index}-left`, `k${index}-right`], {
          sideIndex: index + 1,
          finalPlace: place,
        }),
      ),
    });

  it("is upcoming until the Final order is posted", () => {
    expect(seriesEditionResult(king([2, 1, 3], null))).toEqual({
      state: "upcoming",
    });
  });

  it("goes to the team placed first", () => {
    expect(seriesEditionResult(king([2, 1, 3], DAY))).toEqual({
      state: "won",
      gameTeamIds: ["k1"],
      userIds: ["k1-left", "k1-right"],
    });
  });

  it("gives it to nobody when no team is placed first", () => {
    expect(seriesEditionResult(king([2, null, 3], DAY))).toEqual({
      state: "no_winner",
    });
  });
});

describe("seriesEditionResult: an Americano", () => {
  const americano = (
    finished: boolean,
    fixedPairs: readonly (readonly [string, string])[] = [],
  ) =>
    social({
      tournamentShape: "americano",
      americano: {
        finished,
        playerIds: ["p1", "p2", "p3", "p4"],
        userIdByPlayerId: { p1: "u1", p2: "u2", p3: "u3", p4: "u4" },
        results: [
          {
            slot1: ["p1", "p2"],
            slot2: ["p3", "p4"],
            slot1GamesWon: 10,
            slot2GamesWon: 14,
          },
          {
            slot1: ["p1", "p3"],
            slot2: ["p2", "p4"],
            slot1GamesWon: 13,
            slot2GamesWon: 11,
          },
        ],
        fixedPairs,
      },
    });

  it("is upcoming until every Match is settled", () => {
    expect(seriesEditionResult(americano(false))).toEqual({
      state: "upcoming",
    });
  });

  it("goes to the one player in first place, with no Game team", () => {
    expect(seriesEditionResult(americano(true))).toEqual({
      state: "won",
      gameTeamIds: [],
      userIds: ["u3"],
    });
  });

  it("goes to both players of a fixed pair in first place", () => {
    const game = social({
      tournamentShape: "americano",
      americano: {
        finished: true,
        playerIds: ["p1", "p2", "p3", "p4"],
        userIdByPlayerId: { p1: "u1", p2: "u2", p3: "u3", p4: "u4" },
        results: [
          {
            slot1: ["p1", "p2"],
            slot2: ["p3", "p4"],
            slot1GamesWon: 10,
            slot2GamesWon: 14,
          },
        ],
        fixedPairs: [["p3", "p4"]],
      },
    });
    expect(seriesEditionResult(game)).toEqual({
      state: "won",
      gameTeamIds: [],
      userIds: ["u3", "u4"],
    });
  });
});

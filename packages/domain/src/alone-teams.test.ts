import { describe, expect, it } from "vitest";

import {
  type AlonePlayer,
  aloneTeamsProblem,
  aloneTeamsShareText,
  aloneTeamsSidesMatch,
  aloneTeamsSpread,
  alonePairAverage,
  alonePairSameSide,
  balanceAloneTeams,
  shuffleAloneTeams,
  swapAloneSlots,
} from "./alone-teams";

function player(
  id: string,
  level: number | null,
  preferredSide: AlonePlayer["preferredSide"] = null,
): AlonePlayer {
  return { id, level, preferredSide };
}

function byId(players: readonly AlonePlayer[]) {
  return new Map(players.map((one) => [one.id, one]));
}

describe("balanceAloneTeams", () => {
  it("pairs the strongest with the weakest", () => {
    const players = [
      player("a", 4),
      player("b", 3.5),
      player("c", 3),
      player("d", 2.5),
    ];
    const { pairs, unplaced } = balanceAloneTeams(players);
    expect(unplaced).toBeNull();
    expect(pairs).toEqual([
      { left: "a", right: "d" },
      { left: "b", right: "c" },
    ]);
  });

  it("leaves out the last to sign up when the count is odd", () => {
    const players = [
      player("a", 4),
      player("b", 3),
      player("c", 2),
      player("d", 1),
      player("late", 5),
    ];
    const { pairs, unplaced } = balanceAloneTeams(players);
    expect(unplaced).toBe("late");
    expect(pairs.flatMap((pair) => [pair.left, pair.right])).not.toContain(
      "late",
    );
  });

  it("puts the player who asked for Left on the Left", () => {
    const { pairs } = balanceAloneTeams([
      player("strong", 4, "right"),
      player("weak", 2, null),
    ]);
    expect(pairs).toEqual([{ left: "weak", right: "strong" }]);
  });

  it("trades players between a two-Left pair and a two-Right pair", () => {
    const players = [
      player("a", 4, "left"),
      player("b", 3.6, "right"),
      player("c", 3.4, "right"),
      player("d", 3, "left"),
    ];
    const { pairs } = balanceAloneTeams(players);
    const lookup = byId(players);
    expect(aloneTeamsSidesMatch(pairs, lookup)).toBe(true);
    for (const pair of pairs) {
      expect(lookup.get(pair.left)?.preferredSide).toBe("left");
      expect(lookup.get(pair.right)?.preferredSide).toBe("right");
    }
  });

  it("counts a player with no Level as the field's average", () => {
    const players = [
      player("a", 4),
      player("b", null),
      player("c", 3),
      player("d", 2),
    ];
    const { pairs } = balanceAloneTeams(players);
    expect(aloneTeamsSpread(pairs, byId(players))).toBeLessThanOrEqual(0.5);
  });
});

describe("shuffleAloneTeams", () => {
  it("places everyone once", () => {
    const players = ["a", "b", "c", "d", "e", "f"].map((id) => player(id, 3));
    const { pairs } = shuffleAloneTeams(players, () => 0.3);
    const placed = pairs.flatMap((pair) => [pair.left, pair.right]).sort();
    expect(placed).toEqual(["a", "b", "c", "d", "e", "f"]);
  });
});

describe("swapAloneSlots", () => {
  it("swaps two players across pairs", () => {
    const pairs = [
      { left: "a", right: "b" },
      { left: "c", right: "d" },
    ];
    expect(
      swapAloneSlots(
        pairs,
        { pairIndex: 0, side: "right" },
        { pairIndex: 1, side: "left" },
      ),
    ).toEqual([
      { left: "a", right: "c" },
      { left: "b", right: "d" },
    ]);
    expect(pairs[0]).toEqual({ left: "a", right: "b" });
  });

  it("swaps sides inside one pair", () => {
    expect(
      swapAloneSlots(
        [{ left: "a", right: "b" }],
        { pairIndex: 0, side: "left" },
        { pairIndex: 0, side: "right" },
      ),
    ).toEqual([{ left: "b", right: "a" }]);
  });
});

describe("pair marks", () => {
  it("averages the Levels that exist", () => {
    expect(alonePairAverage([3, 4])).toBe(3.5);
    expect(alonePairAverage([3, null])).toBe(3);
    expect(alonePairAverage([null, null])).toBeNull();
  });

  it("marks a pair who both asked for the same side", () => {
    const players = [player("a", 3, "left"), player("b", 3, "left")];
    expect(alonePairSameSide({ left: "a", right: "b" }, byId(players))).toBe(
      "left",
    );
  });
});

describe("aloneTeamsProblem", () => {
  const playerIds = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
  const pairs = [
    { left: "a", right: "b" },
    { left: "c", right: "d" },
    { left: "e", right: "f" },
    { left: "g", right: "h" },
  ];

  it("accepts four pairs with one odd player out", () => {
    expect(aloneTeamsProblem({ pairs, playerIds, teamsAllowed: 8 })).toBeNull();
  });

  it("refuses a player in two pairs", () => {
    expect(
      aloneTeamsProblem({
        pairs: [...pairs.slice(0, 3), { left: "a", right: "i" }],
        playerIds,
        teamsAllowed: 8,
      }),
    ).toBe("player_twice");
  });

  it("refuses fewer than four pairs", () => {
    expect(
      aloneTeamsProblem({
        pairs: pairs.slice(0, 3),
        playerIds: playerIds.slice(0, 6),
        teamsAllowed: 8,
      }),
    ).toBe("too_few_pairs");
  });

  it("refuses more pairs than the Social holds", () => {
    expect(aloneTeamsProblem({ pairs, playerIds, teamsAllowed: 3 })).toBe(
      "too_many_pairs",
    );
  });

  it("refuses leaving two players out", () => {
    expect(
      aloneTeamsProblem({
        pairs,
        playerIds: [...playerIds, "j"],
        teamsAllowed: 8,
      }),
    ).toBe("left_out");
  });

  it("refuses someone who is not signed up", () => {
    expect(
      aloneTeamsProblem({
        pairs: [...pairs.slice(0, 3), { left: "g", right: "stranger" }],
        playerIds,
        teamsAllowed: 8,
      }),
    ).toBe("not_on_game");
  });
});

describe("aloneTeamsShareText", () => {
  it("numbers the teams, with levels when asked", () => {
    const text = aloneTeamsShareText(
      {
        gameName: "Sunday Social",
        detailLines: ["Mon 9 Nov, 11:00 AM"],
        teams: [
          { leftName: "Layla Haddad", rightName: "Nora Newman", average: 3.1 },
          {
            leftName: "Qasim Albaqali",
            rightName: "Ahmed Buhazza",
            average: null,
          },
        ],
        showLevels: true,
      },
      "en",
    );
    expect(text).toBe(
      [
        "Sunday Social: the teams",
        "Mon 9 Nov, 11:00 AM",
        "",
        "1. Layla Haddad & Nora Newman (3.10)",
        "2. Qasim Albaqali & Ahmed Buhazza",
      ].join("\n"),
    );
  });
});

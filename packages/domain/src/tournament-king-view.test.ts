import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  kingFieldTeams,
  kingFinishedView,
  kingHeroStats,
  kingShareCard,
  kingStartingCourtRows,
  kingYourCourt,
  type KingViewTeam,
} from "./tournament-king-view";

function team(
  id: string,
  side: number,
  names: [string, string],
  extra: Partial<KingViewTeam> = {},
): KingViewTeam {
  return {
    id,
    sideIndex: side,
    members: [
      { id: `${id}-1`, name: names[0] },
      { id: `${id}-2`, name: names[1] },
    ],
    ...extra,
  };
}

const TEAMS = [
  team("lh", 1, ["Layla Haddad", "Mariam Zayani"], {
    startCourt: 1,
    finalPlace: 1,
  }),
  team("ab", 2, ["Ahmed Buhazza", "Dana Al-Khalifa"], {
    startCourt: 1,
    finalPlace: 2,
  }),
  team("na", 3, ["Noor Abdulla", "Omar Al-Sayed"], {
    startCourt: 2,
    finalPlace: 4,
  }),
  team("jk", 4, ["Jassim Kanoo", "Reem Fakhro"], {
    startCourt: 2,
    finalPlace: null,
  }),
  team("hh", 5, ["Hassan Haji", "Khalid Janahi"], {
    startCourt: 3,
    finalPlace: 3,
  }),
  team("sf", 6, ["Sara Fakhro", "Yousif Mansoor"], {
    startCourt: 3,
    finalPlace: null,
  }),
  team("rk", 7, ["Rashed Kanoo", "Qasim Albaqali"], {
    startCourt: 4,
    finalPlace: null,
  }),
  team("ah", 8, ["Ali Haji", "Nora Newman"], {
    startCourt: 4,
    finalPlace: null,
  }),
];

const GAME = {
  name: "Sunday Social",
  windowStart: new Date("2026-11-08T08:00:00Z"),
  venue: { name: "World Padel Academy Bahrain" },
  teamsAllowed: 8,
  viewerUserId: "hh-1",
  gameTeams: TEAMS,
};

describe("kingYourCourt", () => {
  it("says where the viewer starts, against whom, and where each result sends them", () => {
    const court = kingYourCourt(GAME);
    assert.equal(court?.court, 3);
    assert.equal(court?.opponent?.id, "sf");
    assert.deepEqual(court?.win, { court: 2, stays: false });
    assert.deepEqual(court?.lose, { court: 4, stays: false });
  });

  it("is null before the draw or for someone not playing", () => {
    assert.equal(kingYourCourt({ ...GAME, viewerUserId: "someone" }), null);
    assert.equal(
      kingYourCourt({
        ...GAME,
        gameTeams: TEAMS.map((item) => ({ ...item, startCourt: null })),
      }),
      null,
    );
  });
});

describe("kingStartingCourtRows", () => {
  it("tags the king's court, the viewer's court and the bottom court", () => {
    const rows = kingStartingCourtRows(GAME);
    assert.deepEqual(
      rows.map((row) => [row.court, row.tag, row.teams.map((item) => item.id)]),
      [
        [1, "kings", ["lh", "ab"]],
        [2, null, ["na", "jk"]],
        [3, "yours", ["hh", "sf"]],
        [4, "bottom", ["rk", "ah"]],
      ],
    );
  });
});

describe("kingFinishedView", () => {
  it("leads with the king, then the viewer's place, then the whole order", () => {
    const view = kingFinishedView(GAME, "en");
    assert.equal(
      view.summary,
      "World Padel Academy Bahrain. 8 teams, 4 courts, king of the court",
    );
    assert.deepEqual(
      view.podium.map((row) => [
        row.place,
        row.smallLine,
        row.mainLine,
        row.detailLine,
      ]),
      [
        [
          1,
          "King of the court",
          "Layla Haddad & Mariam Zayani",
          "Held Court 1 at the end",
        ],
        [3, "You & Khalid J", "Third of 8", "Started on Court 3"],
      ],
    );
    assert.deepEqual(
      view.order.map((row) => [row.team.id, row.place]),
      [
        ["lh", 1],
        ["ab", 2],
        ["hh", 3],
        ["na", 4],
        ["jk", null],
        ["sf", null],
        ["rk", null],
        ["ah", null],
      ],
    );
    assert.equal(view.order.find((row) => row.isViewer)?.team.id, "hh");
  });

  it("shows one line when the viewer is king", () => {
    const view = kingFinishedView({ ...GAME, viewerUserId: "lh-1" }, "en");
    assert.equal(view.podium.length, 1);
    assert.equal(view.podium[0]?.mainLine, "You & Mariam Z");
  });

  it("says Not placed for a viewer left out", () => {
    const view = kingFinishedView({ ...GAME, viewerUserId: "rk-1" }, "en");
    assert.equal(view.podium[1]?.mainLine, "Not placed");
  });
});

describe("kingFieldTeams", () => {
  it("is the complete teams before the draw", () => {
    const undrawn = TEAMS.map((item) => ({ ...item, startCourt: null }));
    const half = { ...undrawn[0]!, members: undrawn[0]!.members.slice(0, 1) };
    assert.deepEqual(
      kingFieldTeams([half, ...undrawn.slice(1)]).map((item) => item.id),
      ["ab", "na", "jk", "hh", "sf", "rk", "ah"],
    );
  });

  it("keeps a team that lost a player after the draw, and drops an empty one", () => {
    const half = { ...TEAMS[0]!, members: TEAMS[0]!.members.slice(0, 1) };
    const empty = { ...TEAMS[1]!, members: [] };
    const field = kingFieldTeams([half, empty, ...TEAMS.slice(2)]);
    assert.deepEqual(
      field.map((item) => item.id),
      ["lh", "na", "jk", "hh", "sf", "rk", "ah"],
    );
    const rows = kingStartingCourtRows({
      ...GAME,
      gameTeams: [half, empty, ...TEAMS.slice(2)],
    });
    assert.deepEqual(
      rows[0]?.teams.map((item) => item.id),
      ["lh"],
    );
  });
});

describe("kingHeroStats", () => {
  it("counts the teams and the courts, then the price a player pays", () => {
    assert.deepEqual(
      kingHeroStats(
        { teamsAllowed: 8, pricePerPlayerFils: 3500, sides: [] },
        "en",
      ),
      [
        { value: "8", label: "teams, two a court" },
        { value: "4", label: "courts, 1 is king" },
        { value: "3.500", label: "BD per player" },
      ],
    );
    assert.equal(
      kingHeroStats(
        { teamsAllowed: 8, pricePerPlayerFils: null, sides: [] },
        "en",
      ).length,
      2,
    );
  });
});

describe("kingShareCard", () => {
  it("shares the viewer's place when they have one", () => {
    const card = kingShareCard(GAME, "en");
    assert.equal(card?.kind, "placing");
    if (card?.kind !== "placing") {
      return;
    }
    assert.equal(card.placing, "3rd");
    assert.equal(card.placingNote, "of 8 teams");
    assert.equal(card.team, "Hassan Haji & Khalid Janahi");
    assert.equal(card.record, null);
    assert.deepEqual(card.results, []);
  });

  it("calls the winner king of the court", () => {
    const card = kingShareCard({ ...GAME, viewerUserId: "lh-1" }, "en");
    assert.equal(
      card?.kind === "placing" ? card.placingNote : null,
      "King of the court",
    );
  });

  it("shares the top of the order for someone without a place", () => {
    const card = kingShareCard({ ...GAME, viewerUserId: "organizer" }, "en");
    assert.equal(card?.kind, "table");
    if (card?.kind !== "table") {
      return;
    }
    assert.equal(card.title, "Final order");
    assert.deepEqual(
      card.rows.map((row) => [row.place, row.team]),
      [
        ["1", "Layla Haddad & Mariam Zayani"],
        ["2", "Ahmed Buhazza & Dana Al-Khalifa"],
        ["3", "Hassan Haji & Khalid Janahi"],
        ["4", "Noor Abdulla & Omar Al-Sayed"],
      ],
    );
  });

  it("has nothing to share before the order is posted", () => {
    assert.equal(
      kingShareCard(
        {
          ...GAME,
          gameTeams: TEAMS.map((item) => ({ ...item, finalPlace: null })),
        },
        "en",
      ),
      null,
    );
  });
});

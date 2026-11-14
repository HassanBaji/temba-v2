import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  kingFinishedView,
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
      view.table.map((row) => [row.team.id, row.place]),
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
    assert.equal(view.table.find((row) => row.isViewer)?.team.id, "hh");
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

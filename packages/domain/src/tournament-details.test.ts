import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  MATCH_NOT_PLAYED_LABEL,
  isDrawnTournamentDetails,
  knockoutPlaceSideTags,
  matchTrailing,
  poolRoundGroups,
  tournamentDetailRows,
  tournamentHomeView,
  tournamentPeople,
  tournamentSeatLabel,
  tournamentStandingsView,
  viewerRoundSubtitle,
} from "./tournament-details";
import {
  createKnockoutTournamentFixtures,
  createTournamentFixtures,
} from "./tournament-details-fixtures";
import { KNOCKOUT_CHAMPION_TAG } from "./tournament-knockout-view";

const now = new Date("2026-09-20T12:00:00.000Z");
const pool = createTournamentFixtures(now);
const knockout = createKnockoutTournamentFixtures(now);

describe("isDrawnTournamentDetails", () => {
  it("is true for tournaments and false for Friendly games", () => {
    assert.equal(isDrawnTournamentDetails(pool.postedMid), true);
    assert.equal(
      isDrawnTournamentDetails({
        format: "friendly_game",
        poolCount: null,
        tournamentShape: null,
        registrationMode: "individual",
      }),
      false,
    );
  });
});

describe("tournamentHomeView", () => {
  it("offers a join and a seat to an unseated viewer before the draw", () => {
    const view = tournamentHomeView(pool.preDrawWithoutSeat);
    assert.equal(view.drawn, false);
    assert.equal(view.seated, false);
    assert.equal(view.canJoin, true);
    assert.equal(view.canTakeSeat, true);
    assert.equal(view.canLeaveGame, false);
    assert.match(view.hero.eyebrow, /^Friendly tournament/);
  });

  it("shows the viewer's team and a leave action once seated", () => {
    const view = tournamentHomeView(pool.preDrawSeatedHalfOpen);
    assert.equal(view.seated, true);
    assert.equal(view.canTakeSeat, false);
    assert.equal(view.canLeaveGame, true);
    assert.equal(view.viewerSide?.left?.userId, "user-viewer");
  });

  it("marks a posted draw as drawn", () => {
    assert.equal(tournamentHomeView(pool.postedMid).drawn, true);
  });

  it("flags knockout-only and groups-then-knockout shapes", () => {
    assert.equal(
      tournamentHomeView(knockout.knockoutOnlyMid).knockoutOnly,
      true,
    );
    const groups = tournamentHomeView(knockout.groupsThenKnockout);
    assert.equal(groups.thenKnockout, true);
    assert.equal(groups.knockoutOnly, false);
  });

  it("lists detail rows with the viewer's cost only when seated", () => {
    const seated = tournamentHomeView(pool.preDrawSeatedHalfOpen).detailRows;
    const unseated = tournamentHomeView(pool.preDrawWithoutSeat).detailRows;
    assert.equal(
      unseated.some((row) => row.label === "You owe"),
      false,
    );
    assert.equal(seated[0]?.label, "Organizer");
  });
});

describe("tournamentDetailRows", () => {
  it("falls back for a missing Organizer and Group and omits a free price", () => {
    const rows = tournamentDetailRows({
      organizerName: null,
      groupName: "  ",
      matchMinutes: null,
      pricePerPlayerFils: null,
      seated: false,
      totalFils: null,
    });
    assert.deepEqual(
      rows.map((row) => [row.label, row.value]),
      [
        ["Organizer", "Organizer"],
        ["Group", "—"],
        ["Each Match", "45 min"],
        ["Counts for rating", "Yes"],
      ],
    );
  });

  it("adds Price and You owe when there is a cost", () => {
    const rows = tournamentDetailRows({
      organizerName: "Jonas B",
      groupName: "Bromma",
      matchMinutes: 30,
      pricePerPlayerFils: 12000,
      seated: true,
      totalFils: 36000,
    });
    assert.equal(
      rows.find((row) => row.label === "Price")?.value,
      "12.000 BD per Match",
    );
    assert.equal(
      rows.find((row) => row.label === "You owe")?.value,
      "36.000 BD, after each Match",
    );
  });
});

describe("tournamentPeople", () => {
  it("collects every named person on the Game", () => {
    const names = tournamentPeople(pool.postedMid).map((person) => person.name);
    assert.equal(names.includes("Alex Rivera"), true);
    assert.equal(names.includes("Sam Chen"), true);
  });
});

describe("tournamentStandingsView", () => {
  it("uses the Standings heading and the finished line for a finished Pool", () => {
    const view = tournamentStandingsView(pool.finished);
    assert.equal(view.heading, "Standings");
    assert.equal(view.finished, true);
    assert.equal(view.showPoolTables, true);
    assert.equal(view.showKnockoutTree, false);
    assert.equal(view.championLine, null);
  });

  it("names the Champion for a finished knockout", () => {
    const view = tournamentStandingsView(knockout.knockoutOnlyChampion);
    assert.equal(view.heading, "Knockout");
    assert.equal(view.showKnockoutTree, true);
    assert.equal(view.showPoolTables, false);
    assert.match(view.championLine ?? "", /Alex Rivera/);
  });

  it("tells a viewer who missed the Knockout", () => {
    assert.equal(
      tournamentStandingsView(knockout.groupsThenKnockoutNotThrough).notThrough,
      true,
    );
    assert.equal(
      tournamentStandingsView(knockout.groupsThenKnockout).notThrough,
      false,
    );
    assert.equal(
      tournamentStandingsView(knockout.groupsThenKnockout).knockoutSectionTitle,
      "Knockout",
    );
  });
});

describe("poolRoundGroups", () => {
  it("groups by Round in ascending order", () => {
    const groups = poolRoundGroups([
      { roundNumber: 2, id: "b" },
      { roundNumber: 1, id: "a" },
      { roundNumber: 2, id: "c" },
    ]);
    assert.deepEqual(
      groups.map((group) => [group.roundNumber, group.matches.length]),
      [
        [1, 1],
        [2, 2],
      ],
    );
  });
});

describe("matchTrailing", () => {
  it("prefers not played, then the score, then a draw, then open", () => {
    assert.equal(
      matchTrailing({ cancelled: true, scoreLabel: "6-4" }).label,
      MATCH_NOT_PLAYED_LABEL,
    );
    assert.deepEqual(matchTrailing({ cancelled: false, scoreLabel: "6-4" }), {
      kind: "score",
      label: "6-4",
    });
    assert.equal(
      matchTrailing({
        cancelled: false,
        scoreLabel: null,
        viewerOutcome: "draw",
      }).kind,
      "draw",
    );
    assert.equal(
      matchTrailing({ cancelled: false, scoreLabel: null }).kind,
      "open",
    );
  });
});

describe("viewerRoundSubtitle", () => {
  it("reads Round with an optional day", () => {
    assert.equal(viewerRoundSubtitle(null, null), "Round");
    assert.equal(viewerRoundSubtitle(2, null), "Round 2");
    assert.match(
      viewerRoundSubtitle(2, new Date("2026-09-20T12:00:00.000Z")),
      /^Round 2, /,
    );
  });
});

describe("knockoutPlaceSideTags", () => {
  const places = (knockout.knockoutOnlyChampion.knockout ?? []).flatMap(
    (round) => round.places,
  );
  const final = knockout.knockoutOnlyChampion.knockout?.at(-1)?.places[0];

  it("tags the Final's winner as Champion", () => {
    assert.ok(final && final.kind === "match");
    const tags = [1, 2].map((slot) =>
      knockoutPlaceSideTags(final, slot as 1 | 2, true),
    );
    assert.equal(
      tags.some((tag) => tag.resultTag === KNOCKOUT_CHAMPION_TAG),
      true,
    );
  });

  it("marks the Walkover side", () => {
    const walkover = places.find(
      (place) => place.kind === "match" && place.walkover != null,
    );
    assert.ok(walkover && walkover.kind === "match");
    const slot = walkover.walkover as 1 | 2;
    assert.equal(knockoutPlaceSideTags(walkover, slot, false).walkover, true);
  });
});

describe("tournamentSeatLabel", () => {
  it("offers to take a joinable seat and otherwise names it open", () => {
    assert.equal(
      tournamentSeatLabel({
        position: "left",
        teamLabel: "Team C",
        joinable: true,
      }),
      "Take the left seat on Team C",
    );
    assert.equal(
      tournamentSeatLabel({
        position: "right",
        teamLabel: "Team C",
        joinable: false,
      }),
      "Open right seat on Team C",
    );
  });
});

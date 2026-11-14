import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
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
    const view = tournamentHomeView(pool.preDrawWithoutSeat, "en");
    assert.equal(view.drawn, false);
    assert.equal(view.seated, false);
    assert.equal(view.canJoin, true);
    assert.equal(view.canTakeSeat, true);
    assert.equal(view.canLeaveGame, false);
    assert.match(view.hero.eyebrow, /^Friendly tournament/);
  });

  it("shows the viewer's team and a leave action once seated", () => {
    const view = tournamentHomeView(pool.preDrawSeatedHalfOpen, "en");
    assert.equal(view.seated, true);
    assert.equal(view.canTakeSeat, false);
    assert.equal(view.canLeaveGame, true);
    assert.equal(view.viewerSide?.left?.userId, "user-viewer");
  });

  it("drops the leave action once the draw is posted", () => {
    for (const game of [pool.postedMid, pool.finished]) {
      const seated = { ...game, isSeated: true, canLeave: true };
      assert.equal(tournamentHomeView(seated, "en").canLeaveGame, false);
    }
  });

  it("marks a posted draw as drawn", () => {
    assert.equal(tournamentHomeView(pool.postedMid, "en").drawn, true);
  });

  it("flags knockout-only and groups-then-knockout shapes", () => {
    assert.equal(
      tournamentHomeView(knockout.knockoutOnlyMid, "en").knockoutOnly,
      true,
    );
    const groups = tournamentHomeView(knockout.groupsThenKnockout, "en");
    assert.equal(groups.thenKnockout, true);
    assert.equal(groups.knockoutOnly, false);
  });

  it("lists detail rows with the viewer's cost only when seated", () => {
    const seated = tournamentHomeView(
      pool.preDrawSeatedHalfOpen,
      "en",
    ).detailRows;
    const unseated = tournamentHomeView(
      pool.preDrawWithoutSeat,
      "en",
    ).detailRows;
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
      ratingScope: "temba",
      seated: false,
      totalFils: null,
      locale: "en",
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

  it("reads the rating scope into the Counts for rating row and its note", () => {
    const ratingRow = (ratingScope: "temba" | "group" | "unrated") =>
      tournamentDetailRows({
        organizerName: null,
        groupName: null,
        matchMinutes: null,
        pricePerPlayerFils: null,
        ratingScope,
        seated: false,
        totalFils: null,
        locale: "en",
      }).find((row) => row.label === "Counts for rating");
    assert.deepEqual(ratingRow("temba"), {
      label: "Counts for rating",
      value: "Yes",
    });
    assert.deepEqual(ratingRow("group"), {
      label: "Counts for rating",
      value: "No",
      note: "It counted for a group level, which padel no longer has. It moved no Temba Level.",
    });
    assert.deepEqual(ratingRow("unrated"), {
      label: "Counts for rating",
      value: "No",
      note: "This Game doesn't change anyone's Level.",
    });
  });

  it("adds Price and You owe when there is a cost", () => {
    const rows = tournamentDetailRows({
      organizerName: "Jonas B",
      groupName: "Bromma",
      matchMinutes: 30,
      pricePerPlayerFils: 12000,
      ratingScope: "temba",
      seated: true,
      totalFils: 36000,
      locale: "en",
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
    const view = tournamentStandingsView(pool.finished, "en");
    assert.equal(view.heading, "Standings");
    assert.equal(view.finished, true);
    assert.equal(view.showPoolTables, true);
    assert.equal(view.showKnockoutTree, false);
    assert.equal(view.championLine, null);
  });

  it("names the Champion for a finished knockout", () => {
    const view = tournamentStandingsView(knockout.knockoutOnlyChampion, "en");
    assert.equal(view.heading, "Knockout");
    assert.equal(view.showKnockoutTree, true);
    assert.equal(view.showPoolTables, false);
    assert.match(view.championLine ?? "", /Alex Rivera/);
  });

  it("tells a viewer who missed the Knockout", () => {
    assert.equal(
      tournamentStandingsView(knockout.groupsThenKnockoutNotThrough, "en")
        .notThrough,
      true,
    );
    assert.equal(
      tournamentStandingsView(knockout.groupsThenKnockout, "en").notThrough,
      false,
    );
    assert.equal(
      tournamentStandingsView(knockout.groupsThenKnockout, "en")
        .knockoutSectionTitle,
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
      matchTrailing({ cancelled: true, scoreLabel: "6-4", locale: "en" }).label,
      "Not played",
    );
    assert.deepEqual(
      matchTrailing({ cancelled: false, scoreLabel: "6-4", locale: "en" }),
      {
        kind: "score",
        label: "6-4",
      },
    );
    assert.equal(
      matchTrailing({
        cancelled: false,
        scoreLabel: null,
        viewerOutcome: "draw",
        locale: "en",
      }).kind,
      "draw",
    );
    assert.equal(
      matchTrailing({ cancelled: false, scoreLabel: null, locale: "en" }).kind,
      "open",
    );
  });
});

describe("viewerRoundSubtitle", () => {
  it("reads Round with an optional day", () => {
    assert.equal(viewerRoundSubtitle(null, null, "en"), "Round");
    assert.equal(viewerRoundSubtitle(2, null, "en"), "Round 2");
    assert.match(
      viewerRoundSubtitle(2, new Date("2026-09-20T12:00:00.000Z"), "en"),
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
      knockoutPlaceSideTags(final, slot as 1 | 2, true, "en"),
    );
    assert.equal(
      tags.some((tag) => tag.resultTag === "Champion"),
      true,
    );
  });

  it("marks the Walkover side", () => {
    const walkover = places.find(
      (place) => place.kind === "match" && place.walkover != null,
    );
    assert.ok(walkover && walkover.kind === "match");
    const slot = walkover.walkover as 1 | 2;
    assert.equal(
      knockoutPlaceSideTags(walkover, slot, false, "en").walkover,
      true,
    );
  });
});

describe("tournamentSeatLabel", () => {
  it("offers to take a joinable seat and otherwise names it open", () => {
    assert.equal(
      tournamentSeatLabel({
        position: "left",
        teamLabel: "Team C",
        joinable: true,
        locale: "en",
      }),
      "Take the left seat on Team C",
    );
    assert.equal(
      tournamentSeatLabel({
        position: "right",
        teamLabel: "Team C",
        joinable: false,
        locale: "en",
      }),
      "Open right seat on Team C",
    );
  });
});

describe("tournamentDetailRows, King of the court rating", () => {
  const base = {
    organizerName: "Hassan",
    groupName: "Sunday Social",
    matchMinutes: null,
    pricePerPlayerFils: null,
    seated: true,
    totalFils: null,
    locale: "en",
  } as const;
  const ratingRow = (
    ratingScope: "temba" | "unrated",
    king: Parameters<typeof tournamentDetailRows>[0]["king"],
  ) => tournamentDetailRows({ ...base, ratingScope, king }).at(-1);

  it("says which places count before the final order", () => {
    assert.deepEqual(ratingRow("temba", { finished: false }), {
      label: "Counts for rating",
      value: "Yes, for first to fourth place",
      note: "First place counts as 2 wins against the field, second as 1, third as a half and fourth as a quarter. The field is the average Level of everyone on a court.",
    });
  });

  it("waits out the 24 hours, then shows the viewer's own move", () => {
    assert.equal(
      ratingRow("temba", { finished: true })?.value,
      "Yes, 24 hours after the final order",
    );
    assert.deepEqual(
      ratingRow("temba", {
        finished: true,
        placeAwardsSettled: true,
        viewerPlaceAward: { muBefore: 1700, muAfter: 1775 },
      }),
      {
        label: "Counts for rating",
        value: "Counted for first to fourth place",
        note: "Your Level moved from 3.40 to 3.55.",
      },
    );
    assert.equal(
      ratingRow("temba", { finished: true, placeAwardsSettled: true })?.note,
      undefined,
    );
  });

  it("says no on an Unrated Game", () => {
    assert.equal(ratingRow("unrated", { finished: false })?.value, "No");
    assert.equal(
      ratingRow("unrated", { finished: true })?.value,
      "Not counted",
    );
  });
});

describe("Arabic copy", () => {
  it("reads the detail rows, the standings heading and the seat label in Arabic", () => {
    const rows = tournamentDetailRows({
      organizerName: null,
      groupName: null,
      matchMinutes: null,
      pricePerPlayerFils: null,
      ratingScope: "temba",
      seated: false,
      totalFils: null,
      locale: "ar",
    });
    assert.deepEqual(
      rows.map((row) => [row.label, row.value]),
      [
        ["المنظّم", "المنظّم"],
        ["المجموعة", "—"],
        ["كل مباراة", "45 دقيقة"],
        ["تُحتسب في التصنيف", "نعم"],
      ],
    );
    assert.equal(
      tournamentStandingsView(pool.finished, "ar").heading,
      "الترتيب",
    );
    assert.equal(
      tournamentSeatLabel({
        position: "left",
        teamLabel: "Team C",
        joinable: true,
        locale: "ar",
      }),
      "خذ مكان اليسار في Team C",
    );
  });
});

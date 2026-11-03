import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { messagesFor } from "@repo/i18n/messages";

import { showsFriendlyRoster } from "./game-summary-cta";
import {
  isDrawnTournament,
  poolRoundLabel,
  roundsPlayedLabel,
  showsDrawnTournamentSeats,
} from "./tournament-rounds";
import { sizeFriendlyTournament } from "./tournament-sizing";
import {
  defaultStandingsPoolIndex,
  drawnTournamentProgressLine,
  gameDetailsChrome,
  isTournamentStandingsView,
  tournamentHomeJoinKind,
  otherPoolsPlayedLabel,
  otherPoolsPlayedSummary,
  roundResultsHeading,
  tournamentCollapsedTeamsLabel,
  tournamentEyebrow,
  tournamentFieldSummary,
  tournamentOpenPositionSubline,
  tournamentOrganizerName,
  tournamentRoundCount,
  tournamentSeatsTakenLine,
  tournamentSeatsTakenSrLabel,
  tournamentSizeLine,
  tournamentStartLine,
  tournamentStatusLine,
  knockoutSizeLine,
  tournamentTeamRows,
  tournamentTeamsCountLine,
  tournamentViewerSide,
  type TournamentHomeSide,
} from "./tournament-home";
import type {
  KnockoutViewPlace,
  KnockoutViewRound,
  KnockoutViewSide,
} from "./tournament-knockout-view";

const HOME = messagesFor("en").tournament.home;

const FORBIDDEN = /quarter|knockout|champion|then quarters|message|notified/iu;

const ada = { userId: "ada", name: "Ada Lovelace" };
const sofia = { userId: "sofia", name: "Sofia L" };
const jonas = { userId: "jonas", name: "Jonas B" };
const rashid = { userId: "rashid", name: "Rashid N" };
const kim = { userId: "kim", name: "Kim H" };

function side(
  sideIndex: number,
  left: TournamentHomeSide["left"],
  right: TournamentHomeSide["right"],
): TournamentHomeSide {
  return { sideIndex, left, right };
}

function fullSide(sideIndex: number, leftId: string, rightId: string) {
  return side(
    sideIndex,
    { userId: leftId, name: `L${sideIndex}` },
    { userId: rightId, name: `R${sideIndex}` },
  );
}

describe("gameDetailsChrome", () => {
  it("is exclusive: Friendly game, Pool tournament, and the tabbed page never overlap", () => {
    const cases: [string, number | null, string][] = [
      ["friendly_game", null, "individual"],
      ["friendly_game", 3, "individual"],
      ["friendly_game", null, "team_only"],
      ["friendly_tournament", 3, "individual"],
      ["friendly_tournament", 3, "team_only"],
      ["friendly_tournament", null, "individual"],
      ["americano", 3, "individual"],
      ["americano", null, "team_only"],
    ];

    for (const [format, poolCount, registrationMode] of cases) {
      const friendly = showsFriendlyRoster(format, registrationMode);
      const pool = isDrawnTournament(format, poolCount, null);
      assert.equal(friendly && pool, false);
      const chrome = gameDetailsChrome(
        format,
        poolCount,
        null,
        registrationMode,
      );
      if (friendly) {
        assert.equal(chrome, "friendly_game");
      } else if (pool) {
        assert.equal(chrome, "drawn_tournament");
      } else {
        assert.equal(chrome, "tabs");
      }
    }
  });

  it("does not take Pool chrome for a legacy tournament with a null poolCount", () => {
    assert.equal(
      gameDetailsChrome("friendly_tournament", null, null, "individual"),
      "tabs",
    );
    assert.equal(isDrawnTournament("friendly_tournament", null, null), false);
  });

  it("takes drawn tournament chrome for a Knockout only tournament with no Pools", () => {
    assert.equal(
      gameDetailsChrome(
        "friendly_tournament",
        null,
        "knockout_only",
        "individual",
      ),
      "drawn_tournament",
    );
  });

  it("leaves Americano, team_only, and individual Friendly games off Pool chrome", () => {
    assert.equal(gameDetailsChrome("americano", 3, null, "individual"), "tabs");
    assert.equal(
      gameDetailsChrome("friendly_game", null, null, "team_only"),
      "tabs",
    );
    assert.equal(
      gameDetailsChrome("friendly_game", null, null, "individual"),
      "friendly_game",
    );
  });

  it("takes Pool chrome for a friendly_tournament with a Pool count", () => {
    assert.equal(
      gameDetailsChrome("friendly_tournament", 3, null, "individual"),
      "drawn_tournament",
    );
    assert.equal(
      gameDetailsChrome("friendly_tournament", 3, null, "team_only"),
      "drawn_tournament",
    );
  });
});

describe("tournamentHomeJoinKind", () => {
  it("opens the seat Join only when individual registration can still register", () => {
    assert.equal(tournamentHomeJoinKind("individual", true), "join");
    assert.equal(tournamentHomeJoinKind("individual", false), null);
  });

  it("does not offer a seat Join on a Complete Teams tournament", () => {
    assert.equal(tournamentHomeJoinKind("team_only", true), "register_team");
    assert.equal(
      showsDrawnTournamentSeats("friendly_tournament", 1, null, "team_only"),
      false,
    );
    assert.equal(tournamentHomeJoinKind("team_only", false), null);
  });
});

describe("tournamentFieldSummary", () => {
  it("is empty when no Game teams exist", () => {
    assert.deepEqual(tournamentFieldSummary([]), {
      full: 0,
      halfOpen: 0,
      seatsTaken: 0,
      seatTotal: 0,
    });
  });

  it("counts a full field", () => {
    assert.deepEqual(
      tournamentFieldSummary([fullSide(1, "a", "b"), fullSide(2, "c", "d")]),
      { full: 2, halfOpen: 0, seatsTaken: 4, seatTotal: 4 },
    );
  });

  it("counts a field with one Half team", () => {
    assert.deepEqual(
      tournamentFieldSummary([
        fullSide(1, "a", "b"),
        side(2, ada, null),
        side(3, null, null),
      ]),
      { full: 1, halfOpen: 1, seatsTaken: 3, seatTotal: 6 },
    );
  });

  it("counts a field with two Half teams", () => {
    assert.deepEqual(
      tournamentFieldSummary([
        side(1, ada, null),
        side(2, null, kim),
        fullSide(3, "a", "b"),
      ]),
      { full: 1, halfOpen: 2, seatsTaken: 4, seatTotal: 6 },
    );
  });
});

describe("tournamentTeamRows", () => {
  it("does not collapse a field small enough to show in full", () => {
    const rows = tournamentTeamRows(
      [
        side(1, ada, sofia),
        side(2, jonas, null),
        side(3, null, kim),
        side(4, null, null),
      ],
      ada.userId,
      "en",
    );
    assert.equal(rows.collapsedCount, 0);
    assert.equal(rows.collapsed.length, 0);
    assert.equal(rows.tail.length, 0);
    assert.equal(rows.head.length, 4);
    assert.equal(
      rows.head.some((row) => row.isViewer),
      true,
    );
    assert.equal(
      rows.head.every((row) =>
        row.hasOpenPosition
          ? row.openPosition != null
          : row.openPosition == null,
      ),
      true,
    );
    assert.equal(
      rows.head.find((row) => row.sideIndex === 2)?.openPosition,
      "right",
    );
    assert.equal(
      rows.head.find((row) => row.sideIndex === 2)?.isHalfOpen,
      true,
    );
    assert.equal(
      rows.head.find((row) => row.sideIndex === 3)?.openPosition,
      "left",
    );
    assert.equal(
      rows.head.find((row) => row.sideIndex === 4)?.isHalfOpen,
      false,
    );
  });

  it("collapses the middle run of full Game teams and keeps the viewer in head", () => {
    const sides: TournamentHomeSide[] = [
      side(1, ada, sofia),
      ...Array.from({ length: 10 }, (_, index) =>
        fullSide(index + 2, `l${index}`, `r${index}`),
      ),
      side(12, rashid, null),
      side(13, null, kim),
    ];
    const rows = tournamentTeamRows(sides, ada.userId, "en");
    assert.ok(rows.collapsedCount >= 3);
    assert.equal(rows.collapsed.length, rows.collapsedCount);
    assert.equal(
      rows.head.some((row) => row.isViewer),
      true,
    );
    assert.equal(
      rows.collapsed.some((row) => row.isViewer),
      false,
    );
    assert.equal(
      rows.tail.some((row) => row.isViewer),
      false,
    );
    const openRows = sides.filter(
      (item) => item.left == null || item.right == null,
    );
    for (const item of openRows) {
      const visible = [...rows.head, ...rows.tail].some(
        (row) => row.sideIndex === item.sideIndex,
      );
      assert.equal(visible, true);
      assert.equal(
        rows.collapsed.some((row) => row.sideIndex === item.sideIndex),
        false,
      );
    }
  });

  it("keeps a viewer later in the field in head rather than collapsed", () => {
    const sides: TournamentHomeSide[] = [
      ...Array.from({ length: 8 }, (_, index) =>
        fullSide(index + 1, `l${index}`, `r${index}`),
      ),
      side(9, ada, sofia),
      ...Array.from({ length: 4 }, (_, index) =>
        fullSide(index + 10, `x${index}`, `y${index}`),
      ),
      side(14, rashid, null),
    ];
    const rows = tournamentTeamRows(sides, ada.userId, "en");
    assert.equal(
      rows.head.some((row) => row.isViewer && row.sideIndex === 9),
      true,
    );
    assert.equal(
      rows.collapsed.some((row) => row.isViewer),
      false,
    );
  });

  it("never collapses a Game team with an open Position", () => {
    const sides: TournamentHomeSide[] = [
      ...Array.from({ length: 8 }, (_, index) =>
        fullSide(index + 1, `l${index}`, `r${index}`),
      ),
      side(9, rashid, null),
    ];
    const rows = tournamentTeamRows(sides, "nobody", "en");
    assert.equal(
      rows.collapsed.some((row) => row.hasOpenPosition),
      false,
    );
    const visible = [...rows.head, ...rows.tail];
    assert.equal(
      visible.some((row) => row.sideIndex === 9 && row.hasOpenPosition),
      true,
    );
    assert.equal(
      visible.find((row) => row.sideIndex === 9)?.openPosition,
      "right",
    );
  });
});

function teamsSectionCountLine(sides: readonly TournamentHomeSide[]) {
  const field = tournamentFieldSummary(sides);
  return tournamentTeamsCountLine(field.full, field.halfOpen, "en");
}

function vacantField(teamCount: number): TournamentHomeSide[] {
  return Array.from({ length: teamCount }, (_, index) =>
    side(index + 1, null, null),
  );
}

describe("tournamentTeamsCountLine", () => {
  it("states how many Game teams are full and how many have a Position open", () => {
    assert.equal(
      tournamentTeamsCountLine(11, 2, "en"),
      "11 full, 2 with a Position open",
    );
    assert.equal(
      tournamentTeamsCountLine(1, 1, "en"),
      "1 full, 1 with a Position open",
    );
    assert.equal(tournamentTeamsCountLine(12, 0, "en"), "12 full");
    assert.equal(tournamentTeamsCountLine(0, 0, "en"), "");
    assert.equal(
      tournamentTeamsCountLine(0, 2, "en"),
      "2 with a Position open",
    );
  });

  it("does not read a 0-team tournament as a full field", () => {
    const empty = teamsSectionCountLine([]);
    const vacantSides = vacantField(12);
    const vacant = teamsSectionCountLine(vacantSides);
    const vacantFieldSummary = tournamentFieldSummary(vacantSides);
    const vacantStatus = tournamentStatusLine({
      seated: false,
      seatsLeft:
        Math.max(vacantFieldSummary.seatTotal, 24) -
        vacantFieldSummary.seatsTaken,
      teamCount: 12,
      organizerName: null,
      locale: "en",
    });

    assert.equal(empty, "");
    assert.equal(vacant, "");
    assert.equal(vacantStatus.startsWith("No seats left."), false);
  });
});

describe("tournamentCollapsedTeamsLabel", () => {
  it("names the collapsed run of full Game teams", () => {
    assert.equal(tournamentCollapsedTeamsLabel(6, "en"), "Six more full teams");
  });
});

describe("tournamentSeatsTakenLine", () => {
  it("matches tournamentFieldSummary counts", () => {
    const field = tournamentFieldSummary([
      fullSide(1, "a", "b"),
      side(2, ada, null),
      side(3, null, null),
    ]);
    assert.equal(
      tournamentSeatsTakenLine(field.seatsTaken, field.seatTotal, "en"),
      "3 of 6",
    );
    assert.equal(
      tournamentSeatsTakenSrLabel(field.seatsTaken, field.seatTotal, "en"),
      "3 of 6 seats taken",
    );
  });
});

describe("tournamentOpenPositionSubline", () => {
  it("names the open Position", () => {
    assert.equal(tournamentOpenPositionSubline("left", "en"), "Left seat open");
    assert.equal(
      tournamentOpenPositionSubline("right", "en"),
      "Right seat open",
    );
  });
});

describe("tournamentSizeLine", () => {
  it("names Game teams and groups without a knockout clause", () => {
    const result = sizeFriendlyTournament(12, 3);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(
      tournamentSizeLine(result.sizing, "en"),
      "12 Game teams, 3 groups of 4",
    );
  });

  it("names uneven groups in lowercase", () => {
    const result = sizeFriendlyTournament(10, 3);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    const line = tournamentSizeLine(result.sizing, "en");
    assert.match(line, /10 Game teams/);
    assert.match(line, /groups?/u);
    assert.equal(/\bPool\b/u.test(line), false);
    assert.equal(/\bGroup\b/u.test(line), false);
  });
});

describe("tournamentStatusLine", () => {
  it("tells a seated viewer they are in and that the draw waits for a full field", () => {
    assert.equal(
      tournamentStatusLine({
        seated: true,
        seatsLeft: 5,
        teamCount: 12,
        organizerName: "Jonas B",
        locale: "en",
      }),
      `${HOME.youAreIn} The draw happens once 12 Game teams are full, ${HOME.drawRandomClause}`,
    );
  });

  it("tells an unseated viewer seats left, who draws the groups, and that it is random", () => {
    const line = tournamentStatusLine({
      seated: false,
      seatsLeft: 5,
      teamCount: 12,
      organizerName: "Jonas B",
      locale: "en",
    });
    assert.match(line, /5 seats left/u);
    assert.match(line, /Jonas/u);
    assert.match(line, /groups/u);
    assert.match(line, /random/u);
    assert.equal(/\bPool\b/u.test(line), false);
    assert.equal(/\bGroup\b/u.test(line), false);
  });
});

describe("Knockout only copy", () => {
  it("names the first Knockout round in the size line", () => {
    assert.equal(
      knockoutSizeLine(12, "en"),
      "12 Game teams, knockout from the Round of 16",
    );
    assert.equal(
      knockoutSizeLine(8, "en"),
      "8 Game teams, knockout from the Quarter-finals",
    );
  });

  it("says who draws the knockout instead of the groups", () => {
    const unseated = tournamentStatusLine({
      seated: false,
      seatsLeft: 5,
      teamCount: 12,
      organizerName: "Jonas B",
      knockoutOnly: true,
      locale: "en",
    });
    assert.match(unseated, /Jonas draws the knockout/u);
    assert.equal(/groups?/iu.test(unseated), false);
    const seatedFull = tournamentStatusLine({
      seated: true,
      seatsLeft: 0,
      teamCount: 12,
      organizerName: "Jonas B",
      knockoutOnly: true,
      locale: "en",
    });
    assert.equal(/groups?/iu.test(seatedFull), false);
  });
});

describe("Groups then knockout copy", () => {
  it("ends the size line with where the knockout starts", () => {
    const result = sizeFriendlyTournament(12, 3);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(
      tournamentSizeLine(result.sizing, "en", 3),
      "12 Game teams, 3 groups of 4, then quarters",
    );
    assert.equal(
      tournamentSizeLine(result.sizing, "en", 2),
      "12 Game teams, 3 groups of 4, then semis",
    );
    assert.equal(
      tournamentSizeLine(result.sizing, "en", null),
      "12 Game teams, 3 groups of 4",
    );
  });

  it("says the groups lead to a knockout in the status line", () => {
    const base = {
      seated: false,
      seatsLeft: 5,
      teamCount: 12,
      organizerName: "Jonas B",
      locale: "en" as const,
    };
    assert.equal(
      tournamentStatusLine({ ...base, thenKnockout: true }),
      `${tournamentStatusLine(base)} ${HOME.groupsThenKnockoutLead}`,
    );
    assert.match(
      tournamentStatusLine({ ...base, thenKnockout: true }),
      /Jonas draws the groups.*knockout\.$/u,
    );
  });
});

describe("tournament home after the draw", () => {
  const team = (name: string) => ({
    kind: "team" as const,
    team: { gameTeamId: name, name, isViewer: false },
  });
  function round(
    roundNumber: number,
    name: string,
    places: KnockoutViewPlace[],
  ): KnockoutViewRound {
    return { round: roundNumber, name, places };
  }
  function match(
    slot1: KnockoutViewSide,
    slot2: KnockoutViewSide,
    settled: boolean,
  ): KnockoutViewPlace {
    return {
      kind: "match",
      matchId: null,
      position: 1,
      code: "Q1",
      startTime: null,
      courtName: null,
      slot1,
      slot2,
      winner: settled ? 1 : null,
      walkover: null,
      settled,
      needsDecidingSet: false,
    };
  }
  const placeholder = { kind: "qualifier" as const, label: "A1" };

  it("keeps the Pool Rounds played while the knockout only holds placeholders", () => {
    const rounds = [
      round(1, "Semi-finals", [match(placeholder, placeholder, false)]),
      round(2, "Final", [match({ kind: "open" }, { kind: "open" }, false)]),
    ];
    assert.equal(
      drawnTournamentProgressLine({
        roundsPlayed: "Round 2 of 3 played",
        knockout: rounds,
        locale: "en",
      }),
      "Round 2 of 3 played",
    );
    assert.equal(
      drawnTournamentProgressLine({
        roundsPlayed: "Round 2 of 3 played",
        knockout: null,
        locale: "en",
      }),
      "Round 2 of 3 played",
    );
  });

  it("names the Knockout round now being played once a team is in it", () => {
    const rounds = [
      round(1, "Semi-finals", [
        match(team("Ada / Sam"), team("Kim / Elin"), true),
      ]),
      round(2, "Final", [match(team("Ada / Sam"), placeholder, false)]),
    ];
    assert.equal(
      drawnTournamentProgressLine({
        roundsPlayed: "Round 3 of 3 played",
        knockout: rounds,
        locale: "en",
      }),
      "Now at the Final",
    );
  });

  it("drops the line on a Knockout only tournament once the Final is decided", () => {
    const rounds = [
      round(1, "Final", [match(team("Ada / Sam"), team("Kim / Elin"), true)]),
    ];
    assert.equal(
      drawnTournamentProgressLine({
        roundsPlayed: null,
        knockout: rounds,
        locale: "en",
      }),
      null,
    );
  });
});

describe("Groups only copy does not advertise a knockout or a message", () => {
  it("asserts size, status, and shipped strings have none of the forbidden words", () => {
    const even = sizeFriendlyTournament(12, 3);
    const uneven = sizeFriendlyTournament(10, 3);
    assert.equal(even.ok && uneven.ok, true);
    if (!even.ok || !uneven.ok) {
      return;
    }
    const copy = [
      tournamentSizeLine(even.sizing, "en"),
      tournamentSizeLine(uneven.sizing, "en"),
      tournamentStatusLine({
        seated: true,
        seatsLeft: 4,
        teamCount: 12,
        organizerName: "Jonas B",
        locale: "en",
      }),
      tournamentStatusLine({
        seated: false,
        seatsLeft: 5,
        teamCount: 12,
        organizerName: "Jonas B",
        locale: "en",
      }),
      tournamentStatusLine({
        seated: false,
        seatsLeft: 0,
        teamCount: 12,
        organizerName: null,
        locale: "en",
      }),
      tournamentEyebrow(3, "en"),
      HOME.closingLine,
      HOME.youAreIn,
      HOME.drawRandomClause,
      HOME.drawWhenFull,
      HOME.drawsPoolsWhenFull,
      HOME.eyebrowPrefix,
      HOME.yourTeam,
      HOME.leftSeat,
      HOME.rightSeat,
      HOME.openPositionSr,
      HOME.organizerRow,
      HOME.groupRow,
      HOME.priceRow,
      HOME.countsForRating,
      messagesFor("en").common.yes,
      HOME.youOweRow,
      HOME.youOweAfterEachMatch,
      HOME.inviteAction,
      HOME.inviteFromGroup,
      HOME.leaveTheSeat,
      HOME.pricePerMatch,
      HOME.teamsHeading,
      HOME.takeSeat,
      HOME.yourTeamTag,
      HOME.seatsHeading,
      HOME.yourRoundsPredrawCaption,
      HOME.notDrawn,
    ].join("\n");
    assert.equal(FORBIDDEN.test(copy), false);
  });
});

describe("tournamentEyebrow", () => {
  it("ships Friendly tournament and the Round count", () => {
    assert.equal(tournamentEyebrow(3, "en"), "Friendly tournament, 3 Rounds");
    assert.equal(tournamentEyebrow(1, "en"), "Friendly tournament, 1 Round");
  });

  it("names the knockout instead of counting Rounds on Knockout only", () => {
    assert.equal(
      tournamentEyebrow(4, "en", true),
      "Friendly tournament, knockout",
    );
  });
});

describe("tournamentRoundCount", () => {
  const planned = { teamsAllowed: 12, poolCount: 3, drawPostedAt: null };

  it("resolves the stored count against the planned field before the draw", () => {
    assert.equal(
      tournamentRoundCount({ ...planned, roundCount: null, matches: [] }),
      3,
    );
    const explicit = tournamentRoundCount({
      ...planned,
      roundCount: 5,
      matches: [],
    });
    assert.equal(explicit, 5);
    assert.equal(
      tournamentEyebrow(explicit ?? 0, "en"),
      "Friendly tournament, 5 Rounds",
    );
  });

  it("is null for a tournament without Pools", () => {
    assert.equal(
      tournamentRoundCount({
        teamsAllowed: 12,
        poolCount: null,
        roundCount: null,
        drawPostedAt: null,
        matches: [],
      }),
      null,
    );
  });

  it("reads the posted Matches once the draw is posted", () => {
    const followedSmallerField = tournamentRoundCount({
      ...planned,
      roundCount: null,
      drawPostedAt: new Date("2026-09-20T18:00:00Z"),
      matches: [
        { roundNumber: 1 },
        { roundNumber: 2 },
        { roundNumber: 2 },
        { roundNumber: 1 },
      ],
    });
    assert.equal(followedSmallerField, 2);
    assert.equal(poolRoundLabel(2, followedSmallerField, "en"), "R2 of 2");

    const clamped = tournamentRoundCount({
      ...planned,
      roundCount: 5,
      drawPostedAt: "2026-09-20T18:00:00Z",
      matches: [1, 2, 3, 4].map((roundNumber) => ({ roundNumber })),
    });
    assert.equal(clamped, 4);
    assert.equal(
      roundsPlayedLabel(
        {
          pools: [
            {
              matches: [
                { roundNumber: 1, status: "completed" },
                { roundNumber: 2, status: "scheduled" },
              ],
            },
          ],
        },
        clamped,
        "en",
      ),
      "Round 1 of 4 played",
    );
  });
});

describe("tournamentStartLine", () => {
  it("joins the start day and Venue", () => {
    const start = new Date(2026, 8, 4, 18, 0, 0);
    const line = tournamentStartLine(start, "Padelhuset Bromma", "en");
    assert.match(line ?? "", /Starts /u);
    assert.match(line ?? "", /Padelhuset Bromma/u);
  });
});

describe("tournamentOrganizerName", () => {
  it("resolves the creator from people already on the payload", () => {
    assert.equal(
      tournamentOrganizerName({
        createdBy: jonas.userId,
        people: [ada, jonas, sofia],
      }),
      "Jonas B",
    );
  });

  it("is null when the creator is not on the payload", () => {
    assert.equal(
      tournamentOrganizerName({
        createdBy: "missing",
        people: [ada],
      }),
      null,
    );
  });
});

describe("tournamentViewerSide", () => {
  it("returns the Game team the viewer sits on", () => {
    const sides = [side(1, ada, sofia), side(2, jonas, null)];
    assert.equal(tournamentViewerSide(sides, sofia.userId)?.sideIndex, 1);
    assert.equal(tournamentViewerSide(sides, "nobody"), null);
  });
});

describe("isTournamentStandingsView", () => {
  it("is standings once the draw is posted and pre-draw while it is null", () => {
    assert.equal(
      isTournamentStandingsView(new Date("2026-09-20T18:00:00Z")),
      true,
    );
    assert.equal(isTournamentStandingsView("2026-09-20T18:00:00Z"), true);
    assert.equal(isTournamentStandingsView(null), false);
    assert.equal(isTournamentStandingsView(undefined), false);
  });
});

describe("defaultStandingsPoolIndex", () => {
  const pools = [{ poolIndex: 1 }, { poolIndex: 2 }, { poolIndex: 3 }];

  it("defaults to the viewer's Pool", () => {
    assert.equal(defaultStandingsPoolIndex(2, pools), 2);
  });

  it("falls back to the first Pool when the viewer is in none", () => {
    assert.equal(defaultStandingsPoolIndex(null, pools), 1);
    assert.equal(defaultStandingsPoolIndex(undefined, pools), 1);
    assert.equal(defaultStandingsPoolIndex(9, pools), 1);
  });

  it("is null when there are no Pools", () => {
    assert.equal(defaultStandingsPoolIndex(1, []), null);
  });
});

describe("otherPoolsPlayedSummary", () => {
  const pools = [
    {
      poolIndex: 1,
      label: "group 1",
      matches: [
        { status: "completed" },
        { status: "completed" },
        { status: "scheduled" },
      ],
    },
    {
      poolIndex: 2,
      label: "group 2",
      matches: [{ status: "completed" }, { status: "cancelled" }],
    },
    {
      poolIndex: 3,
      label: "group 3",
      matches: [{ status: "completed" }, { status: "completed" }],
    },
  ];

  it("names the other groups, counts their completed Matches, and moves to the next group", () => {
    assert.deepEqual(otherPoolsPlayedSummary(1, pools, "en"), {
      namesLine: "group 2 and group 3",
      playedLabel: "3 Matches played",
      nextPoolIndex: 2,
    });
    assert.deepEqual(otherPoolsPlayedSummary(2, pools, "en"), {
      namesLine: "group 1 and group 3",
      playedLabel: "4 Matches played",
      nextPoolIndex: 3,
    });
    assert.deepEqual(otherPoolsPlayedSummary(3, pools, "en"), {
      namesLine: "group 1 and group 2",
      playedLabel: "3 Matches played",
      nextPoolIndex: 1,
    });
  });

  it("is null when there is no other Pool to move to", () => {
    assert.equal(
      otherPoolsPlayedSummary(
        1,
        [{ poolIndex: 1, label: "group 1", matches: [] }],
        "en",
      ),
      null,
    );
  });
});

describe("standings copy", () => {
  it("replaces the knockout line with how a Pool tournament ends", () => {
    assert.equal(HOME.standingsHeading, "Standings");
    assert.equal(
      HOME.endsCopy,
      "Each group has a winner. There is no overall champion.",
    );
    assert.equal(roundResultsHeading(2, "en"), "Round 2 results");
    assert.equal(otherPoolsPlayedLabel(1, "en"), "1 Match played");
    assert.equal(otherPoolsPlayedLabel(4, "en"), "4 Matches played");
    assert.equal(HOME.poolsSegment, "groups");
  });

  it("does not say quarter, knockout, then quarters, or Group for a Pool", () => {
    const copy = [
      HOME.standingsHeading,
      HOME.endsCopy,
      HOME.poolsSegment,
      roundResultsHeading(2, "en"),
      otherPoolsPlayedLabel(4, "en"),
      "group 2 and group 3",
    ].join("\n");
    assert.equal(/quarter|knockout|then quarters/iu.test(copy), false);
    assert.equal(/\bGroup\b/u.test(copy), false);
  });
});

describe("Arabic copy", () => {
  it("reads the size line, the status line and the eyebrow in Arabic", () => {
    const result = sizeFriendlyTournament(12, 3);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(
      tournamentSizeLine(result.sizing, "ar"),
      "12 فريقًا، 3 مجموعات من 4",
    );
    assert.equal(
      tournamentStatusLine({
        seated: false,
        seatsLeft: 5,
        teamCount: 12,
        organizerName: "Jonas B",
        locale: "ar",
      }),
      "تبقّت 5 مقاعد. يُجري Jonas قرعة المجموعات عندما تمتلئ الفرق، وهي عشوائية.",
    );
    assert.equal(tournamentEyebrow(3, "ar"), "بطولة ودية، 3 جولات");
    assert.equal(tournamentCollapsedTeamsLabel(6, "ar"), "6 فرق مكتملة أخرى");
  });
});

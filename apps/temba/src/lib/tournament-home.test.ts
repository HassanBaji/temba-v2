import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { showsFriendlyRoster } from "./game-summary-cta";
import { isPoolTournament } from "./tournament-rounds";
import { sizeFriendlyTournament } from "./tournament-sizing";
import {
  COUNTS_FOR_RATING_LABEL,
  COUNTS_FOR_RATING_YES,
  GROUP_ROW_LABEL,
  INVITE_ACTION_LABEL,
  INVITE_FROM_A_GROUP_LABEL,
  LEAVE_THE_SEAT_LABEL,
  LEFT_SEAT_LABEL,
  NOT_DRAWN_TRAILER,
  OPEN_POSITION_SR_LABEL,
  ORGANIZER_ROW_LABEL,
  PRICE_PER_MATCH_SUFFIX,
  PRICE_ROW_LABEL,
  RIGHT_SEAT_LABEL,
  SEATS_HEADING,
  TAKE_SEAT_LABEL,
  TEAMS_HEADING,
  TOURNAMENT_CLOSING_LINE,
  TOURNAMENT_DRAW_RANDOM_CLAUSE,
  TOURNAMENT_DRAW_WHEN_FULL_COPY,
  TOURNAMENT_DRAWS_POOLS_WHEN_FULL_COPY,
  TOURNAMENT_EYEBROW_PREFIX,
  TOURNAMENT_YOU_ARE_IN_COPY,
  YOU_OWE_AFTER_EACH_MATCH,
  YOU_OWE_ROW_LABEL,
  YOUR_ROUNDS_PREDRAW_CAPTION,
  YOUR_TEAM_LABEL,
  YOUR_TEAM_TAG,
  gameDetailsChrome,
  tournamentCollapsedTeamsLabel,
  tournamentEyebrow,
  tournamentFieldSummary,
  tournamentOpenPositionSubline,
  tournamentOrganizerName,
  tournamentSeatsTakenLine,
  tournamentSeatsTakenSrLabel,
  tournamentSizeLine,
  tournamentStartLine,
  tournamentStatusLine,
  tournamentTeamRows,
  tournamentTeamsCountLine,
  tournamentViewerSide,
  type TournamentHomeSide,
} from "./tournament-home";

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
      const pool = isPoolTournament(format, poolCount);
      assert.equal(friendly && pool, false);
      const chrome = gameDetailsChrome(format, poolCount, registrationMode);
      if (friendly) {
        assert.equal(chrome, "friendly_game");
      } else if (pool) {
        assert.equal(chrome, "pool_tournament");
      } else {
        assert.equal(chrome, "tabs");
      }
    }
  });

  it("does not take Pool chrome for a legacy tournament with a null poolCount", () => {
    assert.equal(
      gameDetailsChrome("friendly_tournament", null, "individual"),
      "tabs",
    );
    assert.equal(isPoolTournament("friendly_tournament", null), false);
  });

  it("leaves Americano, team_only, and individual Friendly games off Pool chrome", () => {
    assert.equal(gameDetailsChrome("americano", 3, "individual"), "tabs");
    assert.equal(gameDetailsChrome("friendly_game", null, "team_only"), "tabs");
    assert.equal(
      gameDetailsChrome("friendly_game", null, "individual"),
      "friendly_game",
    );
  });

  it("takes Pool chrome for a friendly_tournament with a Pool count", () => {
    assert.equal(
      gameDetailsChrome("friendly_tournament", 3, "individual"),
      "pool_tournament",
    );
    assert.equal(
      gameDetailsChrome("friendly_tournament", 3, "team_only"),
      "pool_tournament",
    );
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
    const rows = tournamentTeamRows(sides, ada.userId);
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
    const rows = tournamentTeamRows(sides, ada.userId);
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
    const rows = tournamentTeamRows(sides, "nobody");
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

describe("tournamentTeamsCountLine", () => {
  it("states how many Game teams are full and how many have a Position open", () => {
    assert.equal(
      tournamentTeamsCountLine(11, 2),
      "11 full, 2 with a Position open",
    );
    assert.equal(
      tournamentTeamsCountLine(1, 1),
      "1 full, 1 with a Position open",
    );
    assert.equal(tournamentTeamsCountLine(12, 0), "12 full");
  });
});

describe("tournamentCollapsedTeamsLabel", () => {
  it("names the collapsed run of full Game teams", () => {
    assert.equal(tournamentCollapsedTeamsLabel(6), "Six more full teams");
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
      tournamentSeatsTakenLine(field.seatsTaken, field.seatTotal),
      "3 of 6",
    );
    assert.equal(
      tournamentSeatsTakenSrLabel(field.seatsTaken, field.seatTotal),
      "3 of 6 seats taken",
    );
  });
});

describe("tournamentOpenPositionSubline", () => {
  it("names the open Position", () => {
    assert.equal(tournamentOpenPositionSubline("left"), "Left seat open");
    assert.equal(tournamentOpenPositionSubline("right"), "Right seat open");
  });
});

describe("tournamentSizeLine", () => {
  it("names Game teams and Pools without a knockout clause", () => {
    const result = sizeFriendlyTournament(12, 3);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(
      tournamentSizeLine(result.sizing),
      "12 Game teams, 3 Pools of 4",
    );
  });

  it("names uneven Pools as Pools, never Groups", () => {
    const result = sizeFriendlyTournament(10, 3);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    const line = tournamentSizeLine(result.sizing);
    assert.match(line, /10 Game teams/);
    assert.match(line, /Pool/);
    assert.equal(/group/iu.test(line), false);
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
      }),
      `${TOURNAMENT_YOU_ARE_IN_COPY} The draw happens once 12 Game teams are full, ${TOURNAMENT_DRAW_RANDOM_CLAUSE}`,
    );
  });

  it("tells an unseated viewer seats left, who draws the Pools, and that it is random", () => {
    const line = tournamentStatusLine({
      seated: false,
      seatsLeft: 5,
      teamCount: 12,
      organizerName: "Jonas B",
    });
    assert.match(line, /5 seats left/u);
    assert.match(line, /Jonas/u);
    assert.match(line, /Pools/u);
    assert.match(line, /random/u);
    assert.equal(/group/iu.test(line), false);
  });
});

describe("copy does not advertise a knockout or a message", () => {
  it("asserts size, status, and shipped strings have none of the forbidden words", () => {
    const even = sizeFriendlyTournament(12, 3);
    const uneven = sizeFriendlyTournament(10, 3);
    assert.equal(even.ok && uneven.ok, true);
    if (!even.ok || !uneven.ok) {
      return;
    }
    const copy = [
      tournamentSizeLine(even.sizing),
      tournamentSizeLine(uneven.sizing),
      tournamentStatusLine({
        seated: true,
        seatsLeft: 4,
        teamCount: 12,
        organizerName: "Jonas B",
      }),
      tournamentStatusLine({
        seated: false,
        seatsLeft: 5,
        teamCount: 12,
        organizerName: "Jonas B",
      }),
      tournamentStatusLine({
        seated: false,
        seatsLeft: 0,
        teamCount: 12,
        organizerName: null,
      }),
      tournamentEyebrow(3),
      TOURNAMENT_CLOSING_LINE,
      TOURNAMENT_YOU_ARE_IN_COPY,
      TOURNAMENT_DRAW_RANDOM_CLAUSE,
      TOURNAMENT_DRAW_WHEN_FULL_COPY,
      TOURNAMENT_DRAWS_POOLS_WHEN_FULL_COPY,
      TOURNAMENT_EYEBROW_PREFIX,
      YOUR_TEAM_LABEL,
      LEFT_SEAT_LABEL,
      RIGHT_SEAT_LABEL,
      OPEN_POSITION_SR_LABEL,
      ORGANIZER_ROW_LABEL,
      GROUP_ROW_LABEL,
      PRICE_ROW_LABEL,
      COUNTS_FOR_RATING_LABEL,
      COUNTS_FOR_RATING_YES,
      YOU_OWE_ROW_LABEL,
      YOU_OWE_AFTER_EACH_MATCH,
      INVITE_ACTION_LABEL,
      INVITE_FROM_A_GROUP_LABEL,
      LEAVE_THE_SEAT_LABEL,
      PRICE_PER_MATCH_SUFFIX,
      TEAMS_HEADING,
      TAKE_SEAT_LABEL,
      YOUR_TEAM_TAG,
      SEATS_HEADING,
      YOUR_ROUNDS_PREDRAW_CAPTION,
      NOT_DRAWN_TRAILER,
    ].join("\n");
    assert.equal(FORBIDDEN.test(copy), false);
  });
});

describe("tournamentEyebrow", () => {
  it("ships Friendly tournament and the Round count", () => {
    assert.equal(tournamentEyebrow(3), "Friendly tournament, 3 Rounds");
    assert.equal(tournamentEyebrow(1), "Friendly tournament, 1 Round");
  });
});

describe("tournamentStartLine", () => {
  it("joins the start day and Venue", () => {
    const start = new Date(2026, 8, 4, 18, 0, 0);
    const line = tournamentStartLine(start, "Padelhuset Bromma");
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

import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { preferredJoinSeat } from "./preferred-seat";
import {
  DRAW_RANDOM_VALUE,
  DRAW_ROW_LABEL,
  JOIN_SHEET_INTRO_SUFFIX,
  LEAVE_SEAT_UNTIL_POOL_DRAW_COPY,
  PRICE_PER_PLAYER_JOIN_SUFFIX,
  ROUNDS_ROW_LABEL,
  SIT_WITH_SOMEONE_HEADING,
  START_A_TEAM_ON_YOUR_OWN_LABEL,
  START_A_TEAM_ON_YOUR_OWN_SUBLINE,
  TAKE_A_SEAT_TITLE,
  TAKEN_SEAT_LABEL,
  YOUR_SEAT_HEADING,
  isFullyVacantJoinSide,
  isTournamentJoinSheet,
  tournamentJoinDetailRows,
  tournamentJoinHeaderLine,
  tournamentJoinOccupantSubline,
  tournamentJoinResolvedSeat,
  tournamentJoinSeatExplanation,
  tournamentJoinSeatsTakenLine,
  tournamentJoinTakeSeatLabel,
  tournamentSitWithCountLine,
  tournamentJoinOpeningSeat,
  tournamentJoinSheetOpeningStep,
  tournamentStartOwnSeat,
  tournamentYourSeatAvailability,
} from "./tournament-join";

const FORBIDDEN =
  /quarter|knockout|champion|then quarters|message|notified|\bGroup\b/u;

function side(
  sideIndex: number,
  left: { name: string } | null,
  right: { name: string } | null,
) {
  return { sideIndex, left, right };
}

const rashid = { name: "Rashid N" };
const kim = { name: "Kim H" };

describe("isTournamentJoinSheet", () => {
  it("is the Pool tournament branch, not the two-sided Friendly game picker", () => {
    assert.equal(isTournamentJoinSheet("friendly_game", null, 2), false);
    assert.equal(isTournamentJoinSheet("friendly_game", 3, 2), false);
    assert.equal(isTournamentJoinSheet("friendly_tournament", 3, 12), true);
  });

  it("does not take a legacy friendly_tournament with no Pool count and two sides", () => {
    assert.equal(isTournamentJoinSheet("friendly_tournament", null, 2), false);
  });

  it("keeps the existing many-sides tournament list when poolCount is omitted", () => {
    assert.equal(isTournamentJoinSheet("friendly_tournament", null, 4), true);
  });
});

describe("preferredJoinSeat still pre-picks a free Preferred Position", () => {
  it("opens on a Half team when that Position is the free one", () => {
    const sides = [side(1, rashid, null), side(2, null, null)];
    assert.deepEqual(preferredJoinSeat(sides, "right"), {
      sideIndex: 1,
      position: "right",
    });
  });

  it("skips a taken Preferred Position and lands on the next free match", () => {
    const sides = [side(1, rashid, null), side(2, null, null)];
    assert.deepEqual(preferredJoinSeat(sides, "left"), {
      sideIndex: 2,
      position: "left",
    });
  });
});

describe("tournamentYourSeatAvailability", () => {
  it("disables the occupied Position on a Half team and leaves the free one enabled", () => {
    const availability = tournamentYourSeatAvailability(side(1, rashid, null));
    assert.equal(availability.leftTaken, true);
    assert.equal(availability.rightTaken, false);
  });

  it("enables both Positions when starting a team on a fully vacant side", () => {
    const availability = tournamentYourSeatAvailability(side(3, null, null));
    assert.equal(availability.leftTaken, false);
    assert.equal(availability.rightTaken, false);
    assert.equal(isFullyVacantJoinSide(side(3, null, null)), true);
  });

  it("disables both Positions until a Game team is chosen", () => {
    const availability = tournamentYourSeatAvailability(undefined);
    assert.equal(availability.leftTaken, true);
    assert.equal(availability.rightTaken, true);
  });
});

describe("tournamentJoinOpeningSeat", () => {
  function vacantField() {
    return Array.from({ length: 12 }, (_, index) =>
      side(index + 1, null, null),
    );
  }

  it("lets a User join a vacant tournament when Preferred Position is unset", () => {
    const sides = vacantField();
    const opening = tournamentJoinOpeningSeat(sides, null, null);
    assert.deepEqual(opening, { sideIndex: 1, position: "left" });
    const availability = tournamentYourSeatAvailability(
      sides.find((row) => row.sideIndex === opening?.sideIndex),
    );
    assert.equal(availability.leftTaken, false);
    assert.equal(availability.rightTaken, false);
  });

  it("lets a User join a vacant tournament when Preferred Position is either", () => {
    const sides = vacantField();
    const opening = tournamentJoinOpeningSeat(sides, "either", null);
    assert.deepEqual(opening, { sideIndex: 1, position: "left" });
    assert.equal(
      tournamentYourSeatAvailability(
        sides.find((row) => row.sideIndex === opening?.sideIndex),
      ).leftTaken,
      false,
    );
  });

  it("still opens on a Preferred Position when one is set", () => {
    assert.deepEqual(tournamentJoinOpeningSeat(vacantField(), "right", null), {
      sideIndex: 1,
      position: "right",
    });
  });

  it("keeps a Take-seat pick on a named Game team", () => {
    const sides = [side(1, rashid, null), side(2, null, null)];
    assert.deepEqual(
      tournamentJoinOpeningSeat(sides, null, {
        sideIndex: 1,
        position: "right",
      }),
      { sideIndex: 1, position: "right" },
    );
  });
});

describe("tournamentJoinSheetOpeningStep", () => {
  it("opens Join alone / Join with a partner when a vacant side is available", () => {
    assert.equal(
      tournamentJoinSheetOpeningStep({
        offersPartner: true,
        hasInitialSeat: false,
      }),
      "chooser",
    );
  });

  it("hides the partner option when no side is fully vacant", () => {
    assert.equal(
      tournamentJoinSheetOpeningStep({
        offersPartner: false,
        hasInitialSeat: false,
      }),
      "seat",
    );
  });

  it("opens on Sit with someone when Take seat already named a Position", () => {
    assert.equal(
      tournamentJoinSheetOpeningStep({
        offersPartner: true,
        hasInitialSeat: true,
      }),
      "seat",
    );
  });
});

describe("tournamentStartOwnSeat", () => {
  it("picks the lowest-numbered fully vacant side", () => {
    const sides = [
      side(1, rashid, null),
      side(4, null, null),
      side(7, null, null),
    ];
    assert.deepEqual(tournamentStartOwnSeat(sides, "right", null), {
      sideIndex: 4,
      position: "right",
    });
  });

  it("falls back to the current Position, then left, when Preferred Position is not a side", () => {
    const sides = [side(2, null, null)];
    assert.deepEqual(
      tournamentStartOwnSeat(sides, "either", {
        sideIndex: 1,
        position: "right",
      }),
      { sideIndex: 2, position: "right" },
    );
    assert.deepEqual(tournamentStartOwnSeat(sides, null, null), {
      sideIndex: 2,
      position: "left",
    });
  });

  it("is null when every remaining Game team already has an occupant", () => {
    assert.equal(
      tournamentStartOwnSeat(
        [side(1, rashid, null), side(2, null, kim)],
        "left",
        null,
      ),
      null,
    );
  });
});

describe("tournamentJoinResolvedSeat", () => {
  it("keeps a free pick and moves off an occupied Position onto the remaining one", () => {
    const sides = [side(1, rashid, null), side(2, null, null)];
    assert.deepEqual(
      tournamentJoinResolvedSeat(sides, { sideIndex: 1, position: "right" }),
      { sideIndex: 1, position: "right" },
    );
    assert.deepEqual(
      tournamentJoinResolvedSeat(sides, { sideIndex: 1, position: "left" }),
      { sideIndex: 1, position: "right" },
    );
  });
});

describe("tournamentJoinTakeSeatLabel", () => {
  it("names the Position actually being taken", () => {
    assert.equal(tournamentJoinTakeSeatLabel("left"), "Take the Left seat");
    assert.equal(tournamentJoinTakeSeatLabel("right"), "Take the Right seat");
  });
});

describe("tournamentJoinHeaderLine", () => {
  it("names the tournament, the Round count, and the first Round date", () => {
    assert.equal(
      tournamentJoinHeaderLine({
        name: "Bromma Winter Friendly",
        roundCount: 3,
        firstRoundDay: "Thu 25 Sep",
      }),
      `Bromma Winter Friendly, 3 Rounds from Thu 25 Sep. ${JOIN_SHEET_INTRO_SUFFIX}`,
    );
  });
});

describe("tournamentJoin copy", () => {
  it("says Pool, never Group, and never claims anyone was messaged", () => {
    const copy = [
      TAKE_A_SEAT_TITLE,
      SIT_WITH_SOMEONE_HEADING,
      START_A_TEAM_ON_YOUR_OWN_LABEL,
      START_A_TEAM_ON_YOUR_OWN_SUBLINE,
      YOUR_SEAT_HEADING,
      TAKEN_SEAT_LABEL,
      ROUNDS_ROW_LABEL,
      DRAW_ROW_LABEL,
      DRAW_RANDOM_VALUE,
      PRICE_PER_PLAYER_JOIN_SUFFIX,
      JOIN_SHEET_INTRO_SUFFIX,
      LEAVE_SEAT_UNTIL_POOL_DRAW_COPY,
      tournamentJoinSeatsTakenLine(18, 24),
      tournamentSitWithCountLine(2),
      tournamentJoinOccupantSubline({
        occupantPosition: "left",
        levelLabel: "C+",
        openPosition: "right",
      }),
      tournamentJoinSeatExplanation({
        occupantName: "Rashid N",
        occupiedPosition: "left",
        freePosition: "right",
        roundCount: 3,
      }),
      tournamentJoinSeatExplanation({
        occupantName: null,
        occupiedPosition: null,
        freePosition: "left",
        roundCount: 3,
      }),
      tournamentJoinTakeSeatLabel("right"),
      tournamentJoinDetailRows({
        roundDates: ["Thu 25 Sep", "Thu 2 Oct"],
        roundCount: 3,
        priceLabel: "12.00 BD",
      })
        .map((row) => `${row.label} ${row.value}`)
        .join("\n"),
    ].join("\n");
    assert.equal(FORBIDDEN.test(copy), false);
    assert.match(LEAVE_SEAT_UNTIL_POOL_DRAW_COPY, /Pool draw/u);
    assert.equal(DRAW_RANDOM_VALUE, "Random");
  });
});

describe("tournamentJoinDetailRows", () => {
  it("states Rounds, price per player, rating, and a random Draw", () => {
    const rows = tournamentJoinDetailRows({
      roundDates: ["Thu 25 Sep", "Thu 2 Oct", "Sat 11 Oct"],
      roundCount: 3,
      priceLabel: "12.00 BD",
    });
    assert.deepEqual(
      rows.map((row) => row.label),
      [ROUNDS_ROW_LABEL, "Price", "Counts for rating", DRAW_ROW_LABEL],
    );
    assert.equal(rows[0]?.value, "Thu 25 Sep, Thu 2 Oct, Sat 11 Oct");
    assert.equal(rows[1]?.value, "12.00 BD per player");
    assert.equal(rows[2]?.value, "Yes");
    assert.equal(rows[3]?.value, DRAW_RANDOM_VALUE);
  });
});

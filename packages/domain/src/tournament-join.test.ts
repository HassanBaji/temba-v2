import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { messagesFor } from "@repo/i18n/messages";

import { preferredJoinSeat } from "./preferred-seat";
import {
  isFullyVacantJoinSide,
  isTournamentJoinSheet,
  tournamentInviteLandingOpensPartnerSheet,
  tournamentInvitePreviewNeedsSeatPick,
  tournamentJoinDetailRows,
  tournamentJoinHeaderLine,
  tournamentJoinOccupantSubline,
  tournamentJoinOpeningSeat,
  tournamentJoinResolvedSeat,
  tournamentJoinSeatExplanation,
  tournamentJoinSeatsTakenLine,
  tournamentJoinSheetOpeningStep,
  tournamentJoinTakeSeatLabel,
  tournamentLeaveOrKickConfirmCopy,
  tournamentPartnerInviteLandingHref,
  tournamentPartnerVacantSideRaceMessage,
  tournamentShowsTakeSeat,
  tournamentShowsWaitlistCta,
  tournamentSitWithCountLine,
  tournamentStartOwnSeat,
  tournamentYourSeatAvailability,
} from "./tournament-join";
import { resolvePlannedRoundCount } from "./tournament-sizing";

const JOIN = messagesFor("en").tournament.join;

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
    assert.equal(isTournamentJoinSheet("friendly_game", null, null, 2), false);
    assert.equal(isTournamentJoinSheet("friendly_game", 3, null, 2), false);
    assert.equal(
      isTournamentJoinSheet("friendly_tournament", 3, null, 12),
      true,
    );
  });

  it("does not take a legacy friendly_tournament with no Pool count and two sides", () => {
    assert.equal(
      isTournamentJoinSheet("friendly_tournament", null, null, 2),
      false,
    );
    assert.equal(
      isTournamentJoinSheet("friendly_tournament", null, "knockout_only", 2),
      true,
    );
  });

  it("keeps the existing many-sides tournament list when poolCount is omitted", () => {
    assert.equal(
      isTournamentJoinSheet("friendly_tournament", null, null, 4),
      true,
    );
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

  it("opens Pick a partner on partner-required, even when Take seat named a Position", () => {
    assert.equal(
      tournamentJoinSheetOpeningStep({
        offersPartner: true,
        hasInitialSeat: true,
        partnerRequired: true,
      }),
      "partner",
    );
    assert.equal(
      tournamentJoinSheetOpeningStep({
        offersPartner: false,
        hasInitialSeat: false,
        partnerRequired: true,
      }),
      "partner",
    );
  });
});

describe("partner-required join surfaces", () => {
  it("hides Take seat and Join waitlist", () => {
    assert.equal(
      tournamentShowsTakeSeat({
        canJoin: true,
        seated: false,
        partnerRequired: true,
      }),
      false,
    );
    assert.equal(
      tournamentShowsTakeSeat({
        canJoin: true,
        seated: false,
        partnerRequired: false,
      }),
      true,
    );
    assert.equal(
      tournamentShowsWaitlistCta({
        canWaitlist: true,
        partnerRequired: true,
      }),
      false,
    );
    assert.equal(
      tournamentShowsWaitlistCta({
        canWaitlist: true,
        partnerRequired: false,
      }),
      true,
    );
  });

  it("does not tell the User to Join alone after a vacant-side race", () => {
    assert.equal(
      tournamentPartnerVacantSideRaceMessage(true, "en").includes("Join alone"),
      false,
    );
    assert.equal(
      tournamentPartnerVacantSideRaceMessage(true, "en"),
      JOIN.partnerVacantSideRace,
    );
    assert.match(
      tournamentPartnerVacantSideRaceMessage(false, "en"),
      /Join alone/u,
    );
  });

  it("says the partner is unseated too on leave or kick before the draw", () => {
    assert.equal(
      tournamentLeaveOrKickConfirmCopy({
        partnerRequired: true,
        drawPosted: false,
        locale: "en",
      }),
      JOIN.partnerUnseatedConfirm,
    );
    assert.equal(
      tournamentLeaveOrKickConfirmCopy({
        partnerRequired: true,
        drawPosted: true,
        locale: "en",
      }),
      JOIN.leaveSpotConfirm,
    );
    assert.equal(
      tournamentLeaveOrKickConfirmCopy({
        partnerRequired: false,
        drawPosted: false,
        locale: "en",
      }),
      JOIN.leaveSpotConfirm,
    );
  });

  it("lands Invite links on Game home with Pick a partner, not a seat pick", () => {
    assert.equal(
      tournamentPartnerInviteLandingHref("game-1"),
      "/dashboard/games/game-1?join=partner",
    );
    assert.equal(tournamentInviteLandingOpensPartnerSheet("partner"), true);
    assert.equal(tournamentInviteLandingOpensPartnerSheet("seat"), false);
    assert.equal(
      tournamentInvitePreviewNeedsSeatPick({
        isIndividualSeatGame: true,
        blockedByLevelRange: false,
        partnerRequired: true,
      }),
      false,
    );
    assert.equal(
      tournamentInvitePreviewNeedsSeatPick({
        isIndividualSeatGame: true,
        blockedByLevelRange: false,
        partnerRequired: false,
      }),
      true,
    );
    assert.equal(JOIN.partnerInviteLanding.includes("Join alone"), false);
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
    assert.equal(
      tournamentJoinTakeSeatLabel("left", "en"),
      "Take the Left seat",
    );
    assert.equal(
      tournamentJoinTakeSeatLabel("right", "en"),
      "Take the Right seat",
    );
  });
});

describe("tournamentJoinHeaderLine", () => {
  it("names the tournament, the Round count, and the first Round date", () => {
    assert.equal(
      tournamentJoinHeaderLine({
        name: "Bromma Winter Friendly",
        roundCount: 3,
        firstRoundDay: "Thu 25 Sep",
        locale: "en",
      }),
      `Bromma Winter Friendly, 3 Rounds from Thu 25 Sep. ${JOIN.introSuffix}`,
    );
  });

  it("shows the resolved Round count for a tournament created with 5 Rounds", () => {
    const roundCount = resolvePlannedRoundCount(12, 3, 5);
    assert.equal(
      tournamentJoinHeaderLine({
        name: "Bromma Winter Friendly",
        roundCount,
        firstRoundDay: "Thu 25 Sep",
        locale: "en",
      }),
      `Bromma Winter Friendly, 5 Rounds from Thu 25 Sep. ${JOIN.introSuffix}`,
    );
    assert.equal(
      tournamentJoinSeatExplanation({
        occupantName: null,
        occupiedPosition: null,
        freePosition: "left",
        roundCount,
        locale: "en",
      }),
      "Both Positions are open. You pick Left or Right for all 5 Rounds.",
    );
    assert.equal(
      tournamentJoinDetailRows({
        roundDates: [],
        roundCount,
        priceLabel: null,
        locale: "en",
      })[0]?.value,
      "5 Rounds",
    );
  });

  it("keeps the suggested count for a tournament without a stored count", () => {
    assert.equal(
      tournamentJoinHeaderLine({
        name: "Bromma Winter Friendly",
        roundCount: resolvePlannedRoundCount(12, 3, null),
        firstRoundDay: null,
        locale: "en",
      }),
      `Bromma Winter Friendly, 3 Rounds. ${JOIN.introSuffix}`,
    );
  });
});

describe("tournamentJoin copy", () => {
  it("says group, never Group, and never claims anyone was messaged", () => {
    const copy = [
      JOIN.takeASeatTitle,
      JOIN.sitWithSomeone,
      JOIN.startATeam,
      JOIN.startATeamSubline,
      JOIN.yourSeat,
      JOIN.taken,
      JOIN.roundsRow,
      JOIN.drawRow,
      JOIN.drawRandom,
      JOIN.pricePerPlayer,
      JOIN.introSuffix,
      JOIN.leaveSeatUntilPoolDraw,
      JOIN.leaveSpotConfirm,
      JOIN.partnerUnseatedConfirm,
      JOIN.partnerVacantSideRace,
      JOIN.partnerInviteLanding,
      tournamentJoinSeatsTakenLine(18, 24, "en"),
      tournamentSitWithCountLine(2, "en"),
      tournamentJoinOccupantSubline({
        occupantPosition: "left",
        levelLabel: "C+",
        openPosition: "right",
        locale: "en",
      }),
      tournamentJoinSeatExplanation({
        occupantName: "Rashid N",
        occupiedPosition: "left",
        freePosition: "right",
        roundCount: 3,
        locale: "en",
      }),
      tournamentJoinSeatExplanation({
        occupantName: null,
        occupiedPosition: null,
        freePosition: "left",
        roundCount: 3,
        locale: "en",
      }),
      tournamentJoinTakeSeatLabel("right", "en"),
      tournamentJoinDetailRows({
        roundDates: ["Thu 25 Sep", "Thu 2 Oct"],
        roundCount: 3,
        priceLabel: "12.00 BD",
        locale: "en",
      })
        .map((row) => `${row.label} ${row.value}`)
        .join("\n"),
    ].join("\n");
    assert.equal(FORBIDDEN.test(copy), false);
    assert.match(JOIN.leaveSeatUntilPoolDraw, /group draw/u);
    assert.equal(JOIN.drawRandom, "Random");
  });
});

describe("tournamentJoinDetailRows", () => {
  it("states Rounds, price per player, rating, and a random Draw", () => {
    const rows = tournamentJoinDetailRows({
      roundDates: ["Thu 25 Sep", "Thu 2 Oct", "Sat 11 Oct"],
      roundCount: 3,
      priceLabel: "12.00 BD",
      locale: "en",
    });
    assert.deepEqual(
      rows.map((row) => row.label),
      [JOIN.roundsRow, "Price", "Counts for rating", JOIN.drawRow],
    );
    assert.equal(rows[0]?.value, "Thu 25 Sep, Thu 2 Oct, Sat 11 Oct");
    assert.equal(rows[1]?.value, "12.00 BD per player");
    assert.equal(rows[2]?.value, "Yes");
    assert.equal(rows[3]?.value, JOIN.drawRandom);
  });
});

describe("Arabic copy", () => {
  it("reads the header line and the seat explanation in Arabic", () => {
    assert.equal(
      tournamentJoinHeaderLine({
        name: "Bromma Winter Friendly",
        roundCount: 3,
        firstRoundDay: "الخميس 25 سبتمبر",
        locale: "ar",
      }),
      "Bromma Winter Friendly، 3 جولات من الخميس 25 سبتمبر. مثل الانضمام إلى مباراة، لكنك تختار من تلعب معه.",
    );
    assert.equal(
      tournamentJoinSeatExplanation({
        occupantName: "Rashid N",
        occupiedPosition: "left",
        freePosition: "right",
        roundCount: 3,
        locale: "ar",
      }),
      "Rashid في جهة اليسار، فتأخذ أنت جهة اليمين طوال 3 جولات.",
    );
    assert.equal(
      tournamentJoinTakeSeatLabel("right", "ar"),
      "خذ المكان الأيمن",
    );
  });
});

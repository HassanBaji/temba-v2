import { bahrainDate } from "./bahrain-date.test-support";
import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { formatGameClock } from "./format-game-start";
import {
  homeTournamentMatchActionLabel,
  isTournamentMatchRow,
  showsTournamentOpenFlag,
  tournamentCardAction,
  tournamentCardActionLabel,
  tournamentCardBandMeta,
  tournamentCardDateLine,
  tournamentCardKnockoutLine,
  tournamentCardPairs,
  tournamentOpenFlagLabel,
  tournamentOpenTeamCount,
  tournamentTeamPairLabel,
  tournamentMatchAction,
  tournamentMatchActionLabel,
  tournamentMatchGroupLabel,
  tournamentMatchGroupStanding,
  tournamentMatchHeadline,
  tournamentMatchKickoffLine,
  tournamentMatchLastResultLine,
  tournamentMatchRoundLabel,
  tournamentMatchRoundLine,
  tournamentMatchRoundsLeftLine,
  tournamentMatchStandingLine,
  tournamentMatchStatus,
  tournamentMatchup,
  tournamentMatchupName,
  tournamentMatchVenueLine,
  tournamentTeamsLine,
  type TournamentCardInput,
  type TournamentCardKnockout,
  type TournamentCardTeam,
  type TournamentPoolMatch,
} from "./tournament-card";

const NO_POOL_OR_ROUND_COPY =
  /\bgroups?\b|\bpools?\b|\bR\d|\bRounds?\b(?! of)/iu;

function knockout(
  overrides: Partial<TournamentCardKnockout> = {},
): TournamentCardKnockout {
  return {
    roundCount: 3,
    currentRoundName: null,
    champion: null,
    ...overrides,
  };
}

const ADA = { name: "Ada Lovelace", isViewer: false };
const SAM = { name: "Sam Chen", isViewer: false };
const YOU = { name: "Alex Rivera", isViewer: true };

function team(overrides: Partial<TournamentCardTeam> = {}): TournamentCardTeam {
  return {
    isViewerTeam: false,
    poolIndex: null,
    left: ADA,
    right: SAM,
    ...overrides,
  };
}

function game(
  overrides: Partial<TournamentCardInput> = {},
  teams: TournamentCardTeam[] = [],
  drawPosted = false,
): TournamentCardInput {
  return {
    format: "friendly_tournament",
    registrationMode: "individual",
    canRegister: false,
    canWaitlist: false,
    joinFrozen: false,
    isRegistered: false,
    isSeated: false,
    isWaitlisted: false,
    registrationStatus: "open",
    registeredTeamCount: teams.length,
    teamsAllowed: 12,
    poolCount: 3,
    tournament: { drawPosted, teams },
    ...overrides,
  };
}

describe("tournamentCardDateLine", () => {
  it("spans a multi-day window", () => {
    assert.equal(
      tournamentCardDateLine(
        bahrainDate(2025, 8, 25, 18),
        bahrainDate(2025, 9, 11, 21),
      ),
      "Thu 25 Sep to Sat 11 Oct",
    );
  });

  it("shows the hours for a one-day window", () => {
    const start = bahrainDate(2025, 8, 25, 18);
    const end = bahrainDate(2025, 8, 25, 22);
    assert.equal(
      tournamentCardDateLine(start, end),
      `Thu 25 Sep, ${formatGameClock(start)} – ${formatGameClock(end)}`,
    );
  });

  it("reads From when the window has no end", () => {
    assert.equal(
      tournamentCardDateLine(bahrainDate(2025, 8, 25, 18), null),
      "From Thu 25 Sep",
    );
    assert.equal(tournamentCardDateLine(null, null), null);
  });
});

describe("tournamentCardBandMeta", () => {
  it("names the Round count and never the rating", () => {
    assert.equal(tournamentCardBandMeta(3), "3 Rounds");
    assert.equal(tournamentCardBandMeta(1), "1 Round");
    assert.equal(tournamentCardBandMeta(null), null);
  });

  it("names the knockout only when the Tournament shape has one", () => {
    const shape = (tournamentShape: string | null) => ({
      format: "friendly_tournament",
      tournamentShape,
    });
    assert.equal(tournamentCardBandMeta(3, shape(null)), "3 Rounds");
    assert.equal(tournamentCardBandMeta(3, shape("groups_only")), "3 Rounds");
    assert.equal(
      tournamentCardBandMeta(3, shape("groups_then_knockout")),
      "3 Rounds, then knockout",
    );
    assert.equal(tournamentCardBandMeta(3, shape("knockout_only")), "Knockout");
    assert.equal(
      tournamentCardBandMeta(null, shape("knockout_only")),
      "Knockout",
    );
  });
});

describe("tournamentOpenTeamCount", () => {
  it("counts half teams as open", () => {
    const teams = [team(), team({ right: null }), team({ left: null })];
    assert.equal(tournamentOpenTeamCount(4, teams), 3);
    assert.equal(tournamentOpenFlagLabel(3), "3 open");
  });

  it("reads Full when every team is complete", () => {
    assert.equal(tournamentOpenTeamCount(2, [team(), team()]), 0);
    assert.equal(tournamentOpenFlagLabel(0), "Full");
  });
});

describe("showsTournamentOpenFlag", () => {
  it("hides after the draw and when registration is closed or cancelled", () => {
    assert.equal(showsTournamentOpenFlag(game()), true);
    assert.equal(showsTournamentOpenFlag(game({}, [], true)), false);
    assert.equal(
      showsTournamentOpenFlag(game({ registrationStatus: "closed" })),
      false,
    );
    assert.equal(
      showsTournamentOpenFlag(game({ registrationStatus: "cancelled" })),
      false,
    );
  });
});

describe("tournamentTeamsLine", () => {
  it("counts teams in before the draw", () => {
    assert.equal(
      tournamentTeamsLine(game({ registeredTeamCount: 9 })),
      "9 of 12 teams in",
    );
  });

  it("counts drawn teams and groups after the draw", () => {
    const teams = [
      team({ poolIndex: 1 }),
      team({ poolIndex: 1 }),
      team({ poolIndex: 2 }),
      team({ poolIndex: 2 }),
    ];
    assert.equal(
      tournamentTeamsLine(game({}, teams, true)),
      "4 teams, 2 groups",
    );
    assert.equal(
      tournamentTeamsLine(game({}, teams.slice(0, 2), true)),
      "2 teams, 1 group",
    );
  });

  it("ends with where the knockout starts on Groups then knockout", () => {
    const teams = Array.from({ length: 12 }, (_, index) =>
      team({ poolIndex: (index % 3) + 1 }),
    );
    const drawn = (roundCount: number | null) =>
      game(
        {
          tournamentShape: "groups_then_knockout",
          tournament: {
            drawPosted: true,
            teams,
            knockout: knockout({ roundCount }),
          },
        },
        teams,
        true,
      );
    assert.equal(
      tournamentTeamsLine(drawn(3)),
      "12 teams, 3 groups, then quarters",
    );
    assert.equal(
      tournamentTeamsLine(drawn(2)),
      "12 teams, 3 groups, then semis",
    );
    assert.equal(
      tournamentTeamsLine(drawn(1)),
      "12 teams, 3 groups, then the final",
    );
    assert.equal(
      tournamentTeamsLine(drawn(4)),
      "12 teams, 3 groups, then the round of 16",
    );
  });

  it("names no group on a drawn Knockout only tournament", () => {
    const teams = Array.from({ length: 8 }, () => team());
    const line = tournamentTeamsLine(
      game(
        {
          poolCount: null,
          tournamentShape: "knockout_only",
          tournament: {
            drawPosted: true,
            teams,
            knockout: knockout({ roundCount: 3 }),
          },
        },
        teams,
        true,
      ),
    );
    assert.equal(line, "8 teams, knockout");
    assert.doesNotMatch(line, NO_POOL_OR_ROUND_COPY);
  });
});

describe("tournamentCardKnockoutLine", () => {
  function drawn(
    tournamentShape: string | null,
    overrides: Partial<TournamentCardKnockout> = {},
    drawPosted = true,
  ) {
    return game({
      tournamentShape,
      tournament: {
        drawPosted,
        teams: [],
        knockout: knockout(overrides),
      },
    });
  }

  it("names the Knockout round now being played", () => {
    assert.equal(
      tournamentCardKnockoutLine(
        drawn("knockout_only", { currentRoundName: "Semi-finals" }),
      ),
      "Now at the Semi-finals",
    );
    assert.equal(
      tournamentCardKnockoutLine(
        drawn("groups_then_knockout", { currentRoundName: "Quarter-finals" }),
      ),
      "Now at the Quarter-finals",
    );
  });

  it("names the Champion once the Final is decided", () => {
    assert.equal(
      tournamentCardKnockoutLine(
        drawn("knockout_only", { champion: "Ada Lovelace / Sam Chen" }),
      ),
      "Champion: Ada Lovelace / Sam Chen",
    );
  });

  it("is null before the draw, between stages and on Groups only", () => {
    assert.equal(
      tournamentCardKnockoutLine(
        drawn("knockout_only", { currentRoundName: "Final" }, false),
      ),
      null,
    );
    assert.equal(
      tournamentCardKnockoutLine(drawn("groups_then_knockout")),
      null,
    );
    assert.equal(
      tournamentCardKnockoutLine(
        drawn(null, { currentRoundName: "Final", champion: "Ada / Sam" }),
      ),
      null,
    );
    assert.equal(tournamentCardKnockoutLine(game({}, [], true)), null);
  });
});

describe("tournamentCardPairs", () => {
  it("shows at most four pairs and counts the remaining teams", () => {
    const teams = Array.from({ length: 7 }, () => team());
    const pairs = tournamentCardPairs(teams);
    assert.equal(pairs.shown.length, 4);
    assert.equal(pairs.remaining, 3);
  });

  it("skips teams without an occupant", () => {
    const pairs = tournamentCardPairs([
      team({ left: null, right: null }),
      team(),
    ]);
    assert.equal(pairs.shown.length, 1);
    assert.equal(pairs.remaining, 0);
  });

  it("fills the free pair slots with placeholders while registration is open", () => {
    const teams = [team(), team(), team()];
    assert.equal(
      tournamentCardPairs(teams, { teamsAllowed: 8, registrationOpen: true })
        .placeholders,
      1,
    );
    assert.equal(
      tournamentCardPairs([], { teamsAllowed: 2, registrationOpen: true })
        .placeholders,
      2,
    );
    assert.equal(
      tournamentCardPairs([team({ right: null })], {
        teamsAllowed: 1,
        registrationOpen: true,
      }).placeholders,
      0,
    );
  });

  it("shows no placeholders once registration is not open", () => {
    const pairs = tournamentCardPairs([team()], {
      teamsAllowed: 8,
      registrationOpen: false,
    });
    assert.equal(pairs.placeholders, 0);
  });
});

describe("tournamentTeamPairLabel", () => {
  it("names the viewer as You and an empty Position as open", () => {
    assert.equal(
      tournamentTeamPairLabel(team({ left: YOU, right: null })),
      "You and open seat",
    );
    assert.equal(tournamentTeamPairLabel(team()), "Ada and Sam");
  });
});

describe("tournamentCardAction", () => {
  it("offers Join tournament when the viewer can register before the draw", () => {
    const action = tournamentCardAction(game({ canRegister: true }));
    assert.equal(action, "join");
    assert.equal(tournamentCardActionLabel(action), "Join tournament");
  });

  it("offers Join waitlist when the tournament is full", () => {
    assert.equal(
      tournamentCardAction(
        game({ canWaitlist: true, registrationStatus: "full" }),
      ),
      "join_waitlist",
    );
  });

  it("offers Invite a partner when the viewer sits on a half team", () => {
    const action = tournamentCardAction(
      game({ isSeated: true, isRegistered: true }, [
        team({ isViewerTeam: true, left: YOU, right: null }),
      ]),
    );
    assert.equal(action, "invite_partner");
    assert.equal(tournamentCardActionLabel(action), "Invite a partner");
  });

  it("falls back to View tournament", () => {
    assert.equal(
      tournamentCardAction(
        game({ isSeated: true, isRegistered: true }, [
          team({ isViewerTeam: true, left: YOU }),
        ]),
      ),
      "view",
    );
    assert.equal(
      tournamentCardAction(game({ canRegister: true }, [], true)),
      "view",
    );
    assert.equal(tournamentCardActionLabel("view"), "View tournament");
  });

  it("shows View tournament when the Level range or a Soft-archive blocks joining", () => {
    assert.equal(tournamentCardAction(game({ canRegister: false })), "view");
    assert.equal(
      tournamentCardAction(game({ canRegister: true, joinFrozen: true })),
      "view",
    );
    assert.equal(
      tournamentCardAction(
        game({ isSeated: true, joinFrozen: true }, [
          team({ isViewerTeam: true, left: YOU, right: null }),
        ]),
      ),
      "view",
    );
  });
});

function poolMatch(
  overrides: Partial<TournamentPoolMatch> = {},
): TournamentPoolMatch {
  return {
    poolLabel: "1",
    poolSize: 4,
    viewerPosition: null,
    lastResult: null,
    ...overrides,
  };
}

describe("tournamentMatchRoundLine", () => {
  it("names the Round and the viewer's group", () => {
    assert.equal(tournamentMatchRoundLine(2, poolMatch()), "Round 2, group 1");
  });

  it("falls back to the group alone without a Round", () => {
    assert.equal(tournamentMatchRoundLine(null, poolMatch()), "Group 1");
  });

  it("is null without a Round or a group", () => {
    assert.equal(tournamentMatchRoundLine(null, null), null);
  });

  it("names a Knockout Match by its Knockout round, without a group", () => {
    assert.equal(
      tournamentMatchRoundLine(null, null, { round: 1, roundCount: 3 }),
      "Quarter-final",
    );
    assert.equal(
      tournamentMatchRoundLine(null, null, { round: 2, roundCount: 3 }),
      "Semi-final",
    );
    assert.equal(
      tournamentMatchRoundLine(null, null, { round: 3, roundCount: 3 }),
      "Final",
    );
    assert.equal(
      tournamentMatchRoundLine(null, null, { round: 1, roundCount: 4 }),
      "Round of 16",
    );
  });
});

describe("tournamentMatchRoundLabel", () => {
  it("counts Pool Rounds on a Pool Match", () => {
    assert.equal(
      tournamentMatchRoundLabel({ roundNumber: 2, roundCount: 3 }),
      "R2 of 3",
    );
    assert.equal(
      tournamentMatchRoundLabel({
        roundNumber: 3,
        roundCount: 3,
        knockoutMatch: null,
      }),
      "R3 of 3",
    );
  });

  it("names a Knockout Match instead of numbering it", () => {
    assert.equal(
      tournamentMatchRoundLabel({
        roundNumber: null,
        roundCount: null,
        knockoutMatch: { round: 2, roundCount: 3 },
      }),
      "Semi-final",
    );
  });
});

describe("tournamentMatchVenueLine", () => {
  it("joins venue and court", () => {
    assert.equal(
      tournamentMatchVenueLine("Padelhuset Bromma", "Court 2"),
      "Padelhuset Bromma, Court 2",
    );
  });

  it("omits a missing court", () => {
    assert.equal(
      tournamentMatchVenueLine("Padelhuset Bromma", null),
      "Padelhuset Bromma",
    );
  });
});

describe("tournamentMatchStandingLine", () => {
  it("gives the viewer's ordinal once their team has played", () => {
    assert.equal(
      tournamentMatchStandingLine(poolMatch({ viewerPosition: 2 })),
      "2nd in group 1",
    );
    assert.equal(
      tournamentMatchStandingLine(poolMatch({ viewerPosition: 1 })),
      "1st in group 1",
    );
  });

  it("falls back to the group size before the viewer's team has played", () => {
    assert.equal(tournamentMatchStandingLine(poolMatch()), "Group 1, 4 teams");
  });

  it("is null without Pool data", () => {
    assert.equal(tournamentMatchStandingLine(null), null);
  });

  it("never uses knockout copy on a Groups only tournament", () => {
    const line = tournamentMatchStandingLine(poolMatch({ viewerPosition: 2 }));
    assert.doesNotMatch(line ?? "", /go through|quarter/i);
  });
});

describe("tournamentMatchLastResultLine", () => {
  it("shows a win with the viewer's set scores", () => {
    assert.equal(
      tournamentMatchLastResultLine({
        roundNumber: 1,
        outcome: "won",
        viewerSets: [
          { viewer: 6, opponent: 3 },
          { viewer: 6, opponent: 4 },
        ],
      }),
      "Won R1, 6-3 6-4",
    );
  });

  it("shows a loss from the viewer's side", () => {
    assert.equal(
      tournamentMatchLastResultLine({
        roundNumber: 1,
        outcome: "lost",
        viewerSets: [
          { viewer: 4, opponent: 6 },
          { viewer: 3, opponent: 6 },
        ],
      }),
      "Lost R1, 4-6 3-6",
    );
  });

  it("shows a draw and a cancelled Round without scores", () => {
    assert.equal(
      tournamentMatchLastResultLine({
        roundNumber: 2,
        outcome: "draw",
        viewerSets: [
          { viewer: 6, opponent: 4 },
          { viewer: 4, opponent: 6 },
        ],
      }),
      "Drew R2",
    );
    assert.equal(
      tournamentMatchLastResultLine({
        roundNumber: 1,
        outcome: "cancelled",
        viewerSets: [],
      }),
      "R1 cancelled",
    );
  });

  it("is omitted when there is no result", () => {
    assert.equal(tournamentMatchLastResultLine(null), null);
  });
});

describe("tournamentMatchup", () => {
  const mine = { left: SAM, right: YOU };
  const theirs = { left: ADA, right: { name: "Kim Ho", isViewer: false } };

  it("puts the viewer's team first whichever slot it sits in", () => {
    assert.deepEqual(tournamentMatchup([theirs, mine]), {
      viewer: mine,
      opponent: theirs,
    });
  });

  it("labels the viewer's pair with You and the partner", () => {
    assert.equal(tournamentMatchupName(mine), "You and Sam C");
  });

  it("labels opponents by first name and initial", () => {
    assert.equal(tournamentMatchupName(theirs), "Ada L and Kim H");
  });

  it("never names a vacant Position", () => {
    assert.equal(tournamentMatchupName({ left: YOU, right: null }), "You");
    assert.equal(tournamentMatchupName({ left: null, right: ADA }), "Ada L");
    assert.equal(tournamentMatchupName({ left: null, right: null }), null);
  });
});

describe("isTournamentMatchRow", () => {
  it("is true only for an expanded drawn tournament Match row", () => {
    assert.equal(
      isTournamentMatchRow({
        format: "friendly_tournament",
        poolCount: 1,
        matchId: "match-1",
      }),
      true,
    );
    assert.equal(
      isTournamentMatchRow({
        format: "friendly_tournament",
        poolCount: 1,
        matchId: null,
      }),
      false,
    );
    assert.equal(
      isTournamentMatchRow({
        format: "friendly_tournament",
        poolCount: null,
        matchId: "match-1",
      }),
      false,
    );
    assert.equal(
      isTournamentMatchRow({
        format: "friendly_game",
        poolCount: null,
        matchId: null,
      }),
      false,
    );
  });

  it("is true for an expanded Knockout only Match row", () => {
    assert.equal(
      isTournamentMatchRow({
        format: "friendly_tournament",
        poolCount: null,
        tournamentShape: "knockout_only",
        matchId: "match-1",
      }),
      true,
    );
    assert.equal(
      isTournamentMatchRow({
        format: "friendly_tournament",
        poolCount: null,
        tournamentShape: "knockout_only",
        matchId: null,
      }),
      false,
    );
  });
});

describe("tournamentMatchStatus", () => {
  it("counts down while upcoming and without a Home phase", () => {
    assert.equal(tournamentMatchStatus("upcoming", "in 2h 0m"), "in 2h 0m");
    assert.equal(tournamentMatchStatus(undefined, "in 1 day"), "in 1 day");
    assert.equal(tournamentMatchStatus("upcoming", null), null);
  });

  it("shows the Home phase once the Match has started", () => {
    assert.equal(tournamentMatchStatus("ongoing", null), "Playing now");
    assert.equal(tournamentMatchStatus("needs_results", null), "Add results");
  });
});

describe("tournamentMatchAction", () => {
  it("offers Add results only when results are due and the viewer can add them", () => {
    assert.equal(tournamentMatchAction("needs_results", true), "add_results");
    assert.equal(tournamentMatchAction("needs_results", false), "view");
    assert.equal(tournamentMatchAction("ongoing", true), "view");
    assert.equal(tournamentMatchAction("upcoming", false), "view");
    assert.equal(tournamentMatchAction(undefined, false), "view");
  });

  it("labels each action", () => {
    assert.equal(tournamentMatchActionLabel("add_results"), "Add results");
    assert.equal(tournamentMatchActionLabel("view"), "View tournament");
  });
});

describe("tournamentMatchHeadline", () => {
  it("leads with the Round and the day word", () => {
    assert.equal(tournamentMatchHeadline(2, "tonight"), "Round 2, tonight");
    assert.equal(tournamentMatchHeadline(3, "Thu 2 Oct"), "Round 3, Thu 2 Oct");
  });

  it("falls back to the day word alone without a Round", () => {
    assert.equal(tournamentMatchHeadline(null, "tomorrow"), "Tomorrow");
  });

  it("leads a Knockout Match with its Knockout round", () => {
    assert.equal(
      tournamentMatchHeadline(null, "tonight", { round: 2, roundCount: 3 }),
      "Semi-final, tonight",
    );
  });
});

describe("tournamentMatchKickoffLine", () => {
  it("joins the kickoff time and the venue", () => {
    assert.equal(
      tournamentMatchKickoffLine(
        { time: "7:30", meridiem: "PM" },
        "Padelhuset Bromma",
      ),
      "7:30 PM, Padelhuset Bromma",
    );
  });

  it("omits a missing venue", () => {
    assert.equal(
      tournamentMatchKickoffLine({ time: "19:30", meridiem: "" }, null),
      "19:30",
    );
  });
});

describe("tournamentMatchGroupLabel", () => {
  it("names the viewer's group", () => {
    assert.equal(
      tournamentMatchGroupLabel(poolMatch({ poolLabel: "A" })),
      "Group A",
    );
    assert.equal(tournamentMatchGroupLabel(null), null);
  });
});

describe("tournamentMatchGroupStanding", () => {
  const wonRoundOne = {
    roundNumber: 1,
    outcome: "won" as const,
    viewerSets: [
      { viewer: 6, opponent: 3 },
      { viewer: 6, opponent: 4 },
    ],
  };

  it("gives the viewer's ordinal and last result", () => {
    assert.equal(
      tournamentMatchGroupStanding(
        poolMatch({ viewerPosition: 2, lastResult: wonRoundOne }),
      ),
      "2nd, won R1 6-3 6-4",
    );
  });

  it("shows a draw and a cancelled Round without scores", () => {
    assert.equal(
      tournamentMatchGroupStanding(
        poolMatch({
          viewerPosition: 1,
          lastResult: { roundNumber: 2, outcome: "draw", viewerSets: [] },
        }),
      ),
      "1st, drew R2",
    );
    assert.equal(
      tournamentMatchGroupStanding(
        poolMatch({
          lastResult: { roundNumber: 1, outcome: "cancelled", viewerSets: [] },
        }),
      ),
      "R1 cancelled",
    );
  });

  it("capitalizes a result without an ordinal", () => {
    assert.equal(
      tournamentMatchGroupStanding(poolMatch({ lastResult: wonRoundOne })),
      "Won R1 6-3 6-4",
    );
  });

  it("falls back to the group size before the viewer's team has played", () => {
    assert.equal(tournamentMatchGroupStanding(poolMatch()), "4 teams");
    assert.equal(tournamentMatchGroupStanding(null), null);
  });
});

describe("tournamentMatchRoundsLeftLine", () => {
  it("counts the Rounds after this one", () => {
    assert.equal(tournamentMatchRoundsLeftLine(1, 3), "Then 2 more rounds");
    assert.equal(tournamentMatchRoundsLeftLine(2, 3), "Then 1 more round");
    assert.equal(tournamentMatchRoundsLeftLine(3, 3), "Last round");
  });

  it("is null without a Round or a Round count", () => {
    assert.equal(tournamentMatchRoundsLeftLine(null, 3), null);
    assert.equal(tournamentMatchRoundsLeftLine(2, null), null);
  });

  it("never uses knockout copy on a Groups only tournament", () => {
    for (const round of [1, 2, 3]) {
      assert.doesNotMatch(
        tournamentMatchRoundsLeftLine(round, 3) ?? "",
        /go through|quarter|top two/i,
      );
    }
  });

  it("hands the last Pool Round over to the knockout on Groups then knockout", () => {
    const options = { thenKnockout: true };
    assert.equal(
      tournamentMatchRoundsLeftLine(1, 3, options),
      "Then 2 more rounds",
    );
    assert.equal(
      tournamentMatchRoundsLeftLine(3, 3, options),
      "Then the knockout",
    );
  });

  it("names what the winner of a Knockout Match plays next", () => {
    assert.equal(
      tournamentMatchRoundsLeftLine(null, null, {
        knockoutMatch: { round: 1, roundCount: 3 },
      }),
      "Winner plays the Semi-finals",
    );
    assert.equal(
      tournamentMatchRoundsLeftLine(null, null, {
        knockoutMatch: { round: 2, roundCount: 3 },
      }),
      "Winner plays the Final",
    );
    assert.equal(
      tournamentMatchRoundsLeftLine(null, null, {
        knockoutMatch: { round: 3, roundCount: 3 },
      }),
      "Winner is Champion",
    );
  });
});

describe("homeTournamentMatchActionLabel", () => {
  it("offers the group table unless results are due", () => {
    assert.equal(homeTournamentMatchActionLabel("view"), "View group");
    assert.equal(homeTournamentMatchActionLabel("add_results"), "Add results");
  });

  it("opens the knockout from a Knockout Match", () => {
    const knockoutMatch = { round: 2, roundCount: 3 };
    assert.equal(
      homeTournamentMatchActionLabel("view", knockoutMatch),
      "View knockout",
    );
    assert.equal(
      homeTournamentMatchActionLabel("add_results", knockoutMatch),
      "Add results",
    );
  });
});

describe("Knockout only card copy", () => {
  it("shows no group, Pool or Round copy on a Knockout Match", () => {
    for (const round of [1, 2, 3]) {
      const knockoutMatch = { round, roundCount: 3 };
      const copy = [
        tournamentCardBandMeta(3, {
          format: "friendly_tournament",
          tournamentShape: "knockout_only",
        }),
        tournamentMatchRoundLabel({
          roundNumber: null,
          roundCount: null,
          knockoutMatch,
        }),
        tournamentMatchRoundLine(null, null, knockoutMatch),
        tournamentMatchHeadline(null, "tonight", knockoutMatch),
        tournamentMatchRoundsLeftLine(null, null, { knockoutMatch }),
        tournamentMatchStandingLine(null),
        tournamentMatchGroupLabel(null),
        tournamentMatchGroupStanding(null),
        homeTournamentMatchActionLabel("view", knockoutMatch),
      ].join("\n");
      assert.doesNotMatch(copy, NO_POOL_OR_ROUND_COPY);
    }
  });
});

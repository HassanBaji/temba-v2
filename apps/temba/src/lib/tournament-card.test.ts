import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { formatGameClock } from "./format-game-start";
import {
  showsTournamentOpenFlag,
  tournamentCardAction,
  tournamentCardActionLabel,
  tournamentCardBandMeta,
  tournamentCardDateLine,
  tournamentCardPairs,
  tournamentOpenFlagLabel,
  tournamentOpenTeamCount,
  tournamentTeamPairLabel,
  tournamentMatchLastResultLine,
  tournamentMatchRoundLine,
  tournamentMatchStandingLine,
  tournamentMatchup,
  tournamentMatchupName,
  tournamentMatchVenueLine,
  tournamentTeamsLine,
  type TournamentCardInput,
  type TournamentCardTeam,
  type TournamentPoolMatch,
} from "./tournament-card";

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
        new Date(2025, 8, 25, 18),
        new Date(2025, 9, 11, 21),
      ),
      "Thu 25 Sep to Sat 11 Oct",
    );
  });

  it("shows the hours for a one-day window", () => {
    const start = new Date(2025, 8, 25, 18);
    const end = new Date(2025, 8, 25, 22);
    assert.equal(
      tournamentCardDateLine(start, end),
      `Thu 25 Sep, ${formatGameClock(start)} – ${formatGameClock(end)}`,
    );
  });

  it("reads From when the window has no end", () => {
    assert.equal(
      tournamentCardDateLine(new Date(2025, 8, 25, 18), null),
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

  it("never uses knockout copy", () => {
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

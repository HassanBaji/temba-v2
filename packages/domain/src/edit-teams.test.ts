import { describe, expect, it } from "vitest";

import {
  canEditTeams,
  editTeamsMoves,
  editTeamsNotifyCopy,
  editTeamsSeats,
  editTeamsSides,
  editTeamsSpotLabel,
  editTeamsSummary,
  editTeamsSwapSides,
  editTeamsTap,
  playedGameTeamIds,
  type EditTeamsRules,
  type EditTeamsSide,
} from "./edit-teams";

const OPEN: EditTeamsRules = { fullSidesOnly: false, fixedSides: false };

function player(userId: string, name = userId) {
  return { userId, name, image: null, levelBand: null };
}

const khalid = player("khalid", "Khalid Janahi");
const hassan = player("hassan", "Hassan H");
const dana = player("dana", "Dana A");
const ahmed = player("ahmed", "Ahmed B");

function padelGame(): EditTeamsSide[] {
  return editTeamsSides([
    { sideIndex: 1, gameTeamId: "t1", left: khalid, right: hassan },
    { sideIndex: 2, gameTeamId: "t2", left: dana, right: ahmed },
  ]);
}

describe("editTeamsTap", () => {
  it("picks a player on the first tap and ignores an open spot", () => {
    const sides = padelGame();
    expect(
      editTeamsTap(sides, null, { sideIndex: 1, position: "left" }, OPEN)
        .selected,
    ).toEqual({ sideIndex: 1, position: "left" });

    const open = editTeamsSides([
      { sideIndex: 1, gameTeamId: "t1", left: khalid, right: null },
      { sideIndex: 2, gameTeamId: null, left: null, right: null },
    ]);
    expect(
      editTeamsTap(open, null, { sideIndex: 2, position: "left" }, OPEN)
        .selected,
    ).toBeNull();
  });

  it("drops the pick when the same player is tapped again", () => {
    const spot = { sideIndex: 1, position: "left" } as const;
    const result = editTeamsTap(padelGame(), spot, spot, OPEN);
    expect(result.selected).toBeNull();
    expect(result.sides).toEqual(padelGame());
  });

  it("swaps across the net, changing both players' teams", () => {
    const result = editTeamsTap(
      padelGame(),
      { sideIndex: 1, position: "left" },
      { sideIndex: 2, position: "left" },
      OPEN,
    );
    expect(result.refused).toBeNull();
    expect(result.sides[0]?.left?.userId).toBe("dana");
    expect(result.sides[1]?.left?.userId).toBe("khalid");
  });

  it("moves a player to an open spot", () => {
    const sides = editTeamsSides([
      { sideIndex: 1, gameTeamId: "t1", left: khalid, right: hassan },
      { sideIndex: 2, gameTeamId: "t2", left: dana, right: null },
    ]);
    const result = editTeamsTap(
      sides,
      { sideIndex: 1, position: "left" },
      { sideIndex: 2, position: "right" },
      OPEN,
    );
    expect(result.sides[0]?.left).toBeNull();
    expect(result.sides[1]?.right?.userId).toBe("khalid");
  });

  it("keeps a team that played together, but lets it swap sides", () => {
    const sides = editTeamsSides(
      [
        { sideIndex: 1, gameTeamId: "t1", left: khalid, right: hassan },
        { sideIndex: 2, gameTeamId: "t2", left: dana, right: ahmed },
      ],
      [{ status: "completed", slot1GameTeamId: "t1", slot2GameTeamId: null }],
    );
    expect(sides[0]?.locked).toBe(true);
    const across = editTeamsTap(
      sides,
      { sideIndex: 2, position: "left" },
      { sideIndex: 1, position: "left" },
      OPEN,
    );
    expect(across.refused).toBe("locked");
    expect(across.sides).toEqual(sides);

    const within = editTeamsTap(
      sides,
      { sideIndex: 1, position: "left" },
      { sideIndex: 1, position: "right" },
      OPEN,
    );
    expect(within.refused).toBeNull();
    expect(within.sides[0]?.left?.userId).toBe("hassan");
  });

  it("refuses a move that leaves a half team where pairs are required", () => {
    const sides = editTeamsSides([
      { sideIndex: 1, gameTeamId: "t1", left: khalid, right: hassan },
      { sideIndex: 2, gameTeamId: null, left: null, right: null },
    ]);
    const result = editTeamsTap(
      sides,
      { sideIndex: 1, position: "left" },
      { sideIndex: 2, position: "left" },
      { fullSidesOnly: true, fixedSides: false },
    );
    expect(result.refused).toBe("half_side");
  });

  it("allows only swaps between teams once the draw is posted", () => {
    const sides = editTeamsSides([
      { sideIndex: 1, gameTeamId: "t1", left: khalid, right: hassan },
      { sideIndex: 2, gameTeamId: "t2", left: dana, right: null },
    ]);
    const rules = { fullSidesOnly: false, fixedSides: true };
    expect(
      editTeamsTap(
        sides,
        { sideIndex: 1, position: "left" },
        { sideIndex: 2, position: "right" },
        rules,
      ).refused,
    ).toBe("fixed_sides");
    expect(
      editTeamsTap(
        sides,
        { sideIndex: 1, position: "left" },
        { sideIndex: 2, position: "left" },
        rules,
      ).refused,
    ).toBeNull();
  });
});

describe("editTeamsMoves", () => {
  it("lists team changes and side changes", () => {
    const original = padelGame();
    let edited = editTeamsTap(
      original,
      { sideIndex: 1, position: "left" },
      { sideIndex: 2, position: "left" },
      OPEN,
    ).sides;
    edited = editTeamsSwapSides(edited, 1);
    const moves = editTeamsMoves(original, edited);
    expect(moves.map((move) => [move.player.userId, move.teamChanged])).toEqual(
      [
        ["hassan", false],
        ["dana", true],
        ["khalid", true],
      ],
    );
    expect(editTeamsSummary(moves, "en")).toBe(
      "Two players change team and one changes side.",
    );
    expect(editTeamsNotifyCopy(moves, "hassan", "en")).toBe(
      "Dana and Khalid get a notification with their new place",
    );
  });

  it("is empty when nothing moved", () => {
    expect(editTeamsMoves(padelGame(), padelGame())).toEqual([]);
  });

  it("says nobody is told when only the Organizer moved", () => {
    const original = editTeamsSides([
      { sideIndex: 1, gameTeamId: "t1", left: hassan, right: null },
      { sideIndex: 2, gameTeamId: null, left: null, right: null },
    ]);
    const edited = editTeamsTap(
      original,
      { sideIndex: 1, position: "left" },
      { sideIndex: 1, position: "right" },
      OPEN,
    ).sides;
    const moves = editTeamsMoves(original, edited);
    expect(editTeamsSummary(moves, "en")).toBe("One player changes side.");
    expect(editTeamsNotifyCopy(moves, "hassan", "en")).toBe(
      "Only your own place changes, so nobody else is told.",
    );
  });
});

describe("editTeamsSeats", () => {
  it("writes every seated player's spot", () => {
    expect(editTeamsSeats(padelGame())).toEqual([
      { userId: "khalid", sideIndex: 1, position: "left" },
      { userId: "hassan", sideIndex: 1, position: "right" },
      { userId: "dana", sideIndex: 2, position: "left" },
      { userId: "ahmed", sideIndex: 2, position: "right" },
    ]);
  });
});

describe("editTeamsSpotLabel", () => {
  it("names the team and side", () => {
    expect(
      editTeamsSpotLabel(
        "friendly_game",
        { sideIndex: 2, position: "left" },
        "en",
      ),
    ).toBe("Team B, left");
  });
});

describe("playedGameTeamIds", () => {
  it("collects both slots of completed Matches only", () => {
    expect(
      playedGameTeamIds([
        { status: "completed", slot1GameTeamId: "a", slot2GameTeamId: "b" },
        { status: "scheduled", slot1GameTeamId: "c", slot2GameTeamId: "d" },
      ]),
    ).toEqual(new Set(["a", "b"]));
  });
});

describe("canEditTeams", () => {
  const base = {
    isOrganizer: true,
    cancelledAt: null,
    format: "friendly_game",
    sport: "padel",
    registrationMode: "individual",
    sides: [
      { left: khalid, right: null },
      { left: dana, right: null },
    ],
    matches: [
      {
        status: "scheduled",
        sets: [{ slot1GamesWon: null, slot2GamesWon: null }],
      },
    ],
  };

  it("lets the Organizer edit a padel game before the score", () => {
    expect(canEditTeams(base)).toBe(true);
  });

  it("stops once a score is in", () => {
    expect(
      canEditTeams({
        ...base,
        matches: [
          {
            status: "scheduled",
            sets: [{ slot1GamesWon: 6, slot2GamesWon: 4 }],
          },
        ],
      }),
    ).toBe(false);
  });

  it("is for Organizers of padel games and friendly tournaments only", () => {
    expect(canEditTeams({ ...base, isOrganizer: false })).toBe(false);
    expect(canEditTeams({ ...base, sport: "football" })).toBe(false);
    expect(canEditTeams({ ...base, format: "americano" })).toBe(false);
    expect(canEditTeams({ ...base, cancelledAt: new Date() })).toBe(false);
    expect(
      canEditTeams({ ...base, sides: [{ left: khalid, right: null }] }),
    ).toBe(false);
  });

  it("stays open on a tournament after results", () => {
    expect(
      canEditTeams({
        ...base,
        format: "friendly_tournament",
        matches: [
          {
            status: "completed",
            sets: [{ slot1GamesWon: 6, slot2GamesWon: 4 }],
          },
        ],
      }),
    ).toBe(true);
  });
});

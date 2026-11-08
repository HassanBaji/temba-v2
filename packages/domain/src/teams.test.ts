import { describe, expect, it } from "vitest";

import { isForbiddenError } from "./is-forbidden-error";
import {
  groupTeamRowView,
  teamCreateInput,
  teamDissolveConfirm,
  teamHomeView,
  teamInviteSeatsLeft,
  teamLeaveConfirm,
  teamListRowView,
  teamNameInput,
} from "./teams";
import { createTeamsFixtures } from "./teams-fixtures";

const fixtures = createTeamsFixtures();

describe("teamNameInput", () => {
  it("trims, and leaves a blank name out", () => {
    expect(teamNameInput("  Smashers ")).toBe("Smashers");
    expect(teamNameInput("   ")).toBeUndefined();
    expect(teamNameInput("")).toBeUndefined();
  });
});

describe("teamListRowView", () => {
  it("marks an incomplete Team with an open seat", () => {
    const row = teamListRowView(fixtures.list.mixed[1]!, "en");
    expect(row.openSeats).toBe(1);
    expect(row.incompleteLabel).toBe("Incomplete");
    expect(row.accessibilityLabel).toBe("Sunday Smashers, Padel, Incomplete");
  });

  it("has no open seat on a full Team", () => {
    const row = teamListRowView(fixtures.list.mixed[0]!, "en");
    expect(row.openSeats).toBe(0);
    expect(row.incompleteLabel).toBeNull();
    expect(row.people).toHaveLength(2);
  });
});

describe("teamHomeView", () => {
  it("shows wins, losses and games on padel, and draws on football", () => {
    expect(teamHomeView(fixtures.home.complete, "en").recordTiles).toEqual([
      { key: "wins", label: "Wins", value: "0" },
      { key: "losses", label: "Losses", value: "0" },
      { key: "games", label: "Games played", value: "0" },
    ]);
    expect(
      teamHomeView(fixtures.home.footballRecord, "en").recordTiles.map(
        (tile) => `${tile.label} ${tile.value}`,
      ),
    ).toEqual(["Wins 2", "Draws 1", "Losses 1", "Games played 4"]);
  });

  it("pads the form line to ten slots, hatched on the older side", () => {
    const empty = teamHomeView(fixtures.home.complete, "en").form;
    expect(empty.slots).toHaveLength(10);
    expect(empty.slots.every((slot) => slot.variant === "not-played")).toBe(
      true,
    );
    expect(empty.emptyCopy).toBe("No results yet. The last ten show here.");

    const played = teamHomeView(fixtures.home.record, "en").form;
    expect(played.slots.map((slot) => slot.variant).slice(-4)).toEqual([
      "not-played",
      "won",
      "won",
      "lost",
    ]);
    expect(played.emptyCopy).toBeNull();
  });

  it("lists Rivals with head-to-head and a disabled Rematch for those who act", () => {
    const view = teamHomeView(fixtures.home.rivals, "en");
    expect(view.rivals).toEqual([
      {
        teamId: "team-rival",
        name: "Seef Smashers",
        headToHead: "2–1",
        played: "3 Matches",
        last: "Last: Won, 4 Sep",
        lastResult: "won",
        accessibilityLabel:
          "Seef Smashers, Head-to-head: won 2, lost 1, 3 Matches, Last: Won, 4 Sep",
      },
    ]);
    expect(view.closestLine).toBeNull();
    expect(view.rivalsEmptyCopy).toBeNull();
    expect(view.rematch).toEqual({ label: "Rematch", disabled: true });

    const football = teamHomeView(fixtures.home.footballRecord, "en");
    expect(football.rivals[0]?.headToHead).toBe("1–1–1");
    expect(football.rematch).toBeNull();
  });

  it("names the closest Team when there is no Rival yet", () => {
    const view = teamHomeView(fixtures.home.closest, "en");
    expect(view.rivals).toEqual([]);
    expect(view.closestLine).toBe(
      "Closest: Seef Smashers, played once. One more Match makes them a Rival.",
    );
    expect(view.rivalsEmptyCopy).toBeNull();
    expect(view.rematch).toBeNull();
    expect(teamHomeView(fixtures.home.complete, "en").rivalsEmptyCopy).toBe(
      "Play the same Team twice and they become a Rival.",
    );
  });

  it("shows the Team Level, each member's Level and seat, and the games", () => {
    const view = teamHomeView(fixtures.home.record, "en");
    expect(view.teamLevel).toBe("C, avg 3.1");
    expect(view.members.map((member) => member.levelLabel)).toEqual([
      "C, 2.8",
      "C, 3.4",
    ]);
    expect(view.members.map((member) => member.seatLabel)).toEqual([
      "Plays left",
      "Either side",
    ]);
    expect(view.games).toEqual([
      {
        key: "match-1",
        gameId: "game-1",
        opponentName: "Seef Smashers",
        meta: "4 Sep, Seef Courts",
        scoreLine: "2–0 in sets",
        result: "won",
      },
    ]);
    expect(view.gamesEmptyCopy).toBeNull();
    expect(teamHomeView(fixtures.home.complete, "en").teamLevel).toBeNull();
  });

  it("labels football seats by role and position", () => {
    const view = teamHomeView(fixtures.home.footballRecord, "en");
    expect(view.members.map((member) => member.seatLabel)).toEqual([
      "Keeper",
      "Forward",
      "Outfield",
    ]);
  });

  it("badges sport and incompleteness", () => {
    expect(teamHomeView(fixtures.home.complete, "en").badges).toEqual([
      "Padel",
    ]);
    expect(teamHomeView(fixtures.home.incomplete, "en").badges).toEqual([
      "Padel",
      "Incomplete",
    ]);
  });

  it("offers the invite to the creator and a waiting note to others", () => {
    const creator = teamHomeView(fixtures.home.incomplete, "en");
    expect(creator.primaryInvite).toBe(true);
    expect(creator.waitingNote).toBe(false);
    expect(creator.openSeats).toBe(1);
    const other = teamHomeView(fixtures.home.waiting, "en");
    expect(other.primaryInvite).toBe(false);
    expect(other.waitingNote).toBe(true);
  });

  it("falls back for a missing name and marks the Captain", () => {
    const view = teamHomeView(
      {
        ...fixtures.home.complete,
        displayName: null,
        members: [
          {
            ...fixtures.home.complete.members[0]!,
            id: "m",
            name: null,
            isCreator: true,
            isViewer: true,
          },
        ],
      },
      "en",
    );
    expect(view.title).toBe("Team");
    expect(view.members[0]).toMatchObject({
      name: "Member",
      captainLabel: "Captain",
      isViewer: true,
    });
  });
});

describe("teamCreateInput", () => {
  it("submits the chosen sport with the trimmed name", () => {
    expect(teamCreateInput({ name: " Five ", sport: "football" })).toEqual({
      name: "Five",
      sport: "football",
    });
    expect(teamCreateInput({ name: "", sport: "padel" })).toEqual({
      name: undefined,
      sport: "padel",
    });
  });

  it("carries the Group tag when the Team is created from a Group", () => {
    expect(
      teamCreateInput({ name: "", sport: "football", groupId: "group-gooz" }),
    ).toEqual({ name: undefined, sport: "football", groupId: "group-gooz" });
  });
});

describe("teamHomeView roster", () => {
  it("shows no count, leave or squad copy on a padel Team", () => {
    for (const home of [
      fixtures.home.complete,
      fixtures.home.incomplete,
      fixtures.home.waiting,
    ]) {
      const view = teamHomeView(home, "en");
      expect(view.roster).toEqual({ label: null, status: null });
      expect(view.canLeave).toBe(false);
      expect(view.squad).toBe(false);
      expect(view.inviteLabel).toBe("Invite your partner");
    }
    expect(teamHomeView(fixtures.home.incomplete, "en").waitingCopy).toBe(
      "Waiting for a partner. This Team is incomplete until a second member joins.",
    );
  });

  it("counts a football squad and marks complete and full", () => {
    expect(
      teamHomeView(fixtures.home.footballCreatorBuilding, "en").roster,
    ).toEqual({
      label: "2 of 20",
      status: null,
    });
    expect(
      teamHomeView(fixtures.home.footballCreatorComplete, "en").roster,
    ).toEqual({
      label: "7 of 20",
      status: "Complete",
    });
    expect(
      teamHomeView(fixtures.home.footballCreatorFull, "en").roster,
    ).toEqual({
      label: "20 of 20",
      status: "Full",
    });
  });

  it("says how many members a football Team still needs", () => {
    const building = teamHomeView(fixtures.home.footballCreatorBuilding, "en");
    expect(building.openSeats).toBe(3);
    expect(teamHomeView(fixtures.home.footballMember, "en").waitingCopy).toBe(
      "Needs 2 more members to be complete.",
    );
  });

  it("gives the creator invites and dissolve, and a member leave", () => {
    const creator = teamHomeView(fixtures.home.footballCreatorComplete, "en");
    expect(creator).toMatchObject({
      canInvite: true,
      canDissolve: true,
      canLeave: false,
      inviteLabel: "Invite players",
    });
    const member = teamHomeView(fixtures.home.footballMember, "en");
    expect(member).toMatchObject({
      canInvite: false,
      canDissolve: false,
      canLeave: true,
    });
  });

  it("keeps the counters at zero", () => {
    expect(
      teamHomeView(fixtures.home.footballCreatorComplete, "en").recordTiles.map(
        (tile) => tile.value,
      ),
    ).toEqual(["0", "0", "0", "0"]);
  });
});

describe("teamHomeView football Roster", () => {
  it("shows the Roster hero and the Formats it plays", () => {
    const view = teamHomeView(fixtures.home.footballTagged, "en");
    expect(view.rosterHero).toEqual({
      label: "Roster 12 of 20",
      plays: "Plays 5, 6 and 7-a-side",
    });
    expect(
      teamHomeView(fixtures.home.footballOrganizer, "en").rosterHero?.plays,
    ).toBe("Plays 5 and 6-a-side");
    expect(teamHomeView(fixtures.home.footballMember, "en").rosterHero).toEqual(
      { label: "Roster 3 of 20", plays: null },
    );
    expect(teamHomeView(fixtures.home.complete, "en").rosterHero).toBe(null);
  });

  it("lists six then and N more, and ends with Add more", () => {
    const view = teamHomeView(fixtures.home.footballTagged, "en");
    expect(view.rosterPreview).toBe(6);
    expect(view.rosterMore).toBe("and 6 more");
    expect(view.addMore).toEqual({
      title: "Add more",
      detail: "By phone, on Temba, or from Gooz of Arad. Up to 20",
    });
    const organizer = teamHomeView(fixtures.home.footballOrganizer, "en");
    expect(organizer.rosterMore).toBe(null);
    expect(organizer.addMore).toBe(null);
    expect(
      teamHomeView(fixtures.home.footballCreatorComplete, "en").addMore?.detail,
    ).toBe("By phone or on Temba. Up to 20");
    expect(teamHomeView(fixtures.home.incomplete, "en").addMore).toBe(null);
  });

  it("marks a player added by phone, with the masked phone and remove for the Captain", () => {
    const base = fixtures.home.footballTagged;
    const [captain, ...rest] = base.members;
    const view = teamHomeView(
      {
        ...base,
        members: [
          captain!,
          {
            ...rest[0]!,
            name: "Hamad",
            userId: "u-hamad",
            unclaimed: true,
            phoneMasked: "+973 •••• 4408",
            removable: true,
          },
        ],
      },
      "en",
    );
    expect(view.members[0]).toMatchObject({ addedLabel: null, remove: null });
    expect(view.members[1]).toMatchObject({
      addedLabel: "Added, not on Temba",
      phoneMasked: "+973 •••• 4408",
      remove: {
        userId: "u-hamad",
        label: "Remove Hamad",
        confirm: { title: "Remove Hamad?", confirmLabel: "Remove" },
        toast: "Hamad removed",
      },
    });
  });

  it("shows a legacy Roster of 22 as 22 of 20, full", () => {
    const view = teamHomeView(fixtures.home.footballLegacy, "en");
    expect(view.roster).toEqual({ label: "22 of 20", status: "Full" });
    expect(view.rosterHero?.label).toBe("Roster 22 of 20");
    expect(view.rosterMore).toBe("and 16 more");
  });
});

describe("teamHomeView Group tag", () => {
  it("shows the tag line and lets the Captain or an Organizer remove it", () => {
    const view = teamHomeView(fixtures.home.footballTagged, "en");
    expect(view.groupTag.line).toBe("Gooz of Arad's team");
    expect(view.groupTag.remove).toEqual({
      label: "Remove tag",
      toast: "Tag removed",
    });
    expect(view.groupTag.options).toEqual([]);
  });

  it("offers an Organizer the Groups they may tag the Team to", () => {
    const view = teamHomeView(fixtures.home.footballOrganizer, "en");
    expect(view.groupTag).toEqual({
      line: null,
      options: [
        {
          groupId: "group-gooz",
          label: "Tag as Gooz of Arad's team",
          toast: "Tagged as Gooz of Arad's team",
        },
      ],
      remove: null,
    });
  });

  it("writes the tag copy in Arabic", () => {
    const view = teamHomeView(fixtures.home.footballTagged, "ar");
    expect(view.groupTag.line).toContain("Gooz of Arad");
    expect(view.rosterHero?.label).toBe("قائمة الفريق 12 من 20");
  });
});

describe("groupTeamRowView", () => {
  it("shows the Roster count and record on football", () => {
    expect(
      groupTeamRowView(
        {
          id: "team-1",
          displayName: "Arad Lions",
          sport: "football",
          rosterCount: 12,
          record: { gamesPlayed: 6, wins: 3, draws: 1, losses: 2 },
        },
        "en",
      ),
    ).toEqual({
      id: "team-1",
      title: "Arad Lions",
      meta: "12 on the roster, 3–1–2",
      accessibilityLabel:
        "Open Arad Lions, 12 on the roster, Won 3, drew 1, lost 2",
    });
  });

  it("shows only the record on padel", () => {
    expect(
      groupTeamRowView(
        {
          id: "team-2",
          displayName: "Ada & Kim",
          sport: "padel",
          rosterCount: 2,
          record: { gamesPlayed: 3, wins: 2, draws: 0, losses: 1 },
        },
        "en",
      ).meta,
    ).toBe("2–1");
  });
});

describe("teamInviteSeatsLeft", () => {
  it("leaves a legacy Roster above twenty no seat", () => {
    const { roster } = fixtures.home.footballLegacy;
    expect(teamInviteSeatsLeft(roster, 0)).toBe(0);
  });

  it("counts pending invites against the squad limit", () => {
    const { roster } = fixtures.home.footballCreatorComplete;
    expect(teamInviteSeatsLeft(roster, 0)).toBe(13);
    expect(teamInviteSeatsLeft(roster, 13)).toBe(0);
    expect(teamInviteSeatsLeft(roster, 30)).toBe(0);
  });

  it("leaves a padel Team no seat while its invite is pending", () => {
    const { roster } = fixtures.home.incomplete;
    expect(teamInviteSeatsLeft(roster, 0)).toBe(1);
    expect(teamInviteSeatsLeft(roster, 1)).toBe(0);
  });
});

describe("confirm copy", () => {
  it("names the Team on leave", () => {
    expect(teamLeaveConfirm("Sunday Five", "en")).toEqual({
      title: "Leave Sunday Five?",
      description: "You can only rejoin if you are invited again.",
      confirmLabel: "Leave Team",
    });
  });

  it("names the Team", () => {
    expect(teamDissolveConfirm("Smashers", "en")).toEqual({
      title: "Dissolve Smashers?",
      description: "This cannot be undone.",
      confirmLabel: "Dissolve Team",
    });
  });
});

describe("isForbiddenError", () => {
  it("matches only the FORBIDDEN code", () => {
    expect(isForbiddenError({ data: { code: "FORBIDDEN" } })).toBe(true);
    expect(isForbiddenError({ data: { code: "NOT_FOUND" } })).toBe(false);
    expect(isForbiddenError(null)).toBe(false);
    expect(isForbiddenError(new Error("x"))).toBe(false);
  });
});

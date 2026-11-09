import assert from "node:assert/strict";
import { isolate } from "@repo/i18n/bidi";
import { describe, it } from "vitest";

import {
  addDraftInvites,
  addDraftPhone,
  EMPTY_TEAM_ROSTER_DRAFT,
  removeDraftRow,
  rosterDraftCount,
  rosterDraftCreateInput,
  rosterDraftForSport,
  rosterDraftSpotsLeft,
  rosterDraftView,
  teamAddPlayersSpotsLine,
  teamGroupAddLabel,
  teamGroupMemberRows,
  teamPhoneCanSubmit,
  teamPhonePreviewLine,
  teamCreateSubmitLabel,
  teamGroupChoiceRows,
  teamNewPlayerAddLabel,
  teamNewPlayerFootball,
  teamNewPlayerRoleChoices,
  teamPhoneLookupCard,
  teamSportChoices,
  teamSquadCountLine,
  teamSquadPickRows,
  toggleDraftGroupMember,
  toggleTeamGroupPick,
  type TeamRosterDraftPhone,
} from "./team-roster-draft";

const HAMAD: TeamRosterDraftPhone = {
  e164: "+97336124401",
  countryIso: "BH",
  nationalNumber: "3612 4401",
  name: "Hamad",
  kind: "new",
  level: "casual",
  football: { role: "keeper", position: null },
};

const YUSUF: TeamRosterDraftPhone = {
  e164: "+97336124402",
  countryIso: "BH",
  nationalNumber: "3612 4402",
  name: "Yusuf",
  kind: "unclaimed",
  phoneMasked: "+973 •••• 4402",
};

const AHMED: TeamRosterDraftPhone = {
  e164: "+97336110001",
  countryIso: "BH",
  nationalNumber: "3611 0001",
  name: "Ahmed Ali",
  kind: "account",
};

describe("team roster draft", () => {
  it("counts the Captain and stops at the Roster maximum", () => {
    assert.equal(rosterDraftCount(EMPTY_TEAM_ROSTER_DRAFT), 1);
    assert.equal(rosterDraftSpotsLeft(EMPTY_TEAM_ROSTER_DRAFT, "football"), 19);

    const many = addDraftInvites(
      EMPTY_TEAM_ROSTER_DRAFT,
      Array.from({ length: 25 }, (_, index) => ({
        userId: `u${index}`,
        name: `Player ${index}`,
      })),
      "football",
    );
    assert.equal(rosterDraftCount(many), 20);
    assert.equal(addDraftPhone(many, HAMAD, "football"), many);

    const padel = addDraftPhone(EMPTY_TEAM_ROSTER_DRAFT, HAMAD, "padel");
    assert.equal(rosterDraftSpotsLeft(padel, "padel"), 0);
    assert.equal(addDraftPhone(padel, YUSUF, "padel"), padel);
  });

  it("lists nobody twice and removes a row by its key", () => {
    const once = addDraftInvites(
      EMPTY_TEAM_ROSTER_DRAFT,
      [{ userId: "u1", name: "Sara" }],
      "football",
    );
    const twice = addDraftInvites(
      once,
      [{ userId: "u1", name: "Sara" }],
      "football",
    );
    assert.equal(twice.invites.length, 1);
    const withPhone = addDraftPhone(
      addDraftPhone(twice, HAMAD, "football"),
      HAMAD,
      "football",
    );
    assert.equal(withPhone.phones.length, 1);

    const view = rosterDraftView(
      withPhone,
      { sport: "football", captain: { name: "Hassan" } },
      "en",
    );
    const hamadKey = view.rows.find((row) => row.name === "Hamad")?.key;
    assert.ok(hamadKey);
    assert.equal(removeDraftRow(withPhone, hamadKey).phones.length, 0);
  });

  it("shows the Roster with Invited and Added rows, the seat strip and the helper", () => {
    const draft = addDraftPhone(
      addDraftPhone(
        addDraftInvites(
          EMPTY_TEAM_ROSTER_DRAFT,
          [
            {
              userId: "u1",
              name: "Yousif Kadhem",
              levelBand: "C1",
              footballRole: "outfield",
              footballPosition: "mid",
              source: { kind: "group", groupName: "Thursday Padel" },
            },
          ],
          "football",
        ),
        HAMAD,
        "football",
      ),
      { ...AHMED, levelBand: "C2", footballPosition: "fwd" },
      "football",
    );
    const view = rosterDraftView(
      draft,
      {
        sport: "football",
        captain: {
          name: "Hassan Haji",
          levelBand: "C1",
          footballRole: "outfield",
          footballPosition: "def",
        },
      },
      "en",
    );
    assert.equal(view.countLine, "4 of 20, you included");
    assert.deepEqual(
      view.rows.map((row) => [
        row.initials,
        row.tile,
        row.meta,
        row.status,
        row.statusDetail,
      ]),
      [
        ["HH", "in", "DEF, C+", "captain", null],
        [
          "YK",
          "invited",
          "MID, C+. Invited from Thursday Padel",
          "Invited",
          "waiting",
        ],
        ["H", "added", "GK. +973 3612 4401", "Added by you", "not on Temba"],
        ["AA", "invited", "FWD, C. Invited by phone", "Invited", "waiting"],
      ],
    );
    assert.equal(view.rows[0]?.removeLabel, null);
    assert.equal(view.rows[1]?.removeLabel, "Remove Yousif Kadhem");
    assert.deepEqual(view.seats.slice(0, 5), [
      "in",
      "pending",
      "pending",
      "pending",
      "open",
    ]);
    assert.equal(view.seats.length, 20);
    assert.equal(view.stripHelper, "5 needed for 5-a-side, 7 for 7-a-side");
    assert.equal(view.stripMax, "20 max");
    assert.equal(view.addMore, "Add more. By phone, on Temba, or from a group");
    assert.ok(view.footnote?.startsWith("Added players count for the roster"));
  });

  it("says the Roster is enough to post once it holds a side", () => {
    const draft = addDraftInvites(
      EMPTY_TEAM_ROSTER_DRAFT,
      Array.from({ length: 5 }, (_, index) => ({
        userId: `u${index}`,
        name: `Player ${index}`,
        source: { kind: "temba" as const },
      })),
      "football",
    );
    const view = rosterDraftView(
      draft,
      { sport: "football", captain: { name: "Hassan" } },
      "en",
    );
    assert.equal(view.rows[1]?.meta, "Invited on Temba");
    assert.equal(
      view.footnote,
      "Six is enough to post a 6-a-side challenge; the matchday squad is named per game, after it's confirmed.",
    );
    assert.equal(
      teamCreateSubmitLabel(
        { name: "Gooz FC", sport: "football", count: 6 },
        "en",
      ),
      "Create Gooz FC",
    );
    assert.equal(
      teamCreateSubmitLabel(
        { name: "Gooz FC", sport: "football", count: 3 },
        "en",
      ),
      "Create team",
    );
    assert.equal(
      teamCreateSubmitLabel({ name: " ", sport: "padel", count: 2 }, "en"),
      "Create team",
    );
  });

  it("drops the Add more row once full and leaves padel without the football lines", () => {
    const padel = addDraftPhone(EMPTY_TEAM_ROSTER_DRAFT, YUSUF, "padel");
    const view = rosterDraftView(
      padel,
      { sport: "padel", captain: { name: "Hassan", levelBand: "C1" } },
      "en",
    );
    assert.equal(view.countLine, "2 of 2, you included");
    assert.equal(view.rows[0]?.meta, "C+");
    assert.equal(view.addMore, null);
    assert.equal(view.fullLine, "The Roster is full at 2.");
    assert.equal(view.stripHelper, null);
    assert.equal(view.stripMax, "2 max");
    assert.deepEqual(view.seats, ["in", "pending"]);
  });

  it("reads in Arabic with the names isolated", () => {
    const view = rosterDraftView(
      addDraftInvites(
        EMPTY_TEAM_ROSTER_DRAFT,
        [{ userId: "u1", name: "Sara" }],
        "football",
      ),
      { sport: "football", captain: { name: "Hassan" } },
      "ar",
    );
    assert.equal(view.countLine, "2 من 20، معك أنت");
    assert.equal(view.rows[1]?.removeLabel, `إزالة ${isolate("Sara")}`);
  });

  it("offers Padel for two and a football Roster up to twenty", () => {
    assert.deepEqual(teamSportChoices("en"), [
      { value: "padel", name: "Padel", detail: "2 players" },
      { value: "football", name: "Football", detail: "roster up to 20" },
    ]);
  });

  it("keeps who fits when the sport changes", () => {
    const football = addDraftPhone(
      addDraftInvites(
        EMPTY_TEAM_ROSTER_DRAFT,
        [{ userId: "u1", name: "Sara" }],
        "football",
      ),
      HAMAD,
      "football",
    );
    assert.deepEqual(rosterDraftForSport(football, "padel"), {
      invites: [{ userId: "u1", name: "Sara" }],
      phones: [],
    });
    const phoneOnly = addDraftPhone(EMPTY_TEAM_ROSTER_DRAFT, HAMAD, "football");
    assert.equal(
      rosterDraftForSport(phoneOnly, "padel").phones[0]?.football,
      undefined,
    );
  });

  it("builds one create call, sending name, Level and role only for a new number", () => {
    const draft = addDraftPhone(
      addDraftPhone(
        addDraftInvites(
          EMPTY_TEAM_ROSTER_DRAFT,
          [{ userId: "u1", name: "Sara" }],
          "football",
        ),
        HAMAD,
        "football",
      ),
      YUSUF,
      "football",
    );
    assert.deepEqual(
      rosterDraftCreateInput(
        { name: " Gooz FC ", sport: "football", groupId: "g1" },
        draft,
      ),
      {
        name: "Gooz FC",
        sport: "football",
        groupId: "g1",
        inviteUserIds: ["u1"],
        phonePlayers: [
          {
            countryIso: "BH",
            nationalNumber: "3612 4401",
            name: "Hamad",
            level: "casual",
            football: { role: "keeper", position: null },
          },
          { countryIso: "BH", nationalNumber: "3612 4402" },
        ],
      },
    );
  });
});

describe("team phone preview", () => {
  const preview = {
    kind: "unclaimed" as const,
    name: "Yusuf",
    alreadyOnTeam: false,
    alreadyInvited: false,
  };

  it("says who the number is and whether it can be added", () => {
    assert.equal(
      teamPhonePreviewLine(preview, { listed: false }, "en"),
      "Already on Temba as Yusuf (no account yet)",
    );
    assert.equal(
      teamPhonePreviewLine(
        { ...preview, kind: "account" },
        { listed: false },
        "en",
      ),
      "This is Yusuf (has an account). They get an invite to accept.",
    );
    assert.equal(
      teamPhonePreviewLine(
        { ...preview, alreadyOnTeam: true },
        { listed: false },
        "en",
      ),
      "Yusuf is already on the Roster",
    );
    assert.equal(
      teamPhonePreviewLine(preview, { listed: true }, "en"),
      "Yusuf is already on the list",
    );
    assert.equal(
      teamPhoneCanSubmit({ preview, listed: false, name: "" }),
      true,
    );
    assert.equal(
      teamPhoneCanSubmit({ preview, listed: true, name: "" }),
      false,
    );
    assert.equal(
      teamPhoneCanSubmit({
        preview: { ...preview, kind: "new", name: null },
        listed: false,
        name: " ",
      }),
      false,
    );
    assert.equal(
      teamPhoneCanSubmit({
        preview: { ...preview, alreadyInvited: true },
        listed: false,
        name: "",
      }),
      false,
    );
  });
});

describe("team From a group rows", () => {
  const members = [
    {
      userId: "a",
      name: "Ali",
      unclaimed: false,
      levelBand: null,
      footballRole: "keeper" as const,
      invited: false,
    },
    {
      userId: "b",
      name: "Badr",
      unclaimed: false,
      levelBand: null,
      footballRole: null,
      invited: true,
    },
    {
      userId: "c",
      name: "Camal",
      unclaimed: true,
      levelBand: null,
      footballRole: null,
      invited: false,
    },
    {
      userId: "d",
      name: "Dana",
      unclaimed: false,
      levelBand: null,
      footballRole: "outfield" as const,
      invited: false,
    },
  ];

  it("marks the invited and those not on Temba, and blocks picks past the spots left", () => {
    const rows = teamGroupMemberRows(
      {
        members,
        picked: ["a"],
        listedUserIds: [],
        spotsLeft: 1,
        sport: "football",
      },
      "en",
    );
    assert.deepEqual(
      rows.map((row) => [
        row.name,
        row.meta,
        row.status,
        row.selected,
        row.blocked,
      ]),
      [
        ["Ali", "Keeper", null, true, false],
        ["Badr", "", "Invited", false, false],
        ["Camal", "", "Not on Temba yet. Add them by phone.", false, false],
        ["Dana", "Outfield", null, false, true],
      ],
    );
  });

  it("narrows to the search", () => {
    assert.deepEqual(
      teamGroupMemberRows(
        {
          members,
          query: " da",
          picked: [],
          listedUserIds: ["d"],
          spotsLeft: 5,
          sport: "football",
        },
        "en",
      ).map((row) => [row.name, row.status]),
      [["Dana", "Dana is on the list"]],
    );
  });

  it("toggles picks up to the spots left and labels the button", () => {
    assert.deepEqual(toggleTeamGroupPick([], "a", 1), ["a"]);
    assert.deepEqual(toggleTeamGroupPick(["a"], "d", 1), ["a"]);
    assert.deepEqual(toggleTeamGroupPick(["a"], "a", 1), []);
    assert.equal(teamGroupAddLabel(0, "en"), "Select players");
    assert.equal(teamGroupAddLabel(2, "en"), "Add 2 players");
    assert.equal(teamAddPlayersSpotsLine(0, "en"), "The Roster is full.");
    assert.equal(teamAddPlayersSpotsLine(3, "en"), "3 spots left");
  });
});

describe("team phone lookup card", () => {
  const found = {
    kind: "account" as const,
    name: "Ali Mansoor",
    alreadyOnTeam: false,
    alreadyInvited: false,
    levelBand: "C2" as const,
    footballRole: "outfield" as const,
    footballPosition: "fwd" as const,
    gamesWithYou: 9,
  };

  it("shows someone on Temba with their Level, position and games with you", () => {
    assert.deepEqual(
      teamPhoneLookupCard(found, { listed: false, sport: "football" }, "en"),
      {
        kind: "found",
        name: "Ali Mansoor",
        initials: "AM",
        line: "On Temba. Football C, FWD. 9 games with you",
        note: "Ali gets the invite in the app. The seat shows as waiting until they accept; you can post challenges meanwhile.",
        action: "Invite",
        actionA11y: "Invite Ali Mansoor",
      },
    );
    const bare = teamPhoneLookupCard(
      { ...found, levelBand: null, footballPosition: null, gamesWithYou: 0 },
      { listed: false, sport: "football" },
      "en",
    );
    assert.equal(bare.kind === "found" ? bare.line : null, "On Temba");
  });

  it("names a stranger's number by its mask, not by who it is", () => {
    assert.deepEqual(
      teamPhoneLookupCard(
        {
          kind: "account",
          name: null,
          alreadyOnTeam: false,
          alreadyInvited: false,
          phoneMasked: "+973 •••• 6610",
        },
        { listed: false, sport: "padel" },
        "en",
      ),
      {
        kind: "found",
        name: "+973 •••• 6610",
        initials: "?",
        line: "On Temba",
        note: "+973 •••• 6610 gets the invite in the app. The seat shows as waiting until they accept; you can post challenges meanwhile.",
        action: "Invite",
        actionA11y: "Invite +973 •••• 6610",
      },
    );
  });

  it("offers a name for a number not on Temba, and blocks one already listed", () => {
    assert.deepEqual(
      teamPhoneLookupCard(
        { ...found, kind: "new", name: null },
        { listed: false, sport: "football" },
        "en",
      ),
      {
        kind: "new",
        title: "Not on Temba yet",
        line: "Add them anyway. They don't need the app to be on the team.",
      },
    );
    assert.deepEqual(
      teamPhoneLookupCard(found, { listed: true, sport: "football" }, "en"),
      {
        kind: "blocked",
        name: "Ali Mansoor",
        initials: "AM",
        line: "Ali Mansoor is already on the list",
      },
    );
    assert.equal(
      teamNewPlayerAddLabel("Khalid R", "en"),
      "Add Khalid to the team",
    );
    assert.equal(teamNewPlayerAddLabel("  ", "en"), "Add to the team");
  });

  it("maps the four position chips to a football role", () => {
    assert.deepEqual(
      teamNewPlayerRoleChoices("en").map((choice) => [
        choice.code,
        choice.name,
      ]),
      [
        ["GK", "keeper"],
        ["DEF", "defence"],
        ["MID", "midfield"],
        ["FWD", "attack"],
      ],
    );
    assert.deepEqual(teamNewPlayerFootball("gk"), {
      role: "keeper",
      position: null,
    });
    assert.deepEqual(teamNewPlayerFootball("mid"), {
      role: "outfield",
      position: "mid",
    });
    assert.deepEqual(teamNewPlayerFootball(null), {
      role: "outfield",
      position: null,
    });
  });
});

describe("team from a group", () => {
  const members = [
    {
      userId: "y",
      name: "Yousif Kadhem",
      unclaimed: false,
      levelBand: "C1" as const,
      footballRole: "outfield" as const,
      footballPosition: "mid" as const,
      invited: false,
    },
    {
      userId: "k",
      name: "Khalid R",
      unclaimed: true,
      levelBand: null,
      footballRole: "keeper" as const,
      footballPosition: null,
      invited: false,
    },
  ];

  it("describes each Group with its members and Teams", () => {
    assert.deepEqual(
      teamGroupChoiceRows(
        [
          {
            id: "g1",
            name: "Gooz of Arad",
            sport: "football",
            memberCount: 14,
            teamCount: 0,
          },
          {
            id: "g2",
            name: "Thursday Padel",
            sport: "padel",
            memberCount: 9,
            teamCount: 2,
          },
        ],
        "en",
      ).map((row) => row.meta),
      [
        "Football, 14 members. No team yet",
        "Padel, 9 members. Has 2 teams already",
      ],
    );
  });

  it("ticks members onto the draft as invites from the Group", () => {
    const picked = toggleDraftGroupMember(
      EMPTY_TEAM_ROSTER_DRAFT,
      members[0]!,
      { groupName: "Gooz of Arad", sport: "football" },
    );
    assert.deepEqual(picked.invites, [
      {
        userId: "y",
        name: "Yousif Kadhem",
        levelBand: "C1",
        footballRole: "outfield",
        footballPosition: "mid",
        source: { kind: "group", groupName: "Gooz of Arad" },
      },
    ]);
    assert.equal(
      toggleDraftGroupMember(picked, members[1]!, {
        groupName: "Gooz of Arad",
        sport: "football",
      }),
      picked,
    );
    assert.deepEqual(
      teamSquadPickRows(
        {
          captainName: "Hassan Haji",
          members,
          draft: picked,
          sport: "football",
        },
        "en",
      ).map((row) => [row.initials, row.meta, row.picked, row.disabled]),
      [
        ["HH", "You, captain", true, true],
        ["YK", "MID, C+", true, false],
        ["KR", "Not on Temba yet. Add them by phone.", false, true],
      ],
    );
    assert.equal(
      teamSquadCountLine(picked, "football", "en"),
      "2 of 20, football",
    );
    assert.equal(
      toggleDraftGroupMember(picked, members[0]!, {
        groupName: "Gooz of Arad",
        sport: "football",
      }).invites.length,
      0,
    );
  });
});

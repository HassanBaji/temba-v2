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
  teamSportChoices,
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
      { sport: "football", captainName: "Hassan", groupName: null },
      "en",
    );
    const hamadKey = view.rows.find((row) => row.name === "Hamad")?.key;
    assert.ok(hamadKey);
    assert.equal(removeDraftRow(withPhone, hamadKey).phones.length, 0);
  });

  it("shows the Roster with Invited and Added rows, the helper and the footer", () => {
    const draft = addDraftPhone(
      addDraftPhone(
        addDraftInvites(
          EMPTY_TEAM_ROSTER_DRAFT,
          [{ userId: "u1", name: "Sara" }],
          "football",
        ),
        YUSUF,
        "football",
      ),
      AHMED,
      "football",
    );
    const view = rosterDraftView(
      draft,
      { sport: "football", captainName: "Hassan", groupName: "Gooz of Arad" },
      "en",
    );
    assert.equal(view.countLine, "4 of 20, you included");
    assert.deepEqual(
      view.rows.map((row) => [row.name, row.status, row.detail]),
      [
        ["Hassan", "Captain", null],
        ["Sara", "Invited, waiting", null],
        ["Yusuf", "Added, not on Temba", "+973 •••• 4402"],
        ["Ahmed Ali", "Invited, waiting", null],
      ],
    );
    assert.equal(view.rows[0]?.removeLabel, null);
    assert.equal(view.rows[1]?.removeLabel, "Remove Sara");
    assert.deepEqual(view.addMore, {
      title: "Add more",
      detail: "By phone, on Temba, or from Gooz of Arad. Up to 20",
    });
    assert.equal(view.helper, "5 needed for 5-a-side, 7 for 7-a-side, 20 max");
    assert.equal(
      view.footer,
      "Six is enough to post a 6-a-side challenge; the matchday squad is named per game, after it's confirmed.",
    );
  });

  it("drops the Add more row once full and leaves padel without the football lines", () => {
    const padel = addDraftPhone(EMPTY_TEAM_ROSTER_DRAFT, YUSUF, "padel");
    const view = rosterDraftView(
      padel,
      { sport: "padel", captainName: "Hassan", groupName: null },
      "en",
    );
    assert.equal(view.countLine, "2 of 2, you included");
    assert.equal(view.addMore, null);
    assert.equal(view.fullLine, "The Roster is full at 2.");
    assert.equal(view.helper, null);
    assert.equal(view.footer, null);
  });

  it("reads in Arabic with the names isolated", () => {
    const view = rosterDraftView(
      addDraftInvites(
        EMPTY_TEAM_ROSTER_DRAFT,
        [{ userId: "u1", name: "Sara" }],
        "football",
      ),
      { sport: "football", captainName: "Hassan", groupName: null },
      "ar",
    );
    assert.equal(view.countLine, "2 من 20، معك أنت");
    assert.equal(view.rows[1]?.removeLabel, `إزالة ${isolate("Sara")}`);
  });

  it("offers Padel for two and a football Roster up to twenty", () => {
    assert.deepEqual(teamSportChoices("en"), [
      { value: "padel", name: "Padel", detail: "2 players" },
      { value: "football", name: "Football", detail: "Roster up to 20" },
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

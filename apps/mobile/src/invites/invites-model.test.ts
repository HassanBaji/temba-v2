import { describe, expect, it } from "vitest";

import {
  communityPreview,
  gamePreview,
  gameShareMessage,
  groupPreview,
  teamPreview,
  groupShareMessage,
  inviteLandingPath,
  inviteLinkFromParams,
  inviteLinkHref,
  gameInviteSubtitle,
  inviteLinkNote,
  inviteModes,
  inviteSheetTitle,
  lookupResultView,
  noPlayersMatchCopy,
  openSeatCount,
  phoneInviteLabel,
  phoneInviteNote,
  playersHeading,
  rowWithPhone,
  textMessageUrl,
  whatsAppUrl,
} from "./invites-model";

describe("inviteLandingPath", () => {
  it("lands each accepted invite on its screen", () => {
    expect(inviteLandingPath("game", "g1")).toBe("/games/g1");
    expect(inviteLandingPath("group", "gr1")).toBe("/groups/gr1");
    expect(inviteLandingPath("team", "t1")).toBe("/profile/teams/t1");
    expect(inviteLandingPath("community", "c1")).toBe("/communities");
  });
});

describe("inviteLinkHref and inviteLinkFromParams", () => {
  it("round-trips a token link and a short code", () => {
    const token = inviteLinkHref({ kind: "game", token: "abc" });
    expect(inviteLinkFromParams(token.params)).toEqual({
      kind: "game",
      token: "abc",
    });
    const short = inviteLinkHref({ kind: "group-short", code: "Zy12" });
    expect(inviteLinkFromParams(short.params)).toEqual({
      kind: "group-short",
      code: "Zy12",
    });
  });

  it("reads the first of repeated params and rejects the incomplete", () => {
    expect(
      inviteLinkFromParams({ kind: ["team", "game"], token: ["t", "u"] }),
    ).toEqual({ kind: "team", token: "t" });
    expect(inviteLinkFromParams({ kind: "game" })).toBeNull();
    expect(inviteLinkFromParams({ kind: "venue", token: "x" })).toBeNull();
    expect(inviteLinkFromParams({ kind: "game-short" })).toBeNull();
  });
});

describe("share messages", () => {
  const link = {
    shortUrl: "https://temba.example/gr/AbCd1234",
    inviteUrl: "https://temba.example/invites/group/link/long-token",
  };

  it("points a Group share at the web origin short link", () => {
    expect(
      groupShareMessage({ name: "Bromma Tuesday", sport: "padel", link }),
    ).toBe(
      'You are invited to join "Bromma Tuesday" for "Padel"\nJoin: https://temba.example/gr/AbCd1234',
    );
  });

  it("falls back to the long link when there is no short code", () => {
    expect(
      groupShareMessage({
        name: null,
        sport: null,
        link: { shortUrl: null, inviteUrl: link.inviteUrl },
      }),
    ).toContain(link.inviteUrl);
  });

  it("shares only the link for a tournament and the roster for a Friendly game", () => {
    const base = {
      registrationMode: "individual",
      venueName: "Padel Hub",
      courtName: null,
      windowStart: new Date("2026-03-10T17:00:00Z"),
      windowEnd: new Date("2026-03-10T18:30:00Z"),
      sides: [
        { sideIndex: 1, left: { name: "Ada" }, right: null },
        { sideIndex: 2, left: null, right: null },
      ],
    };
    const shortLink = {
      shortUrl: "https://temba.example/g/AbCd1234",
      inviteUrl: "x",
    };
    expect(
      gameShareMessage({ ...base, format: "friendly_tournament" }, shortLink),
    ).toBe("https://temba.example/g/AbCd1234");
    const roster = gameShareMessage(
      { ...base, format: "friendly_game" },
      shortLink,
    );
    expect(roster).toContain("Padel Hub");
    expect(roster).toContain("- Left: Ada");
    expect(roster.endsWith("https://temba.example/g/AbCd1234")).toBe(true);
  });
});

describe("lookupResultView", () => {
  it("leads with the username, then the cue, and reads the invite", () => {
    expect(
      lookupResultView(
        {
          id: "u",
          name: "Ada",
          username: "ada",
          cue: "Group member",
          email: "a@x.io",
        },
        true,
      ),
    ).toEqual({
      id: "u",
      name: "Ada",
      meta: "@ada, Group member",
      accessibilityLabel: "Ada, @ada, Group member, invited",
    });
    expect(lookupResultView({ id: "u", name: "Kim" }, false)).toMatchObject({
      meta: null,
      accessibilityLabel: "Kim",
    });
  });
});

describe("inviteModes", () => {
  it("offers Phone and Link only with link rights", () => {
    expect(inviteModes({ canLookup: true, canLink: true })).toEqual([
      "players",
      "phone",
      "link",
    ]);
    expect(inviteModes({ canLookup: true, canLink: false })).toEqual([
      "players",
    ]);
    expect(inviteModes({ canLookup: false, canLink: true })).toEqual([
      "phone",
      "link",
    ]);
  });
});

describe("invite sheet copy", () => {
  it("names the sheet for its door", () => {
    expect(inviteSheetTitle("game")).toBe("Invite players");
    expect(inviteSheetTitle("team")).toBe("Invite your partner");
  });

  it("switches the list heading when searching", () => {
    expect(playersHeading("  ")).toBe("Suggested");
    expect(playersHeading("nor")).toBe("Results");
  });

  it("points to the other ways in only when they exist", () => {
    expect(noPlayersMatchCopy(" zed ", true)).toBe(
      'No one on Temba matches "zed".\nTry their phone number or send them the link.',
    );
    expect(noPlayersMatchCopy("zed", false)).toBe(
      'No one on Temba matches "zed".',
    );
  });

  it("labels the text invite by readiness", () => {
    expect(phoneInviteLabel(false, false)).toBe("Enter a number");
    expect(phoneInviteLabel(true, false)).toBe("Send invite by text");
    expect(phoneInviteLabel(true, true)).toBe("Sending…");
    expect(phoneInviteNote(false)).toBe("They get a text with your invite.");
  });

  it("describes the link for each door", () => {
    expect(inviteLinkNote("game")).toContain("take a seat");
    expect(inviteLinkNote("community")).toContain("join the Community");
  });
});

describe("gameInviteSubtitle", () => {
  const sides = [
    { sideIndex: 0, left: { name: "Ada" }, right: null },
    { sideIndex: 1, left: null, right: null },
  ];
  const game = {
    format: "doubles",
    registrationMode: "individual",
    venueName: "Karbabad Courts",
    courtName: "Court 2",
    windowStart: "2026-10-21T17:30:00.000Z",
    windowEnd: "2026-10-21T19:00:00.000Z",
    sides,
  };

  it("counts open seats", () => {
    expect(openSeatCount(sides)).toBe(3);
  });

  it("reads like the artboard", () => {
    expect(gameInviteSubtitle(game, new Date("2026-10-21T09:00:00.000Z"))).toBe(
      "Tonight 8:30 PM, Court 2. 3 seats open.",
    );
  });

  it("drops what is unknown", () => {
    expect(
      gameInviteSubtitle(
        {
          ...game,
          windowStart: null,
          courtName: null,
          sides: [{ sideIndex: 0, left: { name: "A" }, right: { name: "B" } }],
        },
        new Date(),
      ),
    ).toBe("Karbabad Courts.");
  });
});

describe("rowWithPhone", () => {
  it("matches the whole number, however it is written", () => {
    const rows = [
      { id: "a", name: "Ada", phoneNumber: "+973 3300 00001" },
      { id: "k", name: "Kim", phoneNumber: "+973 3300 0000" },
    ];
    expect(rowWithPhone(rows, "+97333000000")?.id).toBe("k");
    expect(rowWithPhone(rows, "+97339999999")).toBeNull();
  });
});

describe("message urls", () => {
  it("puts the body where each platform reads it", () => {
    expect(textMessageUrl("ios", "+97333000000", "Join me")).toBe(
      "sms:+97333000000&body=Join%20me",
    );
    expect(textMessageUrl("android", null, "Join me")).toBe(
      "sms:?body=Join%20me",
    );
    expect(whatsAppUrl("a&b")).toBe("whatsapp://send?text=a%26b");
  });
});

describe("preview normalisers", () => {
  it("names the host for a ready link", () => {
    expect(
      communityPreview({ status: "ready", communityName: "Södermalm" }),
    ).toEqual({ status: "ready", kind: "community", name: "Södermalm" });
    expect(groupPreview({ status: "ready", groupName: "Bromma" })).toEqual({
      status: "ready",
      kind: "group",
      name: "Bromma",
    });
    expect(teamPreview({ status: "ready", teamName: "Sam & you" })).toEqual({
      status: "ready",
      kind: "team",
      name: "Sam & you",
    });
  });

  it("keeps an expired or unavailable link as its status", () => {
    expect(groupPreview({ status: "invalid" })).toEqual({ status: "invalid" });
    expect(gamePreview({ status: "unavailable" })).toEqual({
      status: "unavailable",
    });
  });
});

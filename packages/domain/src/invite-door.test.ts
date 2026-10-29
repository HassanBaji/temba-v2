import { describe, expect, it } from "vitest";

import {
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
} from "./invite-door";

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

describe("openSeatCount", () => {
  it("counts open seats", () => {
    expect(
      openSeatCount([
        { left: { name: "Ada" }, right: null },
        { left: null, right: null },
      ]),
    ).toBe(3);
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

describe("textMessageUrl", () => {
  it("puts the body where each platform reads it", () => {
    expect(textMessageUrl("ios", "+97333000000", "Join me")).toBe(
      "sms:+97333000000&body=Join%20me",
    );
    expect(textMessageUrl("android", null, "Join me")).toBe(
      "sms:?body=Join%20me",
    );
  });
});

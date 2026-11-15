import { describe, expect, it } from "vitest";

import {
  sortWaitingRequests,
  waitingBulkApproveLabel,
  waitingCountLabel,
  waitingGameFill,
  waitingGameHeading,
  waitingNextLine,
  waitingRequestCard,
  waitingRequestDoneText,
  type WaitingRequest,
  type WaitingRequestGame,
} from "./waiting-requests";

const NOW = new Date("2026-11-11T09:00:00.000Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// Friday 13 November 2026, 7:00 PM in Bahrain (UTC+3).
const FRIDAY_GAME: WaitingRequestGame = {
  id: "game-fri",
  sport: "football",
  startsAt: "2026-11-13T16:00:00.000Z",
  groupId: "group-kff",
  groupName: "Karbabad Friday Football",
  levelMinTenths: 25,
  levelMaxTenths: 41,
  registeredCount: 11,
  capacity: 14,
};

// Tuesday 17 November 2026, 7:00 PM in Bahrain.
const TUESDAY_GAME: WaitingRequestGame = {
  id: "game-tue",
  sport: "padel",
  startsAt: "2026-11-17T16:00:00.000Z",
  groupId: "group-tnp",
  groupName: "Tuesday Night Padel",
  levelMinTenths: 21,
  levelMaxTenths: 34,
  registeredCount: 2,
  capacity: 4,
};

function user(id: string, name: string) {
  return { id, name, image: null };
}

const omar: WaitingRequest = {
  kind: "level_range",
  id: "ot",
  createdAt: new Date(NOW.getTime() - 3 * HOUR),
  user: user("u-ot", "Omar T"),
  levelTenths: 15,
  game: FRIDAY_GAME,
  requesterInGroup: true,
  pickedSeat: true,
};

const jassim: WaitingRequest = {
  kind: "seat_hold",
  id: "ja",
  createdAt: new Date(NOW.getTime() - 3 * HOUR),
  user: user("u-ja", "Jassim A"),
  levelTenths: 32,
  game: FRIDAY_GAME,
  seatHeldUntil: new Date(NOW.getTime() + 21 * HOUR),
  group: { id: "group-kff", name: "Karbabad Friday Football" },
  invitedBy: { id: "viewer", name: "Hassan Haji" },
  invitedByViewer: true,
};

const faisal: WaitingRequest = {
  kind: "level_range",
  id: "fj",
  createdAt: new Date(NOW.getTime() - DAY),
  user: user("u-fj", "Faisal J"),
  levelTenths: 38,
  game: TUESDAY_GAME,
  requesterInGroup: true,
  pickedSeat: false,
};

const jawad: WaitingRequest = {
  kind: "group_join",
  id: "jr",
  createdAt: new Date(NOW.getTime() - 2 * DAY),
  user: user("u-jr", "Jawad R"),
  levelTenths: 30,
  group: { id: "group-tnp", name: "Tuesday Night Padel", sport: "padel" },
  source: "invite_link",
  invitedBy: { id: "u-am", name: "Ali M" },
  invitedByViewer: false,
  note: null,
  gamesWithMembers: 3,
};

const mahdi: WaitingRequest = {
  kind: "group_join",
  id: "ms",
  createdAt: new Date(NOW.getTime() - 3 * DAY),
  user: user("u-ms", "Mahdi S"),
  levelTenths: 45,
  group: {
    id: "group-kff",
    name: "Karbabad Friday Football",
    sport: "football",
  },
  source: "group_page",
  invitedBy: null,
  invitedByViewer: false,
  note: "  Keeper, free on Fridays ",
  gamesWithMembers: 0,
};

describe("sortWaitingRequests", () => {
  it("puts seats first by what runs out first, then Group requests oldest first", () => {
    const sorted = sortWaitingRequests([jawad, faisal, mahdi, jassim, omar]);
    expect(sorted.map((request) => request.id)).toEqual([
      "ja",
      "ot",
      "fj",
      "ms",
      "jr",
    ]);
  });
});

describe("waitingRequestCard", () => {
  it("reads a member outside a football Game's range in OVR", () => {
    const card = waitingRequestCard(omar, "en", NOW);
    expect(card.name).toBe("Omar T");
    expect(card.level).toBe("53");
    expect(card.want).toBe("Seat in Fri 7:00 PM football");
    expect(card.wantIcon).toBe("seat");
    expect(card.context).toBe(
      "Karbabad Friday Football member. Level 53 is under this game’s 61 to 75.",
    );
    expect(card.clock).toEqual({ label: "starts", value: "in 2d" });
  });

  it("says a padel Level above the range in bands", () => {
    const card = waitingRequestCard(faisal, "en", NOW);
    expect(card.level).toBe("C+");
    expect(card.want).toBe("Seat in Tue 7:00 PM padel");
    expect(card.context).toBe(
      "Tuesday Night Padel member. Level C+ is above this game’s C- to C.",
    );
  });

  it("says Approve adds a Seat hold requester to the Group", () => {
    const card = waitingRequestCard(jassim, "en", NOW);
    expect(card.context).toBe(
      "Not in Karbabad Friday Football yet, came through your link. Approving adds them to the group too.",
    );
    expect(card.clock).toEqual({ label: "seat held", value: "21h left" });
  });

  it("says who invited a Group requester and their games with members", () => {
    const card = waitingRequestCard(jawad, "en", NOW);
    expect(card.want).toBe("Join Tuesday Night Padel");
    expect(card.wantIcon).toBe("group");
    expect(card.context).toBe(
      "Invited by Ali M. Has played 3 games with your members.",
    );
    expect(card.clock).toEqual({ label: "asked", value: "2d ago" });
    expect(card.note).toBeNull();
  });

  it("keeps a Group requester's note, trimmed", () => {
    const card = waitingRequestCard(mahdi, "en", NOW);
    expect(card.context).toBe(
      "Asked from the group page. No games with your members yet.",
    );
    expect(card.note).toBe("“Keeper, free on Fridays”");
  });

  it("falls back when the requester has no name or level", () => {
    const card = waitingRequestCard(
      { ...omar, user: user("u-x", " "), levelTenths: null },
      "en",
      NOW,
    );
    expect(card.name).toBe("A player");
    expect(card.level).toBeNull();
    expect(card.context).toBe(
      "Karbabad Friday Football member. No level yet. This game is 61 to 75.",
    );
  });

  it("writes Arabic copy", () => {
    const card = waitingRequestCard(jawad, "ar", NOW);
    expect(card.want).toBe("الانضمام إلى Tuesday Night Padel");
    expect(card.context).toBe("بدعوة من Ali M. لعب 3 مباريات مع أعضائك.");
  });
});

describe("waitingRequestDoneText", () => {
  it("names the Game day, and the Group for a Seat hold", () => {
    expect(waitingRequestDoneText(omar, "approve", "en")).toBe(
      "is in Friday’s game",
    );
    expect(waitingRequestDoneText(jassim, "approve", "en")).toBe(
      "is in Friday’s game and in the group",
    );
    expect(waitingRequestDoneText(jawad, "approve", "en")).toBe(
      "is now in Tuesday Night Padel",
    );
  });

  it("says a Level range request with no seat picked can now join, not that they are in", () => {
    expect(waitingRequestDoneText(faisal, "approve", "en")).toBe(
      "can now join Tuesday’s game",
    );
  });

  it("expects the Waitlist when the Game is full", () => {
    const full = { ...FRIDAY_GAME, registeredCount: 14 };
    expect(
      waitingRequestDoneText({ ...omar, game: full }, "approve", "en"),
    ).toBe("goes on Friday’s Waitlist");
  });

  it("says what the door did once it is known", () => {
    expect(waitingRequestDoneText(omar, "approve", "en", "waitlisted")).toBe(
      "goes on Friday’s Waitlist",
    );
    expect(waitingRequestDoneText(omar, "approve", "en", "lapsed")).toBe(
      "can now join Friday’s game",
    );
    expect(waitingRequestDoneText(jassim, "approve", "en", "lapsed")).toBe(
      "is now in Karbabad Friday Football",
    );
    expect(waitingRequestDoneText(faisal, "approve", "en", "registered")).toBe(
      "is in Tuesday’s game",
    );
  });

  it("frees the seat only for a Seat hold", () => {
    expect(waitingRequestDoneText(jassim, "decline", "en")).toBe(
      "declined, seat freed",
    );
    expect(waitingRequestDoneText(omar, "decline", "en")).toBe("declined");
  });
});

describe("waitingNextLine", () => {
  it("names up to two and counts the rest", () => {
    expect(waitingNextLine([], "en")).toBeNull();
    expect(waitingNextLine([jassim], "en")).toBe("Next: Jassim A");
    expect(waitingNextLine([jassim, faisal], "en")).toBe(
      "Next: Jassim A and Faisal J",
    );
    expect(waitingNextLine([jassim, faisal, jawad, mahdi], "en")).toBe(
      "Next: Jassim A, Faisal J and 2 more",
    );
  });
});

describe("a Game's heading on All requests", () => {
  it("heads a Game with its day, fill and held seats", () => {
    expect(waitingGameHeading(FRIDAY_GAME, "en")).toBe("Fri 7:00 PM football");
    expect(
      waitingGameFill(FRIDAY_GAME, { heldSeats: 2, approvedSeats: 0 }, "en"),
    ).toBe("11 of 14 in, 2 seats held");
    expect(
      waitingGameFill(FRIDAY_GAME, { heldSeats: 1, approvedSeats: 1 }, "en"),
    ).toBe("12 of 14 in, 1 seat held");
    expect(
      waitingGameFill(FRIDAY_GAME, { heldSeats: 0, approvedSeats: 2 }, "en"),
    ).toBe("13 of 14 in");
  });

  it("offers one tap for two or more", () => {
    expect(waitingBulkApproveLabel(1, "en")).toBeNull();
    expect(waitingBulkApproveLabel(2, "en")).toBe("Approve both");
    expect(waitingBulkApproveLabel(3, "en")).toBe("Approve all 3");
  });

  it("counts what waits", () => {
    expect(waitingCountLabel(5, "en")).toBe("5 waiting");
    expect(waitingCountLabel(0, "en")).toBe("All answered");
  });
});

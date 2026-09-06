import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { formatAbsoluteDay, formatGameClock } from "./format-game-start";
import {
  friendlyGameDateDurationLine,
  friendlyGameDateTimeLine,
  friendlyGameDirectionsUrl,
  friendlyGameHomeTitle,
  friendlyGameOccupancyLabel,
  friendlyGamePriceRow,
  friendlyGameVenueLine,
  friendlyGameViewerLine,
} from "./friendly-game-chrome";
import { showsFriendlyRoster } from "./game-summary-cta";

describe("friendly Game home chrome gate", () => {
  it("is only true for an individual Friendly game", () => {
    assert.equal(showsFriendlyRoster("friendly_game", "individual"), true);
    assert.equal(showsFriendlyRoster("friendly_game", "team_only"), false);
    assert.equal(showsFriendlyRoster("americano", "individual"), false);
    assert.equal(
      showsFriendlyRoster("friendly_tournament", "individual"),
      false,
    );
  });
});

describe("friendlyGameHomeTitle", () => {
  it("uses the Group name when the Game belongs to a Group", () => {
    assert.equal(
      friendlyGameHomeTitle("group-1", "Friday Regulars"),
      "Friday Regulars",
    );
  });

  it("falls back to Group when the Group name is blank", () => {
    assert.equal(friendlyGameHomeTitle("group-1", null), "Group");
    assert.equal(friendlyGameHomeTitle("group-1", "  "), "Group");
  });

  it("is Pickup when the Game has no Group", () => {
    assert.equal(friendlyGameHomeTitle(null, "Ignored"), "Pickup");
    assert.equal(friendlyGameHomeTitle(undefined, null), "Pickup");
  });
});

describe("friendlyGameViewerLine", () => {
  it("says You're playing when the viewer is in", () => {
    assert.equal(friendlyGameViewerLine("in"), "You're playing");
  });

  it("says You're on the waitlist when waitlisted", () => {
    assert.equal(
      friendlyGameViewerLine("waitlisted"),
      "You're on the waitlist",
    );
  });

  it("is quiet when the viewer has no standing", () => {
    assert.equal(friendlyGameViewerLine(null), null);
  });
});

describe("friendlyGamePriceRow", () => {
  it("omits an unset price", () => {
    assert.equal(friendlyGamePriceRow(null), null);
    assert.equal(friendlyGamePriceRow(undefined), null);
  });

  it("shows Free with no venue-payment helper", () => {
    assert.deepEqual(friendlyGamePriceRow(0), {
      amount: "Free",
      helper: null,
    });
  });

  it("shows the existing amount plus Paid at the venue when cents are positive", () => {
    assert.deepEqual(friendlyGamePriceRow(1250), {
      amount: "12.50 BD",
      helper: "Paid at the venue",
    });
  });
});

describe("friendlyGameOccupancyLabel", () => {
  it("reads N of capacity players when a cap exists", () => {
    assert.equal(friendlyGameOccupancyLabel(2, 4), "2 of 4 players");
  });

  it("drops the cap when players allowed is unset", () => {
    assert.equal(friendlyGameOccupancyLabel(1, null), "1 player");
    assert.equal(friendlyGameOccupancyLabel(3, undefined), "3 players");
  });
});

describe("friendlyGameDirectionsUrl", () => {
  it("builds the maps query URL when both coordinates parse to a number", () => {
    assert.equal(
      friendlyGameDirectionsUrl("26.228509", "50.58605"),
      "https://www.google.com/maps/search/?api=1&query=26.228509,50.58605",
    );
  });

  it("is omitted when either coordinate is missing or not a number", () => {
    assert.equal(friendlyGameDirectionsUrl(null, "50.58605"), null);
    assert.equal(friendlyGameDirectionsUrl("26.228509", null), null);
    assert.equal(friendlyGameDirectionsUrl(undefined, undefined), null);
    assert.equal(friendlyGameDirectionsUrl("", "50.58605"), null);
    assert.equal(friendlyGameDirectionsUrl("26.228509", "east"), null);
  });
});

describe("friendlyGameVenueLine", () => {
  it("joins Venue and Court when both exist", () => {
    assert.equal(
      friendlyGameVenueLine("Padel Club", "Court 1"),
      "Padel Club · Court 1",
    );
  });

  it("keeps whichever of Venue or Court is present", () => {
    assert.equal(friendlyGameVenueLine("Padel Club", null), "Padel Club");
    assert.equal(friendlyGameVenueLine(null, "Court 1"), "Court 1");
    assert.equal(friendlyGameVenueLine(null, null), null);
  });
});

describe("friendlyGameDateDurationLine", () => {
  it("is the date when duration is unset", () => {
    const start = new Date(2026, 8, 6, 19, 0, 0);
    assert.equal(
      friendlyGameDateDurationLine(start, null),
      formatAbsoluteDay(start),
    );
  });

  it("appends duration when the first Match has minutes", () => {
    const start = new Date(2026, 8, 6, 19, 0, 0);
    assert.equal(
      friendlyGameDateDurationLine(start, 90),
      `${formatAbsoluteDay(start)} · 90 min`,
    );
  });

  it("is null when the window is unset", () => {
    assert.equal(friendlyGameDateDurationLine(null, 90), null);
  });
});

describe("friendlyGameDateTimeLine", () => {
  it("joins the date and local clock", () => {
    const start = new Date(2026, 8, 6, 19, 0, 0);
    assert.equal(
      friendlyGameDateTimeLine(start),
      `${formatAbsoluteDay(start)} · ${formatGameClock(start)}`,
    );
  });
});

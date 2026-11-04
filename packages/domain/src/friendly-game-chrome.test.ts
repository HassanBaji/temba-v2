import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { formatAbsoluteDay } from "./format-game-start";
import {
  friendlyGameDateDurationLine,
  friendlyGameDirectionsUrl,
  friendlyGameVenueDirectionsUrl,
  friendlyGameHomeTitle,
  friendlyGameOccupancyLabel,
  friendlyGamePriceRow,
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
      friendlyGameHomeTitle("group-1", "Friday Regulars", "en"),
      "Friday Regulars",
    );
  });

  it("falls back to Group when the Group name is blank", () => {
    assert.equal(friendlyGameHomeTitle("group-1", null, "en"), "Group");
    assert.equal(friendlyGameHomeTitle("group-1", "  ", "en"), "Group");
  });

  it("is Pickup when the Game has no Group", () => {
    assert.equal(friendlyGameHomeTitle(null, "Ignored", "en"), "Pickup");
    assert.equal(friendlyGameHomeTitle(undefined, null, "en"), "Pickup");
  });

  it("writes the fallbacks in Arabic", () => {
    assert.equal(friendlyGameHomeTitle(null, null, "ar"), "لعبة حرة");
    assert.equal(friendlyGameHomeTitle("group-1", null, "ar"), "مجموعة");
    assert.equal(friendlyGameOccupancyLabel(2, 4, "ar"), "2 من 4 لاعبين");
  });
});

describe("friendlyGameViewerLine", () => {
  it("says You're playing when the viewer is in", () => {
    assert.equal(friendlyGameViewerLine("in", "en"), "You're playing");
  });

  it("says You're on the waitlist when waitlisted", () => {
    assert.equal(
      friendlyGameViewerLine("waitlisted", "en"),
      "You're on the waitlist",
    );
  });

  it("is quiet when the viewer has no standing", () => {
    assert.equal(friendlyGameViewerLine(null, "en"), null);
  });
});

describe("friendlyGamePriceRow", () => {
  it("omits an unset price", () => {
    assert.equal(friendlyGamePriceRow(null, "en"), null);
    assert.equal(friendlyGamePriceRow(undefined, "en"), null);
  });

  it("shows Free with no venue-payment helper", () => {
    assert.deepEqual(friendlyGamePriceRow(0, "en"), {
      amount: "Free",
      helper: null,
    });
  });

  it("shows the existing amount plus Paid at the venue when fils are positive", () => {
    assert.deepEqual(friendlyGamePriceRow(12500, "en"), {
      amount: "12.500 BD",
      helper: "Paid at the venue",
    });
  });
});

describe("friendlyGameOccupancyLabel", () => {
  it("reads N of capacity players when a cap exists", () => {
    assert.equal(friendlyGameOccupancyLabel(2, 4, "en"), "2 of 4 players");
  });

  it("drops the cap when players allowed is unset", () => {
    assert.equal(friendlyGameOccupancyLabel(1, null, "en"), "1 player");
    assert.equal(friendlyGameOccupancyLabel(3, undefined, "en"), "3 players");
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

describe("friendlyGameDateDurationLine", () => {
  it("is the date when duration is unset", () => {
    const start = new Date(2026, 8, 6, 19, 0, 0);
    assert.equal(
      friendlyGameDateDurationLine(start, null, "en"),
      formatAbsoluteDay(start, "en"),
    );
  });

  it("appends duration when the first Match has minutes", () => {
    const start = new Date(2026, 8, 6, 19, 0, 0);
    assert.equal(
      friendlyGameDateDurationLine(start, 90, "en"),
      `${formatAbsoluteDay(start, "en")} · 90 min`,
    );
  });

  it("is null when the window is unset", () => {
    assert.equal(friendlyGameDateDurationLine(null, 90, "en"), null);
  });
});

describe("friendlyGameVenueDirectionsUrl", () => {
  it("uses the pin when the Venue has one", () => {
    assert.equal(
      friendlyGameVenueDirectionsUrl({
        name: "Bay Padel",
        city: "Porto",
        latitude: "26.228509",
        longitude: "50.58605",
      }),
      "https://www.google.com/maps/search/?api=1&query=26.228509,50.58605",
    );
  });

  it("searches the name and city without a pin", () => {
    assert.equal(
      friendlyGameVenueDirectionsUrl({
        name: "Bay Padel",
        city: "Porto",
        latitude: null,
        longitude: null,
      }),
      "https://www.google.com/maps/search/?api=1&query=Bay%20Padel%2C%20Porto",
    );
  });
});

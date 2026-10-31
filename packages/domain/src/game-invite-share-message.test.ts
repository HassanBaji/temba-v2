import { bahrainDayFromToday } from "./bahrain-date.test-support";
import { describe, expect, it } from "vitest";

import { formatGameTimeWindow, formatRelativeDay } from "./format-game-start";
import {
  formatGameInviteShareMessage,
  gameInviteClipboardText,
} from "./game-invite-share-message";

const shortUrl = "https://app.example/g/A3F8K2PQ";

describe("formatGameInviteShareMessage", () => {
  it("writes the canonical English emoji roster with each Position, Open seats and the short join URL", () => {
    const windowStart = bahrainDayFromToday(0, 19);
    const windowEnd = bahrainDayFromToday(0, 20);
    const message = formatGameInviteShareMessage({
      venueName: "Padel Club",
      courtName: "Court 2",
      windowStart,
      windowEnd,
      sides: [
        {
          sideIndex: 1,
          left: { name: "Ada" },
          right: null,
        },
        {
          sideIndex: 2,
          left: { name: "Lin" },
          right: { name: "Sam" },
        },
      ],
      shortUrl,
    });

    expect(message).toBe(
      [
        "📍 Padel Club",
        "🎾 Court 2",
        `📅 ${formatRelativeDay(windowStart)}`,
        `🕗 ${formatGameTimeWindow(windowStart, windowEnd, windowStart)}`,
        "",
        "👕 Team 1",
        "- Left: Ada",
        "- Right: Open",
        "",
        "👕 Team 2",
        "- Left: Lin",
        "- Right: Sam",
        "",
        "🔗 Join:",
        shortUrl,
      ].join("\n"),
    );
    expect(message).not.toContain("Court Court");
  });

  it("omits the court line when the Match has no Court", () => {
    const windowStart = new Date();
    const message = formatGameInviteShareMessage({
      venueName: "Padel Club",
      courtName: null,
      windowStart,
      windowEnd: windowStart,
      sides: [],
      shortUrl,
    });
    expect(message).not.toContain("🎾");
    expect(message.startsWith("📍 Padel Club\n📅 ")).toBe(true);
    expect(message).toContain("- Left: Open");
    expect(message).toContain("- Right: Open");
    expect(message).toContain(shortUrl);
  });

  it("opens with the Game's custom name when it has one", () => {
    const windowStart = new Date();
    const message = formatGameInviteShareMessage({
      customName: "  Thursday Smash ",
      venueName: "Padel Club",
      courtName: null,
      windowStart,
      windowEnd: windowStart,
      sides: [],
      shortUrl,
    });
    expect(message.startsWith("Thursday Smash\n\n📍 Padel Club\n")).toBe(true);
  });

  it("skips a blank custom name", () => {
    const windowStart = new Date();
    const message = formatGameInviteShareMessage({
      customName: "   ",
      venueName: "Padel Club",
      courtName: null,
      windowStart,
      windowEnd: windowStart,
      sides: [],
      shortUrl,
    });
    expect(message.startsWith("📍 Padel Club\n")).toBe(true);
  });
});

describe("gameInviteClipboardText", () => {
  it("copies the roster only for an individual Friendly game", () => {
    const roster = {
      venueName: "Padel Club",
      courtName: null as string | null,
      windowStart: new Date(),
      windowEnd: new Date(),
      sides: [],
      shortUrl,
    };
    expect(
      gameInviteClipboardText({
        format: "friendly_game",
        registrationMode: "individual",
        shortUrl,
        roster,
      }),
    ).toContain("👕 Team 1");
    expect(
      gameInviteClipboardText({
        format: "americano",
        registrationMode: "individual",
        shortUrl,
        roster,
      }),
    ).toBe(shortUrl);
    expect(
      gameInviteClipboardText({
        format: "friendly_game",
        registrationMode: "team_only",
        shortUrl,
        roster,
      }),
    ).toBe(shortUrl);
    expect(
      gameInviteClipboardText({
        format: "friendly_tournament",
        registrationMode: "individual",
        shortUrl,
        roster,
      }),
    ).toBe(shortUrl);
  });

  it("copies just the link for a football Friendly game, which has no teams or seats", () => {
    expect(
      gameInviteClipboardText({
        format: "friendly_game",
        sport: "football",
        registrationMode: "individual",
        shortUrl,
        roster: {
          venueName: "Pitch Club",
          courtName: null,
          windowStart: new Date(),
          windowEnd: new Date(),
          sides: [],
          shortUrl,
        },
      }),
    ).toBe(shortUrl);
  });

  it("puts the custom name above the link when only the link is copied", () => {
    expect(
      gameInviteClipboardText({
        format: "friendly_game",
        sport: "football",
        registrationMode: "individual",
        shortUrl,
        roster: {
          customName: "Friday Five",
          venueName: "Pitch Club",
          courtName: null,
          windowStart: new Date(),
          windowEnd: new Date(),
          sides: [],
          shortUrl,
        },
      }),
    ).toBe(`Friday Five\n${shortUrl}`);
  });
});

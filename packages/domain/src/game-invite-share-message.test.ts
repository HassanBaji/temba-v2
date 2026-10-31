import { bahrainDayFromToday } from "./bahrain-date.test-support";
import { describe, expect, it } from "vitest";

import { formatGameTimeWindow, formatRelativeDay } from "./format-game-start";
import {
  formatFootballInviteShareMessage,
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

  it("copies the football details and numbered player list for a football Friendly game", () => {
    const windowStart = bahrainDayFromToday(1, 20);
    const windowEnd = bahrainDayFromToday(1, 21);
    const message = gameInviteClipboardText({
      format: "friendly_game",
      sport: "football",
      registrationMode: "individual",
      shortUrl,
      roster: {
        venueName: "Pitch Club",
        courtName: "Pitch 1",
        windowStart,
        windowEnd,
        sides: [],
        shortUrl,
        football: {
          sideSize: 2,
          playersAllowed: 5,
          players: [{ name: "Ada" }, { name: "Lin" }],
        },
      },
    });

    expect(message).toBe(
      [
        "📍 Pitch Club",
        "⚽ Pitch 1",
        `📅 ${formatRelativeDay(windowStart)}`,
        `🕗 ${formatGameTimeWindow(windowStart, windowEnd, windowStart)}`,
        "👥 2-a-side",
        "",
        "👕 Players (2/5)",
        "1. Ada",
        "2. Lin",
        "3. Open",
        "4. Open",
        "5. Open",
        "",
        "🔗 Join:",
        shortUrl,
      ].join("\n"),
    );
  });

  it("lists every football player when there is no cap", () => {
    const message = formatFootballInviteShareMessage(
      {
        venueName: "Pitch Club",
        courtName: null,
        windowStart: new Date(),
        windowEnd: new Date(),
        sides: [],
        shortUrl,
      },
      { sideSize: null, playersAllowed: null, players: [{ name: "Ada" }] },
    );
    expect(message).not.toContain("⚽");
    expect(message).not.toContain("👥");
    expect(message).toContain("👕 Players (1)\n1. Ada\n\n🔗 Join:");
  });

  it("copies just the link for a football Friendly game without its player list", () => {
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
});

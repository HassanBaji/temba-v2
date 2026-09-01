import { describe, expect, it } from "vitest";

import {
  formatGameTimeWindow,
  formatRelativeDay,
} from "~/lib/format-game-start";
import {
  formatGameInviteShareMessage,
  gameInviteClipboardText,
} from "~/lib/game-invite-share-message";

const shortUrl = "https://app.example/g/A3F8K2PQ";

describe("formatGameInviteShareMessage", () => {
  it("writes the canonical English emoji roster with Open seats and the short join URL", () => {
    const windowStart = new Date();
    windowStart.setHours(19, 0, 0, 0);
    const windowEnd = new Date();
    windowEnd.setHours(20, 0, 0, 0);
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
        "- Ada",
        "- Open",
        "",
        "👕 Team 2",
        "- Lin",
        "- Sam",
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
    expect(message).toContain("- Open");
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
});

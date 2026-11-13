import { bahrainDayFromToday } from "./bahrain-date.test-support";
import { describe, expect, it } from "vitest";

import { formatGameTimeWindow, formatRelativeDay } from "./format-game-start";
import {
  formatFootballInviteShareMessage,
  formatGameInviteShareMessage,
  gameInviteClipboardText,
} from "./game-invite-share-message";
import { formatLevelRangeLabel } from "./level-range";

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
      locale: "en",
    });

    expect(message).toBe(
      [
        "📍 Padel Club",
        "🎾 Court 2",
        `📅 ${formatRelativeDay(windowStart, "en")}`,
        `🕗 ${formatGameTimeWindow(windowStart, windowEnd, windowStart, "en")}`,
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

  describe("day line", () => {
    const dayLine = (windowStart: Date, locale: "en" | "ar" = "en") =>
      formatGameInviteShareMessage({
        venueName: "Padel Club",
        courtName: null,
        windowStart,
        windowEnd: windowStart,
        sides: [],
        shortUrl,
        locale,
      }).split("\n")[1];

    it("says this afternoon for a Game starting this afternoon", () => {
      expect(dayLine(bahrainDayFromToday(0, 12))).toBe("📅 This afternoon");
      expect(dayLine(bahrainDayFromToday(0, 16))).toBe("📅 This afternoon");
      expect(dayLine(bahrainDayFromToday(0, 15), "ar")).toBe(
        "📅 بعد ظهر اليوم",
      );
    });

    it("says tonight for a Game starting this evening", () => {
      expect(dayLine(bahrainDayFromToday(0, 17))).toBe("📅 Tonight");
    });

    it("says tomorrow for a Game starting tomorrow afternoon", () => {
      expect(dayLine(bahrainDayFromToday(1, 15))).toBe("📅 Tomorrow");
    });
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
      locale: "en",
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
      locale: "en",
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
      locale: "en",
    });
    expect(message.startsWith("📍 Padel Club\n")).toBe(true);
  });
});

describe("Level range and waiting list", () => {
  it("adds the Level range under the time and lists the waiting list before the join link", () => {
    const windowStart = bahrainDayFromToday(0, 19);
    const message = formatGameInviteShareMessage({
      venueName: "Padel Club",
      courtName: null,
      windowStart,
      windowEnd: windowStart,
      sides: [],
      shortUrl,
      levelMinTenths: 21,
      levelMaxTenths: 34,
      waitlist: [{ name: "Noor" }, { name: " " }, { name: "Omar" }],
      locale: "en",
    });
    const lines = message.split("\n");
    expect(lines[3]).toBe(
      `📊 Level: ${formatLevelRangeLabel(21, 34, "en") ?? ""}`,
    );
    expect(message).toContain(
      "- Right: Open\n\n⏳ Waiting list\n1- Noor\n2- Omar\n\n🔗 Join:",
    );
  });

  it("leaves out the Level and waiting list when the Game has neither", () => {
    const message = formatGameInviteShareMessage({
      venueName: "Padel Club",
      courtName: null,
      windowStart: new Date(),
      windowEnd: new Date(),
      sides: [],
      shortUrl,
      waitlist: [],
      locale: "en",
    });
    expect(message).not.toContain("📊");
    expect(message).not.toContain("⏳");
  });

  it("lists the waiting list after the keepers for a football Friendly game", () => {
    const message = formatFootballInviteShareMessage(
      {
        venueName: "Pitch Club",
        courtName: null,
        windowStart: new Date(),
        windowEnd: new Date(),
        sides: [],
        shortUrl,
        levelMinTenths: 28,
        levelMaxTenths: null,
        waitlist: [{ name: "Zed" }],
        locale: "ar",
      },
      { sideSize: null, playersAllowed: null, players: [] },
    );
    expect(message).toContain(
      `📊 المستوى: ${formatLevelRangeLabel(28, null, "ar") ?? ""}`,
    );
    expect(message).toContain(
      "🧤 حراس المرمى\n1-\n2-\n\n⏳ قائمة الانتظار\n1- Zed\n\n🔗 انضم:",
    );
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
      locale: "en" as const,
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

  it("copies the football details with players and keepers listed apart for a football Friendly game", () => {
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
          playersAllowed: 6,
          players: [
            { name: "Ada", role: "outfield" },
            { name: "Kai", role: "keeper" },
            { name: "Lin", role: "outfield" },
          ],
        },
        locale: "en",
      },
    });

    expect(message).toBe(
      [
        "📍 Pitch Club",
        "⚽ Pitch 1",
        `📅 ${formatRelativeDay(windowStart, "en")}`,
        `🕗 ${formatGameTimeWindow(windowStart, windowEnd, windowStart, "en")}`,
        "👥 2-a-side",
        "",
        "👕 Players",
        "1- Ada",
        "2- Lin",
        "3-",
        "4-",
        "",
        "🧤 Keepers",
        "1- Kai",
        "2-",
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
        locale: "en",
      },
      { sideSize: null, playersAllowed: null, players: [{ name: "Ada" }] },
    );
    expect(message).not.toContain("⚽");
    expect(message).not.toContain("👥");
    expect(message).toContain(
      "👕 Players\n1- Ada\n\n🧤 Keepers\n1-\n2-\n\n🔗 Join:",
    );
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
          locale: "en",
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
          locale: "en",
        },
      }),
    ).toBe(`Friday Five\n${shortUrl}`);
  });
});

describe("Arabic share message", () => {
  it("writes the roster lines in Arabic", () => {
    const windowStart = bahrainDayFromToday(0, 19);
    const message = formatGameInviteShareMessage({
      venueName: "Padel Club",
      courtName: null,
      windowStart,
      windowEnd: windowStart,
      sides: [{ sideIndex: 1, left: { name: "Ada" }, right: null }],
      shortUrl,
      locale: "ar",
    });
    expect(message).toContain("👕 الفريق 1\n- يسار: Ada\n- يمين: شاغر");
    expect(message).toContain("🔗 انضم:");
  });
});

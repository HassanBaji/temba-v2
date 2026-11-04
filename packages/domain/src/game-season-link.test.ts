import { describe, expect, it } from "vitest";

import {
  gameSeasonChoices,
  gameSeasonFix,
  seasonLinkActionLabel,
  seasonLinkRowNote,
  seasonOutsideDayMessage,
  seasonPickerSubtitle,
  seasonsOpenForDay,
} from "./game-season-link";
import type { GroupSeasonData } from "./group-season";

const NOW = new Date("2026-11-02T10:00:00Z");

const season = (
  id: string,
  name: string,
  startsOn: string,
  endsOn: string,
  closedAt: Date | null = null,
): GroupSeasonData => ({ id, name, startsOn, endsOn, closedAt });

const s2 = season("s2", "Season 2", "2026-08-01", "2026-10-31");
const s3 = season("s3", "Season 3", "2026-11-01", "2027-01-31");
const s4 = season("s4", "Season 4", "2027-02-01", "2027-04-30");
const seasons = [s2, s3, s4];

describe("gameSeasonChoices", () => {
  it("leads with No season, then the fitting Season, then the rest newest first", () => {
    const choices = gameSeasonChoices(seasons, "2026-11-02", NOW, "en");
    expect(choices.map((choice) => choice.id)).toEqual([
      null,
      "s3",
      "s4",
      "s2",
    ]);
    expect(choices[0]).toMatchObject({
      name: "No season",
      dates: "Friendly",
      selectable: true,
      badge: null,
    });
    expect(choices[1]).toMatchObject({
      name: "Season 3",
      dates: "1 Nov – 31 Jan",
      note: "Mon 2 Nov falls inside this window.",
      badge: "ACTIVE",
      selectable: true,
    });
    expect(choices[2]).toMatchObject({
      note: "Starts after the game day.",
      badge: "UPCOMING",
      selectable: false,
    });
    expect(choices[3]).toMatchObject({
      note: "Closed and locked.",
      badge: "CLOSED",
      selectable: false,
    });
  });

  it("lets an upcoming Season take a Game on one of its days", () => {
    const open = seasonsOpenForDay(seasons, "2027-02-01", NOW);
    expect(open.map((row) => row.id)).toEqual(["s4"]);
  });

  it("never offers a Season closed early, even on a day inside it", () => {
    const closed = season(
      "s3",
      "Season 3",
      "2026-11-01",
      "2026-11-02",
      new Date("2026-11-02T08:00:00Z"),
    );
    expect(seasonsOpenForDay([closed], "2026-11-01", NOW)).toEqual([]);
  });
});

describe("copy", () => {
  it("counts the open Seasons in the row note", () => {
    expect(seasonLinkRowNote("Gooz of Arad", 1, "2026-11-02", "en")).toBe(
      "Gooz of Arad has 1 season open for Mon 2 Nov.",
    );
    expect(seasonLinkRowNote("Gooz of Arad", 0, "2026-11-02", "en")).toBe(
      "Gooz of Arad has no season open for Mon 2 Nov.",
    );
  });

  it("names the day in the picker subtitle", () => {
    expect(seasonPickerSubtitle("Gooz of Arad", "2026-11-02", "en")).toBe(
      "Gooz of Arad. The game day, Mon 2 Nov, decides which seasons fit.",
    );
  });

  it("labels the picker action by the choice", () => {
    expect(seasonLinkActionLabel({ id: null, name: "No season" }, "en")).toBe(
      "Keep as a friendly",
    );
    expect(seasonLinkActionLabel({ id: "s3", name: "Season 3" }, "en")).toBe(
      "Link Season 3",
    );
    expect(seasonOutsideDayMessage(s3, "2027-02-01", "en")).toBe(
      "Mon 1 Feb is outside Season 3",
    );
  });
});

describe("gameSeasonFix", () => {
  it("is quiet while the day stays inside the linked Season", () => {
    expect(gameSeasonFix(s3, seasons, "2026-12-15", NOW, "en")).toBeNull();
    expect(gameSeasonFix(null, seasons, "2027-06-01", NOW, "en")).toBeNull();
  });

  it("offers the Season that covers the new day", () => {
    const fix = gameSeasonFix(s3, seasons, "2027-02-01", NOW, "en");
    expect(fix).toMatchObject({
      replacement: s4,
      endsLine: "ends 31 Jan",
      line: "Mon 1 Feb is outside Season 3. Season 4 covers that day.",
      keepLine: "Or move the day back to 31 Jan or earlier to keep Season 3.",
      moveLabel: "Move to Season 4",
    });
  });

  it("offers only an unlink when no Season covers the day", () => {
    const fix = gameSeasonFix(s3, seasons, "2027-06-01", NOW, "en");
    expect(fix).toMatchObject({
      replacement: null,
      line: "Tue 1 Jun is outside Season 3. No season covers that day.",
      moveLabel: null,
    });
  });

  it("asks for the day to move forward when it fell before the start", () => {
    const fix = gameSeasonFix(s4, seasons, "2026-12-15", NOW, "en");
    expect(fix).toMatchObject({
      replacement: s3,
      endsLine: "starts 1 Feb",
      keepLine: "Or move the day forward to 1 Feb or later to keep Season 4.",
    });
  });
});

describe("Arabic copy", () => {
  it("writes the row note and the fix in Arabic", () => {
    expect(seasonLinkRowNote("Gooz of Arad", 2, "2026-11-02", "ar")).toBe(
      "لدى Gooz of Arad موسمان مفتوحان في الاثنين 2 نوفمبر.",
    );
    expect(gameSeasonFix(s3, seasons, "2027-02-01", NOW, "ar")).toMatchObject({
      moveLabel: "الانتقال إلى Season 4",
      endsLine: "ينتهي 31 يناير",
    });
    expect(
      gameSeasonChoices(seasons, "2026-11-02", NOW, "ar")[0],
    ).toMatchObject({ name: "بلا موسم", dates: "ودية" });
  });
});

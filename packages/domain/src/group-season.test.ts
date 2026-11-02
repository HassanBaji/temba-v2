import { describe, expect, it } from "vitest";

import {
  closeSeasonBody,
  defaultSeasonLens,
  formatSeasonRange,
  groupSeasonStatus,
  groupSeasonWindow,
  isInSeasonWindow,
  newSeasonSummaryLine,
  seasonBoundaryLabel,
  seasonCloseEndsLine,
  seasonDatesError,
  seasonForDate,
  seasonLengthDays,
  seasonLensChips,
  seasonProgressLine,
  seasonStartsLine,
  suggestedSeasonEnd,
  suggestedSeasonName,
  suggestedSeasonStart,
  type GroupSeasonData,
} from "./group-season";

const season = (
  id: string,
  startsOn: string,
  endsOn: string,
  closedAt: Date | null = null,
): GroupSeasonData => ({
  id,
  name: `Season ${id}`,
  startsOn,
  endsOn,
  closedAt,
});

const s1 = season("1", "2026-05-01", "2026-07-31");
const s2 = season("2", "2026-08-01", "2026-10-31");
const s3 = season("3", "2026-11-01", "2027-01-31");

describe("groupSeasonStatus", () => {
  it("reads upcoming, active and closed from product-timezone days", () => {
    const now = new Date("2026-11-04T20:00:00Z");
    expect(groupSeasonStatus(s1, now)).toBe("closed");
    expect(groupSeasonStatus(s3, now)).toBe("active");
    expect(
      groupSeasonStatus(season("4", "2027-02-01", "2027-04-30"), now),
    ).toBe("upcoming");
    // 23:30 UTC on 31 Oct is already 1 Nov in Bahrain.
    expect(groupSeasonStatus(s2, new Date("2026-10-31T21:30:00Z"))).toBe(
      "closed",
    );
  });

  it("is closed once stamped, whatever the dates say", () => {
    expect(
      groupSeasonStatus(
        season(
          "3",
          "2026-11-01",
          "2027-01-31",
          new Date("2026-12-01T10:00:00Z"),
        ),
        new Date("2026-12-05T10:00:00Z"),
      ),
    ).toBe("closed");
  });
});

describe("groupSeasonWindow", () => {
  it("spans the first day's start to the day after the last day", () => {
    const window = groupSeasonWindow(s2);
    expect(window.start.toISOString()).toBe("2026-07-31T21:00:00.000Z");
    expect(window.endExclusive.toISOString()).toBe("2026-10-31T21:00:00.000Z");
    expect(isInSeasonWindow(s2, new Date("2026-10-31T20:59:00Z"))).toBe(true);
    expect(isInSeasonWindow(s2, new Date("2026-10-31T21:00:00Z"))).toBe(false);
  });

  it("stops at the closing instant when closed early", () => {
    const closed = season(
      "2",
      "2026-08-01",
      "2026-10-31",
      new Date("2026-09-15T10:00:00Z"),
    );
    expect(isInSeasonWindow(closed, new Date("2026-09-15T09:00:00Z"))).toBe(
      true,
    );
    expect(isInSeasonWindow(closed, new Date("2026-09-15T11:00:00Z"))).toBe(
      false,
    );
  });
});

describe("season copy", () => {
  it("formats the range, the length and the progress", () => {
    expect(formatSeasonRange(s3)).toBe("1 Nov – 31 Jan");
    expect(seasonLengthDays(s3)).toBe(92);
    expect(seasonProgressLine(s3, new Date("2026-12-05T10:00:00Z"))).toBe(
      "Day 35 of 92",
    );
    expect(seasonProgressLine(s3, new Date("2026-10-01T10:00:00Z"))).toBe(
      "Day 1 of 92",
    );
    expect(seasonStartsLine(season("3", "2026-11-09", "2027-01-31"))).toBe(
      "Starts Monday 9 Nov",
    );
    expect(seasonBoundaryLabel(s2)).toBe("SEASON 2 / 1 AUG – 31 OCT");
  });

  it("describes the close", () => {
    expect(seasonCloseEndsLine(s3, new Date("2026-12-02T10:00:00Z"))).toBe(
      "Today, 60 days early",
    );
    expect(seasonCloseEndsLine(s3, new Date("2027-01-31T10:00:00Z"))).toBe(
      "Today",
    );
    expect(closeSeasonBody({ gamesCounted: 41, awaitingScoreCount: 2 })).toBe(
      "The standing locks in its current order. 41 confirmed games count. 2 games still waiting on a score won't.",
    );
    expect(closeSeasonBody({ gamesCounted: 1, awaitingScoreCount: 0 })).toBe(
      "The standing locks in its current order. 1 confirmed game counts.",
    );
  });
});

describe("seasonDatesError", () => {
  it("refuses a reversed window and an overlap", () => {
    expect(
      seasonDatesError({ startsOn: "2027-02-10", endsOn: "2027-02-01" }, []),
    ).toBe("The season must end after it starts.");
    expect(
      seasonDatesError({ startsOn: "2027-01-31", endsOn: "2027-04-30" }, [s3]),
    ).toBe("Seasons can't overlap.");
    expect(
      seasonDatesError({ startsOn: "2027-02-01", endsOn: "2027-04-30" }, [s3]),
    ).toBeNull();
    expect(
      seasonDatesError({ startsOn: "nope", endsOn: "2027-04-30" }, []),
    ).toBe("Pick a start and an end day.");
  });
});

describe("lens", () => {
  it("opens on the active Season, else the next, else the latest, else all-time", () => {
    const now = new Date("2026-11-04T10:00:00Z");
    expect(defaultSeasonLens([s1, s2, s3], now)).toBe("3");
    expect(defaultSeasonLens([s1, s2], now)).toBe("2");
    expect(
      defaultSeasonLens(
        [
          s1,
          season("4", "2027-02-01", "2027-04-30"),
          season("5", "2027-05-01", "2027-07-31"),
        ],
        now,
      ),
    ).toBe("4");
    expect(defaultSeasonLens([], now)).toBeNull();
  });

  it("lists chips newest first and all-time last", () => {
    expect(seasonLensChips([s1, s3, s2]).map((chip) => chip.label)).toEqual([
      "Season 3",
      "Season 2",
      "Season 1",
      "All-time",
    ]);
  });

  it("finds the Season a Match counts toward", () => {
    expect(
      seasonForDate([s1, s2, s3], new Date("2026-09-01T10:00:00Z"))?.id,
    ).toBe("2");
    expect(
      seasonForDate([s1, s2], new Date("2026-12-01T10:00:00Z")),
    ).toBeNull();
  });
});

describe("new Season defaults", () => {
  it("suggests the next name, the day after the latest Season, and a quarter", () => {
    const now = new Date("2026-11-04T10:00:00Z");
    expect(suggestedSeasonName([s1, s2, s3])).toBe("Season 4");
    expect(suggestedSeasonStart([s1, s2, s3], now)).toBe("2027-02-01");
    expect(suggestedSeasonStart([], now)).toBe("2026-11-04");
    expect(suggestedSeasonStart([s1], now)).toBe("2026-11-04");
    expect(suggestedSeasonEnd("2027-02-01")).toBe("2027-04-30");
  });

  it("sums up the dates under the fields", () => {
    expect(
      newSeasonSummaryLine({ startsOn: "2027-02-01", endsOn: "2027-04-30" }, [
        s1,
        s2,
        s3,
      ]),
    ).toBe(
      "89 days. Starts the day after Season 3 closes. Seasons can't overlap.",
    );
    expect(
      newSeasonSummaryLine({ startsOn: "2027-02-03", endsOn: "2027-04-30" }, [
        s3,
      ]),
    ).toBe(
      "87 days. Starts 2 days after Season 3 closes. Seasons can't overlap.",
    );
    expect(
      newSeasonSummaryLine({ startsOn: "2027-01-01", endsOn: "2027-04-30" }, [
        s3,
      ]),
    ).toBe("Seasons can't overlap.");
  });
});

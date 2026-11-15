import { describe, expect, it } from "vitest";

import {
  baseRateDraft,
  draftProblem,
  draftsFromRules,
  draftsToInput,
  isBaseRate,
  describeWeekdays,
  draftsAreEqual,
  formatClock,
  formatTimeWindow,
  parseHourlyRate,
  rateTimeOptions,
  withBaseRate,
} from "./pricing-model";

describe("pricing model", () => {
  it("parses hourly rates into fils", () => {
    expect(parseHourlyRate("12.5", "en")).toEqual({ ok: true, fils: 12_500 });
    expect(parseHourlyRate("", "en")).toMatchObject({ ok: false });
    expect(parseHourlyRate("-1", "en")).toMatchObject({ ok: false });
    expect(parseHourlyRate("1.2345", "en")).toMatchObject({ ok: false });
  });

  it("builds the base rate as one all-week all-day rule", () => {
    const draft = baseRateDraft("10", "Base rate");
    expect(isBaseRate(draft)).toBe(true);
    expect(draftsToInput([draft], "en")).toEqual({
      ok: true,
      rules: [
        {
          courtId: null,
          weekdays: [0, 1, 2, 3, 4, 5, 6],
          startMinutes: 0,
          endMinutes: 1440,
          hourlyRateFils: 10_000,
          label: "Base rate",
        },
      ],
    });
  });

  it("replaces Venue-wide rules with the base rate and keeps Court overrides", () => {
    const drafts = draftsFromRules([
      {
        id: "a",
        courtId: null,
        weekdays: [1],
        startMinutes: 0,
        endMinutes: 600,
        hourlyRateFils: 5000,
        label: null,
      },
      {
        id: "b",
        courtId: "court-1",
        weekdays: [1],
        startMinutes: 0,
        endMinutes: 600,
        hourlyRateFils: 7000,
        label: "VIP",
      },
    ]);
    const next = withBaseRate(drafts, "9", "Base rate");
    expect(next.map((draft) => draft.courtId)).toEqual([null, "court-1"]);
    expect(isBaseRate(next[0]!)).toBe(true);
    expect(next[1]!.id).toBe("b");
  });

  it("reports problems per draft", () => {
    const draft = baseRateDraft("", "Base rate");
    expect(draftProblem(draft, "en")).toMatch(/hourly rate/);
    expect(
      draftProblem({ ...baseRateDraft("5", "Base rate"), weekdays: [] }, "en"),
    ).toMatch(/weekday/);
    expect(draftsToInput([draft], "en")).toMatchObject({ ok: false });
  });
});

describe("rate card display", () => {
  it("formats clock times on a 12-hour clock, wrapping past midnight", () => {
    expect(formatClock(0, "en")).toBe("12:00 AM");
    expect(formatClock(7 * 60, "en")).toBe("7:00 AM");
    expect(formatClock(16 * 60 + 30, "en")).toBe("4:30 PM");
    expect(formatClock(1500, "en")).toBe("1:00 AM");
    expect(formatTimeWindow(23 * 60, 1500, "en")).toBe("11:00 PM to 1:00 AM");
    expect(formatTimeWindow(23 * 60, 1500, "ar")).toBe("من 11:00 م إلى 1:00 ص");
  });

  it("lists the rate grid up to 06:00 the next day", () => {
    const options = rateTimeOptions(30, "en");
    expect(options[0]).toEqual({ value: 0, label: "12:00 AM" });
    expect(options[options.length - 1]).toEqual({
      value: 1800,
      label: "6:00 AM",
    });
  });

  it("describes weekdays the way the design's DAYS column does", () => {
    expect(describeWeekdays([0, 1, 2, 3, 4, 5, 6], "en")).toBe("All days");
    expect(describeWeekdays([0, 1, 2, 3, 4], "en")).toBe("Sun to Thu");
    expect(describeWeekdays([5, 6, 0], "en")).toBe("Fri to Sun");
    expect(describeWeekdays([4, 5], "en")).toBe("Thu, Fri");
    expect(describeWeekdays([6, 0], "en")).toBe("Sat, Sun");
    expect(describeWeekdays([0, 3, 5], "en")).toBe("Sun, Wed, Fri");
    expect(describeWeekdays([], "en")).toBe("No days");
    expect(describeWeekdays([0, 1, 2, 3, 4], "ar")).toBe("من الأحد إلى الخميس");
  });

  it("compares drafts by content", () => {
    const rule = {
      id: "a",
      courtId: null,
      weekdays: [1],
      startMinutes: 0,
      endMinutes: 600,
      hourlyRateFils: 5000,
      label: null,
    };
    const saved = draftsFromRules([rule]);
    expect(draftsAreEqual(saved, draftsFromRules([rule]))).toBe(true);
    expect(draftsAreEqual(saved, [{ ...saved[0]!, rate: "6.000" }])).toBe(
      false,
    );
  });
});

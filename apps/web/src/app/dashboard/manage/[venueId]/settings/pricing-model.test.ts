import { describe, expect, it } from "vitest";

import {
  baseRateDraft,
  draftProblem,
  draftsFromRules,
  draftsToInput,
  isBaseRate,
  parseHourlyRate,
  withBaseRate,
} from "./pricing-model";

describe("pricing model", () => {
  it("parses hourly rates into fils", () => {
    expect(parseHourlyRate("12.5")).toEqual({ ok: true, fils: 12_500 });
    expect(parseHourlyRate("")).toMatchObject({ ok: false });
    expect(parseHourlyRate("-1")).toMatchObject({ ok: false });
    expect(parseHourlyRate("1.2345")).toMatchObject({ ok: false });
  });

  it("builds the base rate as one all-week all-day rule", () => {
    const draft = baseRateDraft("10");
    expect(isBaseRate(draft)).toBe(true);
    expect(draftsToInput([draft])).toEqual({
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
    const next = withBaseRate(drafts, "9");
    expect(next.map((draft) => draft.courtId)).toEqual([null, "court-1"]);
    expect(isBaseRate(next[0]!)).toBe(true);
    expect(next[1]!.id).toBe("b");
  });

  it("reports problems per draft", () => {
    const draft = baseRateDraft("");
    expect(draftProblem(draft)).toMatch(/hourly rate/);
    expect(draftProblem({ ...baseRateDraft("5"), weekdays: [] })).toMatch(
      /weekday/,
    );
    expect(draftsToInput([draft])).toMatchObject({ ok: false });
  });
});

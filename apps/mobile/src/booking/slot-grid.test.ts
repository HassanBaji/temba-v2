import { describe, expect, it } from "vitest";

import {
  courtChoices,
  dayStrip,
  durationChoices,
  keepOrFirst,
  startTimeGroups,
  weekdayOf,
  type AvailabilityCourt,
} from "./slot-grid";

// Bahrain is UTC+3 all year: 12:00Z reads 15:00 on Thu 15 Oct 2026.
const NOW = new Date("2026-10-15T12:00:00Z");

function at(wall: string) {
  return new Date(`${wall}+03:00`);
}

function slot(wall: string, durations: [number, number][]) {
  return {
    startsAt: at(wall),
    durations: durations.map(([minutes, priceFils]) => ({
      minutes,
      priceFils,
    })),
  };
}

const COURTS: AvailabilityCourt[] = [
  {
    id: "c1",
    name: "Court 1",
    slots: [
      slot("2026-10-15T18:00:00", [
        [60, 8000],
        [90, 12000],
      ]),
      slot("2026-10-15T19:00:00", [[60, 10000]]),
    ],
  },
  {
    id: "c2",
    name: "Court 2",
    slots: [slot("2026-10-15T18:00:00", [[60, 9000]])],
  },
];

describe("dayStrip", () => {
  it("starts with today and covers the horizon", () => {
    const days = dayStrip(NOW, 3);
    expect(days).toEqual([
      { key: "2026-10-15", weekday: "Today", dayOfMonth: 15 },
      { key: "2026-10-16", weekday: "Fri", dayOfMonth: 16 },
      { key: "2026-10-17", weekday: "Sat", dayOfMonth: 17 },
    ]);
  });

  it("reads the product day, not the device day", () => {
    const lateNight = new Date("2026-10-15T22:30:00Z");
    expect(dayStrip(lateNight, 1)[0]?.key).toBe("2026-10-16");
  });
});

describe("weekdayOf", () => {
  it("is the weekday of the calendar day", () => {
    expect(weekdayOf("2026-10-15")).toBe(4);
  });
});

describe("startTimeGroups", () => {
  const base = {
    dayKey: "2026-10-15",
    slotMinutes: 60,
    shortestMinutes: 60,
    minLeadMinutes: 60,
    courts: COURTS,
    now: NOW,
  };

  it("drops starts that are too soon and counts free Courts per start", () => {
    const groups = startTimeGroups({
      ...base,
      windows: [{ opensAtMinutes: 15 * 60, closesAtMinutes: 21 * 60 }],
    });
    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe("PM");
    expect(
      groups[0]?.times.map((time) => [time.label, time.freeCourts]),
    ).toEqual([
      ["4:00", 0],
      ["5:00", 0],
      ["6:00", 2],
      ["7:00", 1],
      ["8:00", 0],
    ]);
  });

  it("never offers a start too close to closing for the shortest length", () => {
    const groups = startTimeGroups({
      ...base,
      shortestMinutes: 90,
      windows: [{ opensAtMinutes: 18 * 60, closesAtMinutes: 20 * 60 }],
    });
    expect(groups[0]?.times.map((time) => time.label)).toEqual(["6:00"]);
  });

  it("splits a morning and an evening window and a window past midnight", () => {
    const groups = startTimeGroups({
      ...base,
      dayKey: "2026-10-16",
      courts: [],
      windows: [
        { opensAtMinutes: 9 * 60, closesAtMinutes: 11 * 60 },
        { opensAtMinutes: 23 * 60, closesAtMinutes: 26 * 60 },
      ],
    });
    expect(
      groups.map((group) => [
        group.label,
        group.times.map((time) => time.label),
      ]),
    ).toEqual([
      ["AM", ["9:00", "10:00"]],
      ["PM", ["11:00"]],
      ["After midnight", ["12:00", "1:00"]],
    ]);
  });
});

describe("durationChoices", () => {
  it("counts the Courts that take each length at the start", () => {
    const choices = durationChoices({
      startsAt: at("2026-10-15T18:00:00"),
      options: [60, 90, 120],
      courts: COURTS,
    });
    expect(
      choices.map((choice) => [choice.minutes, choice.freeCourts]),
    ).toEqual([
      [60, 2],
      [90, 1],
      [120, 0],
    ]);
    expect(choices[1]?.endsAt).toEqual(at("2026-10-15T19:30:00"));
  });
});

describe("courtChoices", () => {
  it("prices free Courts and leaves taken ones unpriced", () => {
    const choices = courtChoices({
      startsAt: at("2026-10-15T18:00:00"),
      minutes: 90,
      venueCourts: [
        { id: "c1", name: "Court 1" },
        { id: "c2", name: "Court 2" },
        { id: "c3", name: "Court 3" },
      ],
      courts: COURTS,
    });
    expect(choices).toEqual([
      { id: "c1", name: "Court 1", priceFils: 12000 },
      { id: "c2", name: "Court 2", priceFils: null },
      { id: "c3", name: "Court 3", priceFils: null },
    ]);
  });
});

describe("keepOrFirst", () => {
  it("keeps a choice that is still offered", () => {
    expect(keepOrFirst(90, [60, 90])).toBe(90);
  });

  it("falls back to the first offered choice", () => {
    expect(keepOrFirst(120, [60, 90])).toBe(60);
    expect(keepOrFirst(null, [60])).toBe(60);
    expect(keepOrFirst(60, [])).toBeNull();
  });
});

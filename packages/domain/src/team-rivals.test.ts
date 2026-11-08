import { describe, expect, it } from "vitest";

import {
  closestRivalLine,
  headToHeadLine,
  headToHeadSpoken,
  teamRivalRow,
} from "./team-rivals";

const RECORD = { wins: 2, draws: 1, losses: 1 };

describe("headToHeadLine", () => {
  it("reads wins–losses on padel and wins–draws–losses on football", () => {
    expect(headToHeadLine(RECORD, "padel", "en")).toBe("2–1");
    expect(headToHeadLine(RECORD, "football", "en")).toBe("2–1–1");
    expect(headToHeadSpoken(RECORD, "football", "en")).toBe(
      "Head-to-head: won 2, drew 1, lost 1",
    );
  });
});

describe("teamRivalRow", () => {
  const rival = {
    teamId: "t",
    name: null,
    played: 2,
    ...RECORD,
    lastResult: null,
    lastPlayedAt: new Date("2026-09-04T17:00:00.000Z"),
  };

  it("falls back for a missing name and says when the last had no score", () => {
    expect(teamRivalRow(rival, "padel", "en")).toMatchObject({
      name: "Opponent",
      played: "2 Matches",
      last: "Last: No score yet, 4 Sep",
    });
  });

  it("writes Arabic copy", () => {
    expect(teamRivalRow(rival, "padel", "ar").played).toBe("مباراتان");
  });
});

describe("closestRivalLine", () => {
  it("names the Team played once", () => {
    expect(closestRivalLine({ name: "Hidd United" }, "en")).toBe(
      "Closest: Hidd United, played once. One more Match makes them a Rival.",
    );
  });
});

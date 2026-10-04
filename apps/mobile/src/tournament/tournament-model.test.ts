import {
  createKnockoutTournamentFixtures,
  createTournamentFixtures,
} from "@repo/domain/tournament-details-fixtures";
import { describe, expect, it } from "vitest";

import { matchHeading, scorableMatches } from "./tournament-model";

const now = new Date("2026-09-20T12:00:00.000Z");
const pool = createTournamentFixtures(now);
const knockout = createKnockoutTournamentFixtures(now);

describe("scorableMatches", () => {
  it("lists only Matches the viewer may score", () => {
    const matches = scorableMatches(pool.postedMid);
    expect(matches.length).toBeGreaterThan(0);
    const ids = new Set(
      pool.postedMid.matches
        .filter((match) => match.canScoreSets)
        .map((match) => match.id),
    );
    expect(matches.every((match) => ids.has(match.id))).toBe(true);
  });

  it("flags a level Knockout Match as needing a deciding Set", () => {
    const [level] = scorableMatches(knockout.knockoutOnlyMid);
    expect(level?.needsDecidingSet).toBe(true);
    expect(level?.note).toBe("Add a deciding Set");
    expect(level?.heading).toBe("Semi-finals, S1");
  });

  it("shows nothing to score once everything is final", () => {
    expect(scorableMatches(knockout.knockoutOnlyChampion)).toEqual([]);
  });

  it("names Pool Matches by Round", () => {
    const first = pool.postedMid.matches[0];
    expect(first && matchHeading(pool.postedMid, first)).toBe("Round 1");
  });
});

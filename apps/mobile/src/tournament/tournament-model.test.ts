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
    const matches = scorableMatches(pool.postedMid, "en");
    expect(matches.length).toBeGreaterThan(0);
    const ids = new Set(
      pool.postedMid.matches
        .filter((match) => match.canScoreSets)
        .map((match) => match.id),
    );
    expect(matches.every((match) => ids.has(match.id))).toBe(true);
  });

  it("flags a level Knockout Match as needing a deciding Set", () => {
    const [level] = scorableMatches(knockout.knockoutOnlyMid, "en");
    expect(level?.needsDecidingSet).toBe(true);
    expect(level?.note).toBe("Add a deciding Set");
    expect(level?.heading).toBe("Semi-finals, S1");
  });

  it("offers the other team's pending score to confirm", () => {
    const [first, ...rest] = pool.postedMid.matches;
    if (!first) {
      throw new Error("expected a posted Match");
    }
    const pending = {
      ...pool.postedMid,
      matches: [
        {
          ...first,
          canScoreSets: false,
          canConfirmScore: true,
          sets: [{ id: "set-1", slot1GamesWon: 6, slot2GamesWon: 4, wins: [] }],
        },
        ...rest.map((match) => ({ ...match, canConfirmScore: false })),
      ],
    };
    const matches = scorableMatches(pending, "en");
    const confirming = matches.find((match) => match.id === first.id);
    expect(confirming?.scoreToConfirm).toBe("6–4");
    expect(confirming?.canEnter).toBe(false);
    expect(
      matches
        .filter((match) => match.id !== first.id)
        .every((match) => match.scoreToConfirm == null && match.canEnter),
    ).toBe(true);
  });

  it("has nothing to confirm before a score is in", () => {
    const [first, ...rest] = pool.postedMid.matches;
    if (!first) {
      throw new Error("expected a posted Match");
    }
    const unscored = {
      ...pool.postedMid,
      matches: [
        { ...first, canScoreSets: false, canConfirmScore: true, sets: [] },
        ...rest,
      ],
    };
    expect(
      scorableMatches(unscored, "en").some((match) => match.id === first.id),
    ).toBe(false);
  });

  it("lists a Match the viewer may stamp, as a Verifier who cannot score it", () => {
    const [first, ...rest] = pool.postedMid.matches;
    if (!first) {
      throw new Error("expected a posted Match");
    }
    const stampable = {
      ...pool.postedMid,
      matches: [
        {
          ...first,
          canScoreSets: false,
          canConfirmScore: false,
          canStamp: true,
          sets: [{ id: "set-1", slot1GamesWon: 6, slot2GamesWon: 4, wins: [] }],
        },
        ...rest.map((match) => ({
          ...match,
          canScoreSets: false,
          canConfirmScore: false,
        })),
      ],
    };
    expect(scorableMatches(stampable, "en")).toEqual([
      expect.objectContaining({
        id: first.id,
        canEnter: false,
        scoreToConfirm: null,
        canStamp: true,
      }),
    ]);
  });

  it("lists a Knockout Match the viewer may stamp", () => {
    const [level] = knockout.knockoutOnlyMid.matches.filter(
      (match) => match.canScoreSets,
    );
    if (!level) {
      throw new Error("expected a scorable Knockout Match");
    }
    const game = {
      ...knockout.knockoutOnlyMid,
      matches: knockout.knockoutOnlyMid.matches.map((match) => ({
        ...match,
        canScoreSets: false,
        canConfirmScore: false,
        canStamp: match.id === level.id,
      })),
    };
    const [stampable] = scorableMatches(game, "en");
    expect(stampable).toMatchObject({
      id: level.id,
      heading: "Semi-finals, S1",
      canEnter: false,
      canStamp: true,
    });
  });

  it("shows nothing to score once everything is final", () => {
    expect(scorableMatches(knockout.knockoutOnlyChampion, "en")).toEqual([]);
  });

  it("names Pool Matches by Round", () => {
    const first = pool.postedMid.matches[0];
    expect(first && matchHeading(pool.postedMid, first, "en")).toBe("Round 1");
  });

  it("writes the headings in Arabic", () => {
    const first = pool.postedMid.matches[0];
    expect(first && matchHeading(pool.postedMid, first, "ar")).toBe("الجولة 1");
    const [level] = scorableMatches(knockout.knockoutOnlyMid, "ar");
    expect(level?.note).toBe("أضف شوطًا فاصلًا");
  });
});

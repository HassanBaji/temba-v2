import {
  createKnockoutTournamentFixtures,
  createTournamentFixtures,
} from "@repo/domain/tournament-details-fixtures";
import { describe, expect, it } from "vitest";

import {
  matchHeading,
  scorableMatches,
  tournamentPlayer,
} from "./tournament-model";

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

describe("tournamentPlayer", () => {
  it("finds a seated player with their level", () => {
    const occupant = pool.postedMid.sides.find((side) => side.left)?.left;
    if (!occupant) {
      throw new Error("expected a seated player");
    }
    expect(tournamentPlayer(pool.postedMid, occupant.userId)).toMatchObject({
      userId: occupant.userId,
      name: occupant.name,
    });
  });

  it("falls back to a Game team member when no seat holds them", () => {
    const member = pool.postedMid.gameTeams[0]?.members[0];
    if (!member) {
      throw new Error("expected a Game team member");
    }
    const game = { ...pool.postedMid, sides: [] };
    expect(tournamentPlayer(game, member.id)).toEqual({
      userId: member.id,
      name: member.name,
      image: member.image,
      level: null,
    });
  });

  it("returns null for someone not on the Tournament", () => {
    expect(tournamentPlayer(pool.postedMid, "nobody")).toBeNull();
  });
});

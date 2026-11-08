import { describe, expect, it } from "vitest";

import {
  FOOTBALL_CHALLENGE_SIDE_SIZES,
  formatsPlayable,
  openInviteBudget,
  teamIsComplete,
  teamIsFull,
  teamCanPostFormat,
  teamIsSquad,
  teamRosterRule,
  teamSeatsToComplete,
} from "./team-roster";

describe("teamRosterRule", () => {
  it.each([
    ["padel", { min: 2, max: 2, completeAt: 2, pairIsUnique: true }],
    ["football", { min: 2, max: 20, completeAt: 5, pairIsUnique: false }],
  ] as const)("%s", (sport, rule) => {
    expect(teamRosterRule(sport)).toEqual(rule);
  });
});

describe("complete and full", () => {
  it.each([
    ["padel", 1, false, false],
    ["padel", 2, true, true],
    ["football", 4, false, false],
    ["football", 5, true, false],
    ["football", 19, true, false],
    ["football", 20, true, true],
    ["football", 22, true, true],
  ] as const)("%s with %i members", (sport, count, complete, full) => {
    expect(teamIsComplete(count, sport)).toBe(complete);
    expect(teamIsFull(count, sport)).toBe(full);
  });
});

describe("openInviteBudget", () => {
  it.each([
    ["padel", 1, 0, 1],
    ["padel", 1, 1, 0],
    ["padel", 2, 0, 0],
    ["football", 1, 0, 19],
    ["football", 1, 5, 14],
    ["football", 18, 2, 0],
    ["football", 19, 3, 0],
    ["football", 20, 0, 0],
    ["football", 22, 0, 0],
  ] as const)("%s, %i members, %i unused", (sport, count, unused, budget) => {
    expect(openInviteBudget(count, unused, sport)).toBe(budget);
  });
});

describe("squads and seats", () => {
  it("only football is a squad", () => {
    expect(teamIsSquad("padel")).toBe(false);
    expect(teamIsSquad("football")).toBe(true);
  });

  it("counts the seats left to complete", () => {
    expect(teamSeatsToComplete(1, "padel")).toBe(1);
    expect(teamSeatsToComplete(2, "padel")).toBe(0);
    expect(teamSeatsToComplete(3, "football")).toBe(2);
    expect(teamSeatsToComplete(9, "football")).toBe(0);
  });
});

describe("Challenge formats", () => {
  it("asks for 5, 6 or 7-a-side", () => {
    expect(FOOTBALL_CHALLENGE_SIDE_SIZES).toEqual([5, 6, 7]);
  });

  it.each([
    [4, []],
    [5, [5]],
    [6, [5, 6]],
    [7, [5, 6, 7]],
    [20, [5, 6, 7]],
    [22, [5, 6, 7]],
  ] as const)("a Roster of %i plays %j", (count, formats) => {
    expect(formatsPlayable(count)).toEqual(formats);
  });

  it("posts a Format once the Roster holds its side", () => {
    expect(teamCanPostFormat(5, 6)).toBe(false);
    expect(teamCanPostFormat(6, 6)).toBe(true);
  });

  it("keeps complete meaning the smallest Format", () => {
    expect(teamIsComplete(5, "football")).toBe(true);
    expect(teamIsComplete(4, "football")).toBe(false);
  });
});

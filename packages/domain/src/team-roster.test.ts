import { describe, expect, it } from "vitest";

import {
  openInviteBudget,
  teamIsComplete,
  teamIsFull,
  teamIsSquad,
  teamRosterRule,
  teamSeatsToComplete,
} from "./team-roster";

describe("teamRosterRule", () => {
  it.each([
    ["padel", { min: 2, max: 2, completeAt: 2, pairIsUnique: true }],
    ["football", { min: 2, max: 25, completeAt: 5, pairIsUnique: false }],
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
    ["football", 24, true, false],
    ["football", 25, true, true],
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
    ["football", 1, 0, 24],
    ["football", 1, 5, 19],
    ["football", 23, 2, 0],
    ["football", 24, 3, 0],
    ["football", 25, 0, 0],
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

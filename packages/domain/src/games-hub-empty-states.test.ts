import { describe, expect, it } from "vitest";

import {
  gamesHubEmptyLine,
  gamesHubEmptySeats,
} from "./games-hub-empty-states";

describe("gamesHubEmptySeats", () => {
  it("draws a padel Match for all and padel", () => {
    expect(gamesHubEmptySeats("all")).toBe(4);
    expect(gamesHubEmptySeats("padel")).toBe(4);
  });

  it("draws two football sides for football", () => {
    expect(gamesHubEmptySeats("football")).toBe(10);
  });
});

describe("gamesHubEmptyLine", () => {
  it("names the filtered sport", () => {
    expect(gamesHubEmptyLine("all", "en")).toBe(
      "Games you create or join show up here.",
    );
    expect(gamesHubEmptyLine("football", "en")).toBe(
      "Football Games you create or join show up here.",
    );
  });

  it("names the filtered sport in Arabic", () => {
    expect(gamesHubEmptyLine("football", "ar")).toBe(
      "تظهر هنا مباريات كرة القدم التي تنشئها أو تنضم إليها.",
    );
  });
});

import { describe, expect, it } from "vitest";

import {
  gamesHubEmptyLine,
  gamesHubEmptySeats,
  publicGamesEmptyLine,
  publicGamesEmptyTitle,
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

describe("publicGamesEmptyLine", () => {
  it("names the filtered sport", () => {
    expect(publicGamesEmptyTitle("en")).toBe("No public games right now");
    expect(publicGamesEmptyLine("all", "en")).toBe(
      "Public games at partner venues show here. Make one and anyone in its Level range can join.",
    );
    expect(publicGamesEmptyLine("padel", "en")).toBe(
      "Padel public games at partner venues show here. Make one and anyone in its Level range can join.",
    );
  });
});

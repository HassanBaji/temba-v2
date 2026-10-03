import { describe, expect, it } from "vitest";

import {
  filterVenuesForSelect,
  venueMatchingQuery,
  venueOptionLabel,
} from "./game-venue-select";

const venues = [
  { id: "1", name: "Padel Club", city: "Lisbon", country: "Portugal" },
  { id: "2", name: "Padel Club", city: "Porto", country: "Portugal" },
  { id: "3", name: "Smash House", city: "Madrid", country: "Spain" },
];

describe("venueOptionLabel", () => {
  it("joins name, city, and country", () => {
    expect(
      venueOptionLabel({
        name: "Padel Club",
        city: "Lisbon",
        country: "Portugal",
      }),
    ).toBe("Padel Club — Lisbon, Portugal");
  });
});

describe("filterVenuesForSelect", () => {
  it("returns all venues for a blank query", () => {
    expect(filterVenuesForSelect(venues, "")).toEqual(venues);
    expect(filterVenuesForSelect(venues, "   ")).toEqual(venues);
  });

  it("does not filter when the query is the selected venue label", () => {
    expect(
      filterVenuesForSelect(
        venues,
        "Padel Club — Lisbon, Portugal",
        "Padel Club — Lisbon, Portugal",
      ),
    ).toEqual(venues);
  });

  it("matches name, city, country, or the option label case-insensitively", () => {
    expect(
      filterVenuesForSelect(venues, "porto").map((venue) => venue.id),
    ).toEqual(["2"]);
    expect(
      filterVenuesForSelect(venues, "SPAIN").map((venue) => venue.id),
    ).toEqual(["3"]);
    expect(
      filterVenuesForSelect(venues, "padel").map((venue) => venue.id),
    ).toEqual(["1", "2"]);
    expect(
      filterVenuesForSelect(venues, "lisbon, portugal").map(
        (venue) => venue.id,
      ),
    ).toEqual(["1"]);
  });

  it("returns none when nothing matches", () => {
    expect(filterVenuesForSelect(venues, "Zurich")).toEqual([]);
  });
});

describe("venueMatchingQuery", () => {
  it("commits an exact option label", () => {
    expect(venueMatchingQuery(venues, "Padel Club — Porto, Portugal")?.id).toBe(
      "2",
    );
  });

  it("commits when the query matches exactly one venue", () => {
    expect(venueMatchingQuery(venues, "porto")?.id).toBe("2");
  });

  it("does not commit an ambiguous query", () => {
    expect(venueMatchingQuery(venues, "padel")).toBeUndefined();
    expect(venueMatchingQuery(venues, "")).toBeUndefined();
  });
});

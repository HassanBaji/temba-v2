import { describe, expect, it } from "vitest";

import { activeVenueCountLabel } from "./active-venue-count";

describe("activeVenueCountLabel", () => {
  it("hides the count when there are no Venues", () => {
    expect(activeVenueCountLabel([], "en")).toBeNull();
  });

  it("hides the count when every Venue is archived", () => {
    expect(
      activeVenueCountLabel(
        [{ archivedAt: new Date("2026-01-01") }, { archivedAt: "2026-01-02" }],
        "en",
      ),
    ).toBeNull();
  });

  it("counts only live Venues", () => {
    expect(
      activeVenueCountLabel(
        [
          { archivedAt: null },
          { archivedAt: new Date("2026-01-01") },
          { archivedAt: null },
        ],
        "en",
      ),
    ).toBe("2 venues");
  });

  it("uses the singular label for one live Venue", () => {
    expect(activeVenueCountLabel([{ archivedAt: null }], "en")).toBe("1 venue");
  });

  it("reads in Arabic", () => {
    expect(
      activeVenueCountLabel([{ archivedAt: null }, { archivedAt: null }], "ar"),
    ).toBe("ناديان");
  });
});

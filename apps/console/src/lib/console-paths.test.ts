import { describe, expect, it } from "vitest";

import { segmentFromPathname, venuePath } from "./console-paths";

describe("console paths", () => {
  it("builds the Venue path with the schedule as the default segment", () => {
    expect(venuePath("v1")).toBe("/v1/schedule");
    expect(venuePath("v1", "hours")).toBe("/v1/hours");
  });

  it("reads the active segment from a pathname", () => {
    expect(segmentFromPathname("/v1/bookings/b2", "v1")).toBe("bookings");
    expect(segmentFromPathname("/v1", "v1")).toBeUndefined();
    expect(segmentFromPathname("/other/bookings", "v1")).toBeUndefined();
  });
});

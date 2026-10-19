import { describe, expect, it } from "vitest";

import { describeHorizon, describeLeadTime } from "./booking-rules-model";

describe("booking rules lines", () => {
  it("describes the last-minute cut-off", () => {
    expect(describeLeadTime(0)).toBe("Up to the start");
    expect(describeLeadTime(30)).toBe("30 min before");
    expect(describeLeadTime(120)).toBe("2h before");
  });

  it("describes how far ahead players can book", () => {
    expect(describeHorizon(1)).toBe("Up to 1 day");
    expect(describeHorizon(14)).toBe("Up to 14 days");
  });
});

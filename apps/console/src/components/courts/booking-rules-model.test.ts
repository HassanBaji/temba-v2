import { describe, expect, it } from "vitest";

import { describeHorizon, describeLeadTime } from "./booking-rules-model";

describe("booking rules lines", () => {
  it("describes the last-minute cut-off", () => {
    expect(describeLeadTime(0, "en")).toBe("Up to the start");
    expect(describeLeadTime(30, "en")).toBe("30 min before");
    expect(describeLeadTime(120, "en")).toBe("2h before");
  });

  it("describes how far ahead players can book", () => {
    expect(describeHorizon(1, "en")).toBe("Up to 1 day");
    expect(describeHorizon(14, "en")).toBe("Up to 14 days");
    expect(describeHorizon(2, "ar")).toBe("حتى يومين");
    expect(describeLeadTime(120, "ar")).toBe("قبل ساعتين");
  });
});

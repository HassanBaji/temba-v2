import { describe, expect, it } from "vitest";

import {
  arrowLevel,
  bandInText,
  compactDelta,
  displayBand,
  monthYear,
  nameList,
  signedLevel,
} from "./you-format";

describe("signedLevel", () => {
  it("signs a change with a plus or a true minus", () => {
    expect(signedLevel(0.12)).toBe("+0.12");
    expect(signedLevel(-0.26)).toBe("−0.26");
  });

  it("leaves no change unsigned", () => {
    expect(signedLevel(0)).toBe("0.00");
    expect(signedLevel(-0.001)).toBe("0.00");
  });
});

describe("compactDelta", () => {
  it("drops the leading zero under a Last 10 mark", () => {
    expect(compactDelta(0.04)).toBe("+.04");
    expect(compactDelta(-0.03)).toBe("−.03");
    expect(compactDelta(1.2)).toBe("+1.20");
  });

  it("has nothing for an unrated Match", () => {
    expect(compactDelta(null)).toBeNull();
  });
});

describe("arrowLevel", () => {
  it("points up for a gain and down for a loss", () => {
    expect(arrowLevel(0.12)).toBe("▲ 0.12");
    expect(arrowLevel(-0.05)).toBe("▼ 0.05");
  });
});

describe("displayBand", () => {
  it("writes the display letter with a true minus", () => {
    expect(displayBand("C1")).toBe("C+");
    expect(displayBand("B3")).toBe("B−");
  });
});

describe("monthYear", () => {
  it("names the month and year in Bahrain time", () => {
    expect(monthYear(new Date("2026-03-10T12:00:00Z"), "en")).toBe("Mar 2026");
    expect(monthYear("2026-08-31T22:30:00Z", "en", "long")).toBe(
      "September 2026",
    );
  });
});

describe("nameList", () => {
  it("joins names the way the language does", () => {
    expect(nameList(["Ali R", "Omar S"], "en")).toBe("Ali R & Omar S");
    expect(nameList(["Ali R"], "en")).toBe("Ali R");
  });
});

describe("bandInText", () => {
  it("isolates a band inside Arabic text and leaves English alone", () => {
    expect(bandInText("C+", "en")).toBe("C+");
    expect(bandInText("C+", "ar")).toBe("\u2068C+\u2069");
  });
});

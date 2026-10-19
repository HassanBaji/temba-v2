import { describe, expect, it } from "vitest";

import { zonedDateTimeToInstant } from "@repo/domain/product-timezone";

import {
  closureStatus,
  closureTitle,
  describeClosureWindow,
} from "./closures-model";

function bahrain(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
) {
  return zonedDateTimeToInstant({ year, month, day, hour, minute });
}

const now = bahrain(2026, 11, 3, 9, 0);

describe("closures model", () => {
  it("tells an active Closure from a scheduled one", () => {
    expect(closureStatus(bahrain(2026, 11, 3, 7), now)).toBe("active");
    expect(closureStatus(now, now)).toBe("active");
    expect(closureStatus(bahrain(2026, 11, 3, 10), now)).toBe("scheduled");
  });

  it("titles a Closure by scope and reason", () => {
    expect(closureTitle("Court 3", "resurfacing")).toBe("Court 3, resurfacing");
    expect(closureTitle("All courts", null)).toBe("All courts");
  });

  it("describes a same-day window relative to today", () => {
    expect(
      describeClosureWindow(
        bahrain(2026, 11, 3, 7),
        bahrain(2026, 11, 3, 17),
        now,
      ),
    ).toBe("Today, 7:00 AM to 5:00 PM");
    expect(
      describeClosureWindow(
        bahrain(2026, 11, 4, 7),
        bahrain(2026, 11, 4, 17),
        now,
      ),
    ).toBe("Tomorrow, 7:00 AM to 5:00 PM");
  });

  it("reads a midnight-to-midnight window as all day", () => {
    expect(
      describeClosureWindow(bahrain(2026, 12, 16), bahrain(2026, 12, 17), now),
    ).toBe("Wed 16 Dec, all day");
    expect(
      describeClosureWindow(bahrain(2026, 12, 16), bahrain(2026, 12, 18), now),
    ).toBe("Wed 16 to Thu 17 Dec, all day");
  });

  it("condenses a multi-day window inside one month", () => {
    expect(
      describeClosureWindow(
        bahrain(2026, 11, 6, 8),
        bahrain(2026, 11, 7, 20),
        now,
      ),
    ).toBe("Fri 6 to Sat 7 Nov, 8:00 AM to 8:00 PM");
    expect(
      describeClosureWindow(
        bahrain(2026, 11, 30, 8),
        bahrain(2026, 12, 2, 20),
        now,
      ),
    ).toBe("Mon 30 Nov to Wed 2 Dec, 8:00 AM to 8:00 PM");
  });
});

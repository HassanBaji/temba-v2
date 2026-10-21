import { describe, expect, it } from "vitest";

import { zonedDateTimeToInstant } from "@repo/domain/product-timezone";

import {
  customerCountLabel,
  customerSubtitle,
  isCustomerSort,
  lastBookingLabel,
} from "./customer-list-model";

const at = (year: number, month: number, day: number, hour = 18) =>
  zonedDateTimeToInstant({ year, month, day, hour });

describe("customerSubtitle", () => {
  it("names Temba players by handle and Guests by phone", () => {
    expect(customerSubtitle({ kind: "user", username: "hbaji" })).toBe(
      "Temba, @hbaji",
    );
    expect(customerSubtitle({ kind: "user", username: null })).toBe("Temba");
    expect(customerSubtitle({ kind: "guest", phone: "+973 3300 1111" })).toBe(
      "Phone only, +973 3300 1111",
    );
  });
});

describe("lastBookingLabel", () => {
  const now = at(2030, 1, 10, 12);

  it("reads relative days near today", () => {
    expect(lastBookingLabel(at(2030, 1, 10), now)).toBe("Today");
    expect(lastBookingLabel(at(2030, 1, 9), now)).toBe("Yesterday");
    expect(lastBookingLabel(at(2030, 1, 11), now)).toBe("Tomorrow");
  });

  it("falls back to a date, with the year only when it differs", () => {
    expect(lastBookingLabel(at(2030, 1, 1), now)).toBe("1 Jan");
    expect(lastBookingLabel(at(2029, 11, 20), now)).toBe("20 Nov 2029");
  });
});

describe("customerCountLabel", () => {
  it("counts Customers, or matches while searching", () => {
    expect(customerCountLabel(1, false)).toBe("1 Customer");
    expect(customerCountLabel(12, false)).toBe("12 Customers");
    expect(customerCountLabel(3, true)).toBe("3 matching");
  });
});

describe("isCustomerSort", () => {
  it("accepts only the door's sorts", () => {
    expect(isCustomerSort("owed")).toBe(true);
    expect(isCustomerSort("spent")).toBe(false);
  });
});

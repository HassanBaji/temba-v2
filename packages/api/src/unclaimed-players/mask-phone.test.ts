import { describe, expect, it } from "vitest";

import { maskPhone } from "#src/unclaimed-players/mask-phone";

describe("maskPhone", () => {
  it("keeps the calling code and last four digits of an 8-digit number", () => {
    expect(maskPhone("+97336124408")).toBe("+973 •••• 4408");
  });

  it("keeps the calling code and last four digits of a 9-digit number", () => {
    expect(maskPhone("+966501234567")).toBe("+966 •••• 4567");
  });

  it("keeps the calling code and last four digits of a 10-digit number", () => {
    expect(maskPhone("+12025550123")).toBe("+1 •••• 0123");
  });

  it("shows only the last four digits of an unsupported number", () => {
    expect(maskPhone("+4420794601234")).toBe("•••• 1234");
  });
});

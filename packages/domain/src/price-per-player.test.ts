import { describe, expect, it } from "vitest";

import {
  filsToMajorInput,
  formatPricePerPlayerCardMeta,
  formatPricePerPlayerFils,
  parseOptionalPricePerPlayerFils,
  PRICE_PER_PLAYER_CURRENCY,
  PRICE_PER_PLAYER_FIELD_DESCRIPTION,
  PRICE_PER_PLAYER_MAX_FILS,
} from "./price-per-player";

describe("parseOptionalPricePerPlayerFils", () => {
  it("treats blank as unset", () => {
    expect(parseOptionalPricePerPlayerFils("")).toEqual({
      ok: true,
      fils: null,
    });
    expect(parseOptionalPricePerPlayerFils("   ")).toEqual({
      ok: true,
      fils: null,
    });
  });

  it("parses zero, whole units, one decimal, and two decimals", () => {
    expect(parseOptionalPricePerPlayerFils("0")).toEqual({
      ok: true,
      fils: 0,
    });
    expect(parseOptionalPricePerPlayerFils("50")).toEqual({
      ok: true,
      fils: 50000,
    });
    expect(parseOptionalPricePerPlayerFils("50.5")).toEqual({
      ok: true,
      fils: 50500,
    });
    expect(parseOptionalPricePerPlayerFils("12.50")).toEqual({
      ok: true,
      fils: 12500,
    });
  });

  it("refuses negatives, extra fraction digits, and non-numeric input", () => {
    expect(parseOptionalPricePerPlayerFils("-1").ok).toBe(false);
    expect(parseOptionalPricePerPlayerFils("5.1255")).toEqual({
      ok: false,
      message: "Use up to three decimal places",
    });
    expect(parseOptionalPricePerPlayerFils("abc").ok).toBe(false);
  });

  it("refuses amounts above 1_000_000.000 major units", () => {
    expect(parseOptionalPricePerPlayerFils("1000000.001").ok).toBe(false);
    expect(parseOptionalPricePerPlayerFils("1000000")).toEqual({
      ok: true,
      fils: PRICE_PER_PLAYER_MAX_FILS,
    });
  });
});

describe("formatPricePerPlayerFils", () => {
  it("omits unset, shows Free at zero, and three fraction digits with BD otherwise", () => {
    expect(formatPricePerPlayerFils(null)).toBeNull();
    expect(formatPricePerPlayerFils(undefined)).toBeNull();
    expect(formatPricePerPlayerFils(0)).toBe("Free");
    expect(formatPricePerPlayerFils(50000)).toBe("50.000 BD");
    expect(formatPricePerPlayerFils(12500)).toBe("12.500 BD");
  });
});

describe("formatPricePerPlayerCardMeta", () => {
  it("omits unset, shows Free, or major units BD / player", () => {
    expect(formatPricePerPlayerCardMeta(null)).toBeNull();
    expect(formatPricePerPlayerCardMeta(0)).toBe("Free");
    expect(formatPricePerPlayerCardMeta(50000)).toBe("50.000 BD / player");
    expect(formatPricePerPlayerCardMeta(12500)).toBe("12.500 BD / player");
  });
});

describe("filsToMajorInput", () => {
  it("prefills the organizer Field from fils", () => {
    expect(filsToMajorInput(null)).toBe("");
    expect(filsToMajorInput(0)).toBe("0.000");
    expect(filsToMajorInput(12500)).toBe("12.500");
    expect(filsToMajorInput(5125)).toBe("5.125");
  });
});

describe("PRICE_PER_PLAYER_CURRENCY", () => {
  it("is BD until a stored currency exists", () => {
    expect(PRICE_PER_PLAYER_CURRENCY).toBe("BD");
    expect(PRICE_PER_PLAYER_FIELD_DESCRIPTION).toContain("BD");
  });
});

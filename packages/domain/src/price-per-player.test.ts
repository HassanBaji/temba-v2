import { describe, expect, it } from "vitest";

import {
  filsToMajorInput,
  formatPricePerPlayerCardMeta,
  formatPricePerPlayerFils,
  parseOptionalPricePerPlayerFils,
  PRICE_PER_PLAYER_MAX_FILS,
} from "./price-per-player";

describe("parseOptionalPricePerPlayerFils", () => {
  it("treats blank as unset", () => {
    expect(parseOptionalPricePerPlayerFils("", "en")).toEqual({
      ok: true,
      fils: null,
    });
    expect(parseOptionalPricePerPlayerFils("   ", "en")).toEqual({
      ok: true,
      fils: null,
    });
  });

  it("parses zero, whole units, one decimal, and two decimals", () => {
    expect(parseOptionalPricePerPlayerFils("0", "en")).toEqual({
      ok: true,
      fils: 0,
    });
    expect(parseOptionalPricePerPlayerFils("50", "en")).toEqual({
      ok: true,
      fils: 50000,
    });
    expect(parseOptionalPricePerPlayerFils("50.5", "en")).toEqual({
      ok: true,
      fils: 50500,
    });
    expect(parseOptionalPricePerPlayerFils("12.50", "en")).toEqual({
      ok: true,
      fils: 12500,
    });
  });

  it("refuses negatives, extra fraction digits, and non-numeric input", () => {
    expect(parseOptionalPricePerPlayerFils("-1", "en").ok).toBe(false);
    expect(parseOptionalPricePerPlayerFils("5.1255", "en")).toEqual({
      ok: false,
      message: "Use up to three decimal places",
    });
    expect(parseOptionalPricePerPlayerFils("abc", "en").ok).toBe(false);
  });

  it("refuses amounts above 1_000_000.000 major units", () => {
    expect(parseOptionalPricePerPlayerFils("1000000.001", "en").ok).toBe(false);
    expect(parseOptionalPricePerPlayerFils("1000000", "en")).toEqual({
      ok: true,
      fils: PRICE_PER_PLAYER_MAX_FILS,
    });
  });
});

describe("formatPricePerPlayerFils", () => {
  it("omits unset, shows Free at zero, and three fraction digits with BD otherwise", () => {
    expect(formatPricePerPlayerFils(null, "en")).toBeNull();
    expect(formatPricePerPlayerFils(undefined, "en")).toBeNull();
    expect(formatPricePerPlayerFils(0, "en")).toBe("Free");
    expect(formatPricePerPlayerFils(50000, "en")).toBe("50.000 BD");
    expect(formatPricePerPlayerFils(12500, "en")).toBe("12.500 BD");
  });
});

describe("formatPricePerPlayerCardMeta", () => {
  it("omits unset, shows Free, or major units BD / player", () => {
    expect(formatPricePerPlayerCardMeta(null, "en")).toBeNull();
    expect(formatPricePerPlayerCardMeta(0, "en")).toBe("Free");
    expect(formatPricePerPlayerCardMeta(50000, "en")).toBe(
      "50.000 BD / player",
    );
    expect(formatPricePerPlayerCardMeta(12500, "en")).toBe(
      "12.500 BD / player",
    );
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

describe("Arabic prices", () => {
  it("writes the currency and Free in Arabic", () => {
    expect(formatPricePerPlayerFils(50000, "ar")).toBe("50.000 د.ب");
    expect(formatPricePerPlayerFils(0, "ar")).toBe("مجانًا");
    expect(formatPricePerPlayerCardMeta(12500, "ar")).toBe("12.500 د.ب / لاعب");
    expect(parseOptionalPricePerPlayerFils("-1", "ar")).toEqual({
      ok: false,
      message: "لا يمكن أن يكون السعر للاعب سالبًا",
    });
  });
});

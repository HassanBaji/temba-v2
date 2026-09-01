import { describe, expect, it } from "vitest";

import {
  centsToMajorInput,
  formatPricePerPlayerCardMeta,
  formatPricePerPlayerCents,
  parseOptionalPricePerPlayerCents,
  PRICE_PER_PLAYER_MAX_CENTS,
} from "./price-per-player";

describe("parseOptionalPricePerPlayerCents", () => {
  it("treats blank as unset", () => {
    expect(parseOptionalPricePerPlayerCents("")).toEqual({
      ok: true,
      cents: null,
    });
    expect(parseOptionalPricePerPlayerCents("   ")).toEqual({
      ok: true,
      cents: null,
    });
  });

  it("parses zero, whole units, one decimal, and two decimals", () => {
    expect(parseOptionalPricePerPlayerCents("0")).toEqual({
      ok: true,
      cents: 0,
    });
    expect(parseOptionalPricePerPlayerCents("50")).toEqual({
      ok: true,
      cents: 5000,
    });
    expect(parseOptionalPricePerPlayerCents("50.5")).toEqual({
      ok: true,
      cents: 5050,
    });
    expect(parseOptionalPricePerPlayerCents("12.50")).toEqual({
      ok: true,
      cents: 1250,
    });
  });

  it("refuses negatives, extra fraction digits, and non-numeric input", () => {
    expect(parseOptionalPricePerPlayerCents("-1").ok).toBe(false);
    expect(parseOptionalPricePerPlayerCents("50.123").ok).toBe(false);
    expect(parseOptionalPricePerPlayerCents("abc").ok).toBe(false);
  });

  it("refuses amounts above 1_000_000.00 major units", () => {
    expect(parseOptionalPricePerPlayerCents("1000000.01").ok).toBe(false);
    expect(parseOptionalPricePerPlayerCents("1000000")).toEqual({
      ok: true,
      cents: PRICE_PER_PLAYER_MAX_CENTS,
    });
  });
});

describe("formatPricePerPlayerCents", () => {
  it("omits unset, shows Free at zero, and two fraction digits otherwise", () => {
    expect(formatPricePerPlayerCents(null)).toBeNull();
    expect(formatPricePerPlayerCents(undefined)).toBeNull();
    expect(formatPricePerPlayerCents(0)).toBe("Free");
    expect(formatPricePerPlayerCents(5000)).toBe("50.00");
    expect(formatPricePerPlayerCents(1250)).toBe("12.50");
  });
});

describe("formatPricePerPlayerCardMeta", () => {
  it("omits unset, shows Free, or major units / player", () => {
    expect(formatPricePerPlayerCardMeta(null)).toBeNull();
    expect(formatPricePerPlayerCardMeta(0)).toBe("Free");
    expect(formatPricePerPlayerCardMeta(5000)).toBe("50.00 / player");
    expect(formatPricePerPlayerCardMeta(1250)).toBe("12.50 / player");
  });
});

describe("centsToMajorInput", () => {
  it("prefills the organizer Field from cents", () => {
    expect(centsToMajorInput(null)).toBe("");
    expect(centsToMajorInput(0)).toBe("0.00");
    expect(centsToMajorInput(1250)).toBe("12.50");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  centsToMajorInput,
  formatPricePerPlayerCardMeta,
  formatPricePerPlayerCents,
  parseOptionalPricePerPlayerCents,
  PRICE_PER_PLAYER_MAX_CENTS,
} from "./price-per-player.ts";

describe("parseOptionalPricePerPlayerCents", () => {
  it("treats blank as unset", () => {
    assert.deepEqual(parseOptionalPricePerPlayerCents(""), {
      ok: true,
      cents: null,
    });
    assert.deepEqual(parseOptionalPricePerPlayerCents("   "), {
      ok: true,
      cents: null,
    });
  });

  it("parses zero, whole units, one decimal, and two decimals", () => {
    assert.deepEqual(parseOptionalPricePerPlayerCents("0"), {
      ok: true,
      cents: 0,
    });
    assert.deepEqual(parseOptionalPricePerPlayerCents("50"), {
      ok: true,
      cents: 5000,
    });
    assert.deepEqual(parseOptionalPricePerPlayerCents("50.5"), {
      ok: true,
      cents: 5050,
    });
    assert.deepEqual(parseOptionalPricePerPlayerCents("12.50"), {
      ok: true,
      cents: 1250,
    });
  });

  it("refuses negatives, extra fraction digits, and non-numeric input", () => {
    assert.equal(parseOptionalPricePerPlayerCents("-1").ok, false);
    assert.equal(parseOptionalPricePerPlayerCents("50.123").ok, false);
    assert.equal(parseOptionalPricePerPlayerCents("abc").ok, false);
  });

  it("refuses amounts above 1_000_000.00 major units", () => {
    const tooLarge = parseOptionalPricePerPlayerCents("1000000.01");
    assert.equal(tooLarge.ok, false);
    const max = parseOptionalPricePerPlayerCents("1000000");
    assert.deepEqual(max, { ok: true, cents: PRICE_PER_PLAYER_MAX_CENTS });
  });
});

describe("formatPricePerPlayerCents", () => {
  it("omits unset, shows Free at zero, and two fraction digits otherwise", () => {
    assert.equal(formatPricePerPlayerCents(null), null);
    assert.equal(formatPricePerPlayerCents(undefined), null);
    assert.equal(formatPricePerPlayerCents(0), "Free");
    assert.equal(formatPricePerPlayerCents(5000), "50.00");
    assert.equal(formatPricePerPlayerCents(1250), "12.50");
  });
});

describe("formatPricePerPlayerCardMeta", () => {
  it("omits unset, shows Free, or major units / player", () => {
    assert.equal(formatPricePerPlayerCardMeta(null), null);
    assert.equal(formatPricePerPlayerCardMeta(0), "Free");
    assert.equal(formatPricePerPlayerCardMeta(5000), "50.00 / player");
    assert.equal(formatPricePerPlayerCardMeta(1250), "12.50 / player");
  });
});

describe("centsToMajorInput", () => {
  it("prefills the organizer Field from cents", () => {
    assert.equal(centsToMajorInput(null), "");
    assert.equal(centsToMajorInput(0), "0.00");
    assert.equal(centsToMajorInput(1250), "12.50");
  });
});

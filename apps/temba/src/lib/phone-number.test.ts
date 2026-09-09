import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  CALLING_COUNTRIES,
  assembleE164,
  formatNationalNumber,
  nationalDigits,
  parseE164,
} from "./phone-number";

const SAMPLES: Record<
  string,
  { national: string; e164: string; display: string }
> = {
  BH: { national: "36124408", e164: "+97336124408", display: "3612 4408" },
  KW: { national: "50001234", e164: "+96550001234", display: "5000 1234" },
  SA: { national: "501234567", e164: "+966501234567", display: "50 123 4567" },
  AE: { national: "501234567", e164: "+971501234567", display: "50 123 4567" },
  QA: { national: "33123456", e164: "+97433123456", display: "3312 3456" },
  OM: { national: "91234567", e164: "+96891234567", display: "9123 4567" },
  EG: {
    national: "1001234567",
    e164: "+201001234567",
    display: "100 123 4567",
  },
  IN: { national: "9876543210", e164: "+919876543210", display: "98765 43210" },
  GB: {
    national: "7400123456",
    e164: "+447400123456",
    display: "7400 123 456",
  },
  US: { national: "2025550123", e164: "+12025550123", display: "202 555 0123" },
};

describe("assembleE164", () => {
  it("assembles E.164 for every listed country", () => {
    for (const country of CALLING_COUNTRIES) {
      const sample = SAMPLES[country.iso];
      assert.ok(sample, `missing sample for ${country.iso}`);
      assert.deepEqual(assembleE164(country.iso, sample.national), {
        ok: true,
        e164: sample.e164,
      });
      assert.deepEqual(assembleE164(country.iso, sample.display), {
        ok: true,
        e164: sample.e164,
      });
    }
  });

  it("rejects an unknown country", () => {
    assert.deepEqual(assembleE164("ZZ", "36124408"), {
      ok: false,
      reason: "unknown_country",
    });
  });

  it("rejects malformed national numbers", () => {
    assert.deepEqual(assembleE164("BH", "3612"), {
      ok: false,
      reason: "malformed",
    });
    assert.deepEqual(assembleE164("BH", "361244080"), {
      ok: false,
      reason: "malformed",
    });
    assert.deepEqual(assembleE164("BH", "abcdefgh"), {
      ok: false,
      reason: "malformed",
    });
    assert.deepEqual(assembleE164("BH", ""), {
      ok: false,
      reason: "malformed",
    });
    assert.deepEqual(assembleE164("US", "202555"), {
      ok: false,
      reason: "malformed",
    });
  });
});

describe("formatNationalNumber", () => {
  it("matches the artboard grouping for Bahrain", () => {
    assert.equal(formatNationalNumber("BH", "36124408"), "3612 4408");
    assert.equal(formatNationalNumber("BH", "3612 4408"), "3612 4408");
    assert.equal(formatNationalNumber("BH", "3612"), "3612");
    assert.equal(formatNationalNumber("BH", "36124"), "3612 4");
  });

  it("formats national display for every listed country", () => {
    for (const country of CALLING_COUNTRIES) {
      const sample = SAMPLES[country.iso];
      assert.ok(sample);
      assert.equal(
        formatNationalNumber(country.iso, sample.national),
        sample.display,
      );
    }
  });
});

describe("nationalDigits", () => {
  it("strips spaces and punctuation", () => {
    assert.equal(nationalDigits("3612 4408"), "36124408");
    assert.equal(nationalDigits("(202) 555-0123"), "2025550123");
  });
});

describe("parseE164", () => {
  it("round-trips assembled numbers", () => {
    for (const country of CALLING_COUNTRIES) {
      const sample = SAMPLES[country.iso];
      assert.ok(sample);
      assert.deepEqual(parseE164(sample.e164), {
        iso: country.iso,
        national: sample.national,
      });
    }
  });

  it("rejects malformed E.164", () => {
    assert.equal(parseE164("97336124408"), null);
    assert.equal(parseE164("+9733612"), null);
  });
});

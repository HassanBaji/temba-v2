import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  CALLING_COUNTRIES,
  assembleE164,
  callingCountryName,
  countryFlagEmoji,
  formatE164,
  formatInternationalNumber,
  formatNationalNumber,
  nationalDigits,
  parseE164,
  phoneShapePlaceholder,
  whatsAppHref,
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
  US: { national: "2025550123", e164: "+12025550123", display: "202 555 0123" },
};

describe("CALLING_COUNTRIES", () => {
  it("lists the supported calling countries", () => {
    assert.deepEqual(
      CALLING_COUNTRIES.map((country) => country.iso),
      ["BH", "KW", "SA", "AE", "QA", "OM", "US"],
    );
  });

  it("has a national placeholder for every listed country", () => {
    for (const country of CALLING_COUNTRIES) {
      const sample = SAMPLES[country.iso];
      assert.ok(sample);
      assert.equal(country.placeholder, sample.display);
    }
  });
});

describe("countryFlagEmoji", () => {
  it("builds regional-indicator flags for listed countries", () => {
    assert.equal(countryFlagEmoji("BH"), "🇧🇭");
    assert.equal(countryFlagEmoji("KW"), "🇰🇼");
    assert.equal(countryFlagEmoji("SA"), "🇸🇦");
    assert.equal(countryFlagEmoji("AE"), "🇦🇪");
    assert.equal(countryFlagEmoji("QA"), "🇶🇦");
    assert.equal(countryFlagEmoji("OM"), "🇴🇲");
    assert.equal(countryFlagEmoji("US"), "🇺🇸");
  });

  it("rejects a non-ISO country code", () => {
    assert.equal(countryFlagEmoji("Bahrain"), "");
    assert.equal(countryFlagEmoji(""), "");
  });
});

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
    assert.deepEqual(assembleE164("SA", "50123"), {
      ok: false,
      reason: "malformed",
    });
  });

  it("rejects a country that is not listed", () => {
    assert.deepEqual(assembleE164("GB", "2079460958"), {
      ok: false,
      reason: "unknown_country",
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

describe("formatInternationalNumber", () => {
  it("prefixes the calling code for display", () => {
    assert.equal(formatInternationalNumber("BH", "36124408"), "+973 3612 4408");
    assert.equal(formatInternationalNumber("BH", ""), "");
  });
});

describe("formatE164", () => {
  it("groups a stored number by its country", () => {
    assert.equal(formatE164("+97336124408"), "+973 3612 4408");
    assert.equal(formatE164("+971501234567"), "+971 50 123 4567");
  });

  it("leaves a number from an unlisted country as stored", () => {
    assert.equal(formatE164("+447700900123"), "+447700900123");
  });
});

describe("whatsAppHref", () => {
  it("opens a chat with the number as digits only", () => {
    assert.equal(whatsAppHref("+97336124408"), "https://wa.me/97336124408");
    assert.equal(whatsAppHref("+447700900123"), "https://wa.me/447700900123");
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

describe("phoneShapePlaceholder", () => {
  it("keeps the leading digit and masks the rest", () => {
    assert.equal(phoneShapePlaceholder("BH"), "3XXX XXXX");
    assert.equal(phoneShapePlaceholder("SA"), "5X XXX XXXX");
    assert.equal(phoneShapePlaceholder("ZZ"), undefined);
  });
});

describe("callingCountryName", () => {
  it("names every listed country in each language", () => {
    for (const country of CALLING_COUNTRIES) {
      assert.equal(callingCountryName(country.iso, "en"), country.name);
      assert.match(callingCountryName(country.iso, "ar"), /[؀-ۿ]/);
    }
    assert.equal(callingCountryName("BH", "ar"), "البحرين");
    assert.equal(callingCountryName("ZZ", "en"), "ZZ");
  });
});

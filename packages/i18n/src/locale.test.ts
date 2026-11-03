import { describe, expect, it } from "vitest";

import { intlLocale, isLocale, localeDirection, pickLocale } from "./locale";

describe("isLocale", () => {
  it("accepts the two product locales only", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});

describe("localeDirection", () => {
  it("is rtl for Arabic only", () => {
    expect(localeDirection("ar")).toBe("rtl");
    expect(localeDirection("en")).toBe("ltr");
  });
});

describe("intlLocale", () => {
  it("keeps Latin digits in Arabic", () => {
    expect(new Intl.NumberFormat(intlLocale("ar")).format(1234)).toBe("1,234");
    expect(
      new Date(Date.UTC(2026, 9, 4, 15, 30)).toLocaleDateString(
        intlLocale("ar"),
        { weekday: "short", timeZone: "Asia/Bahrain" },
      ),
    ).toBe("الأحد");
  });
});

describe("pickLocale", () => {
  it("reads an Accept-Language header", () => {
    expect(pickLocale("ar-BH,ar;q=0.9,en;q=0.8")).toBe("ar");
    expect(pickLocale("en-GB,en;q=0.9")).toBe("en");
    expect(pickLocale("fr-FR")).toBe("en");
    expect(pickLocale(null)).toBe("en");
  });

  it("reads a device language list", () => {
    expect(pickLocale(["fr-FR", "ar-SA"])).toBe("ar");
    expect(pickLocale([])).toBe("en");
  });
});

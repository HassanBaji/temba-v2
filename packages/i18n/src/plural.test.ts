import { afterEach, describe, expect, it, vi } from "vitest";

import { intlLocale, LOCALES } from "./locale";
import { plural, pluralCategory } from "./plural";

describe("pluralCategory", () => {
  it.each(LOCALES)("matches Intl.PluralRules for 0..250 in %s", (locale) => {
    const rules = new Intl.PluralRules(intlLocale(locale));
    for (let n = 0; n <= 250; n += 1) {
      expect(pluralCategory(locale, n), `${locale} ${n}`).toBe(rules.select(n));
    }
  });
});

describe("plural without Intl.PluralRules", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back to pluralCategory", () => {
    vi.stubGlobal("Intl", { ...Intl, PluralRules: undefined });
    const forms = {
      zero: "zero",
      one: "one",
      two: "two",
      few: "few {n}",
      many: "many {n}",
      other: "other {n}",
    };
    expect(plural("ar", 0, forms)).toBe("zero");
    expect(plural("ar", 2, forms)).toBe("two");
    expect(plural("ar", 103, forms)).toBe("few 103");
    expect(plural("ar", 11, forms)).toBe("many 11");
    expect(plural("ar", 200, forms)).toBe("other 200");
    expect(plural("en", 1, forms)).toBe("one");
    expect(plural("en", 2, forms)).toBe("other 2");
  });
});

describe("plural", () => {
  it("picks one and other in English", () => {
    const forms = { one: "{n} player", other: "{n} players" };
    expect(plural("en", 1, forms)).toBe("1 player");
    expect(plural("en", 0, forms)).toBe("0 players");
    expect(plural("en", 12, forms)).toBe("12 players");
  });

  it("walks the six Arabic categories and falls back to other", () => {
    const forms = {
      zero: "لا لاعبين",
      one: "لاعب واحد",
      two: "لاعبان",
      few: "{n} لاعبين",
      many: "{n} لاعبًا",
      other: "{n} لاعب",
    };
    expect(plural("ar", 0, forms)).toBe("لا لاعبين");
    expect(plural("ar", 1, forms)).toBe("لاعب واحد");
    expect(plural("ar", 2, forms)).toBe("لاعبان");
    expect(plural("ar", 5, forms)).toBe("5 لاعبين");
    expect(plural("ar", 15, forms)).toBe("15 لاعبًا");
    expect(plural("ar", 100, forms)).toBe("100 لاعب");
    expect(plural("ar", 2, { one: "واحد", other: "{n}" })).toBe("2");
  });
});

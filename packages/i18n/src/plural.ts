import { intlLocale, type Locale } from "./locale";

/**
 * One form per CLDR plural category. English uses `one` and `other`; Arabic
 * uses all six (0, 1, 2, 3–10, 11–99, 100+). Missing forms fall back to
 * `other`. `{n}` in a form is replaced with the count.
 */
export type PluralForms = {
  zero?: string;
  one: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
};

export type PluralCategory = keyof PluralForms;

/**
 * The CLDR cardinal rules for the two Locales, for runtimes without
 * `Intl.PluralRules` (Hermes on iOS). `plural.test.ts` pins it to the Intl
 * answer.
 */
export function pluralCategory(locale: Locale, count: number): PluralCategory {
  const n = Math.abs(count);
  if (!Number.isInteger(n)) {
    return "other";
  }
  if (locale === "en") {
    return n === 1 ? "one" : "other";
  }
  if (n === 0) {
    return "zero";
  }
  if (n === 1) {
    return "one";
  }
  if (n === 2) {
    return "two";
  }
  const lastTwo = n % 100;
  if (lastTwo >= 3 && lastTwo <= 10) {
    return "few";
  }
  if (lastTwo >= 11) {
    return "many";
  }
  return "other";
}

const rules = new Map<Locale, Intl.PluralRules>();

function rulesFor(locale: Locale) {
  let found = rules.get(locale);
  if (!found) {
    found = new Intl.PluralRules(intlLocale(locale));
    rules.set(locale, found);
  }
  return found;
}

function categoryFor(locale: Locale, count: number): PluralCategory {
  if (typeof Intl.PluralRules === "function") {
    return rulesFor(locale).select(count);
  }
  return pluralCategory(locale, count);
}

export function plural(locale: Locale, count: number, forms: PluralForms) {
  const form = forms[categoryFor(locale, count)] ?? forms.other;
  return form.replaceAll("{n}", String(count));
}
